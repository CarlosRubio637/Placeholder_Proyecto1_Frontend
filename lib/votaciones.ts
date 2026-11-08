import { apiFetch } from "@/lib/api";

// Tipos y consultas de votación (H23). Solo para Server Components y Server
// Actions: usa apiFetch, que lee la cookie de sesión.

export const ASAMBLEAS_PATH = "/asambleas";

export type AsambleaStatus = "PROGRAMADA" | "ABIERTA" | "CERRADA";

export type AsambleaActiva = {
  id: string;
  title: string;
  /** Fecha ISO. */
  endsAt: string;
  topicCount: number;
  votedTopics: number;
};

export type Opcion = { id: string; text: string };

export type MyUnitVote = {
  /** Fecha ISO. */
  votedAt: string;
  /** true si la unidad votó desde mi propia sesión (el residente actual). */
  byMe: boolean;
};

export type Tema = {
  id: string;
  question: string;
  options: Opcion[];
  myUnitVote: MyUnitVote | null;
};

export type AsambleaDetalle = {
  id: string;
  title: string;
  description: string | null;
  status: AsambleaStatus;
  endsAt: string;
  topics: Tema[];
};

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getActivas(): Promise<{ data: AsambleaActiva[] }> {
  const res = await apiFetch("asambleas/activas");
  if (!res.ok) throw new Error(`GET asambleas/activas respondió ${res.status}`);
  return res.json();
}

/** Devuelve null si la asamblea no existe o la unidad no está habilitada. */
export async function getAsamblea(id: string): Promise<AsambleaDetalle | null> {
  if (!UUID_REGEX.test(id)) return null;
  const res = await apiFetch(`asambleas/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET asambleas/${id} respondió ${res.status}`);
  return res.json();
}

// ----------------- Formato de fechas en hora de El Salvador -----------------

const DATE_TIME = new Intl.DateTimeFormat("es-SV", {
  timeZone: "America/El_Salvador",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const DATE_TIME_LONG = new Intl.DateTimeFormat("es-SV", {
  timeZone: "America/El_Salvador",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export function formatFecha(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? "—" : DATE_TIME.format(ms).replace(", ", " ");
}

export function formatFechaLarga(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? "—" : DATE_TIME_LONG.format(ms);
}
