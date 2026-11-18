import { apiFetch } from "@/lib/api";

// Resultado auditable de la asamblea (H24). Solo para Server Components:
// usa apiFetch, que lee la cookie de sesión.

export const PARTICIPACION_PAGE_SIZE = 50;
export const CERRADAS_PAGE_SIZE = 10;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ResultadoStatus = "PROGRAMADA" | "ABIERTA" | "CERRADA";

export type OpcionResultado = {
  id: string;
  text: string;
  /** null mientras la asamblea no está Cerrada. */
  votes: number | null;
  pct: number | null;
};

export type TemaResultado = {
  id: string;
  question: string;
  eligibleUnits: number;
  votedUnits: number;
  participationPct: number;
  totalVotes: number | null;
  options: OpcionResultado[];
  winnerOptionId: string | null;
  isTie: boolean;
};

export type Resultado = {
  id: string;
  title: string;
  status: ResultadoStatus;
  closedAt: string | null;
  topics: TemaResultado[];
};

export type Participacion = {
  data: { unitCode: string; votedAt: string }[];
  total: number;
  page: number;
  pageSize: number;
};

export type AsambleaCerrada = {
  id: string;
  title: string;
  closedAt: string;
  topicCount: number;
};

/** null si el id no es uuid o la asamblea no existe. */
export async function getResultado(id: string): Promise<Resultado | null> {
  if (!UUID_REGEX.test(id)) return null;
  const res = await apiFetch(`asambleas/${id}/resultado`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET asambleas/${id}/resultado respondió ${res.status}`);
  return res.json();
}

export async function getParticipacion(topicId: string, page: number): Promise<Participacion> {
  const res = await apiFetch(
    `asambleas/temas/${topicId}/participacion?page=${page}&pageSize=${PARTICIPACION_PAGE_SIZE}`,
  );
  if (!res.ok) throw new Error(`GET participacion respondió ${res.status}`);
  return res.json();
}

export async function getCerradas(page: number): Promise<{
  data: AsambleaCerrada[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const res = await apiFetch(`asambleas/cerradas?page=${page}&pageSize=${CERRADAS_PAGE_SIZE}`);
  if (!res.ok) throw new Error(`GET asambleas/cerradas respondió ${res.status}`);
  return res.json();
}

const DATE_TIME = new Intl.DateTimeFormat("es-SV", {
  timeZone: "America/El_Salvador",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** DD/MM/AAAA HH:mm en hora de El Salvador. */
export function formatFechaHora(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? "—" : DATE_TIME.format(ms).replace(", ", " ");
}

/** 63.6 → "63.6 %"; usa coma de miles y punto decimal como el resto de la app. */
export function formatPct(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)} %`;
}
