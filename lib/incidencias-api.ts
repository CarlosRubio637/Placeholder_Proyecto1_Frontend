import { apiFetch } from "@/lib/api";
import type { IncidentDetail, IncidentList, IncidentStatus } from "@/lib/incidencias";

// Consultas de H11 al backend (solo servidor: usan la cookie de sesión).

export const PAGE_SIZE = 10;

/** GET /incidencias/mias: incidencias de la unidad del residente. */
export async function fetchMyIncidents(params: {
  status?: IncidentStatus;
  page: number;
}): Promise<IncidentList> {
  const query = new URLSearchParams({ page: String(params.page), pageSize: String(PAGE_SIZE) });
  if (params.status) query.set("status", params.status);

  const res = await apiFetch(`incidencias/mias?${query}`);
  if (!res.ok) {
    throw new Error(`GET incidencias/mias respondió ${res.status}`);
  }
  return res.json();
}

/**
 * GET /incidencias/:id. Devuelve null si no existe o es de otra unidad (el
 * backend responde 404 en los dos casos).
 */
export async function fetchIncident(id: string): Promise<IncidentDetail | null> {
  const res = await apiFetch(`incidencias/${encodeURIComponent(id)}`);
  // 400: el id no es un uuid; para el usuario es lo mismo que no existir.
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) {
    throw new Error(`GET incidencias/${id} respondió ${res.status}`);
  }
  return res.json();
}
