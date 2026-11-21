import { apiFetch } from "@/lib/api";

// Tipos y consultas de las asambleas (H22). Solo para Server Components y
// Server Functions: usa apiFetch, que lee la cookie de sesión.

export const ASAMBLEAS_PATH = "/admin/asambleas";
export const PAGE_SIZE = 10;

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AsambleaStatus = "PROGRAMADA" | "ABIERTA" | "CERRADA";

export const STATUS_LABELS: Record<AsambleaStatus, string> = {
  PROGRAMADA: "Programada",
  ABIERTA: "Abierta",
  CERRADA: "Cerrada",
};

// Fila de GET /admin/asambleas
export type AsambleaResumen = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: AsambleaStatus;
  topicCount: number;
  votedUnits: number;
};

export type AsambleaLista = {
  data: AsambleaResumen[];
  total: number;
  page: number;
  pageSize: number;
};

// Respuesta de GET /admin/asambleas/:id
export type AsambleaDetalle = {
  id: string;
  status: AsambleaStatus;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
  topics: { id: string; question: string; options: { id: string; text: string }[] }[];
  // null mientras la asamblea está Programada (todavía no se congela la lista).
  eligibleUnits: number | null;
};

export async function getAsambleas(page: number): Promise<AsambleaLista> {
  const res = await apiFetch(`admin/asambleas?page=${page}&pageSize=${PAGE_SIZE}`);
  if (!res.ok) {
    throw new Error(`GET admin/asambleas respondió ${res.status}`);
  }
  return res.json();
}

/** Devuelve null si la asamblea no existe (o el id no es un uuid). */
export async function getAsamblea(id: string): Promise<AsambleaDetalle | null> {
  if (!UUID_REGEX.test(id)) return null;
  const res = await apiFetch(`admin/asambleas/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GET admin/asambleas/${id} respondió ${res.status}`);
  }
  return res.json();
}
