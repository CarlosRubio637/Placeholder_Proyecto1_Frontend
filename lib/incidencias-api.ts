import { apiFetch } from "@/lib/api";
import type {
  AdminFilters,
  AdminIncidentList,
  IncidentDetail,
  IncidentList,
  IncidentStatus,
  MaintenanceStaff,
} from "@/lib/incidencias";

// Consultas de H11 y H12 al backend (solo servidor: usan la cookie de sesión).

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

// ----------------- H12: bandeja del administrador -----------------

export const ADMIN_PAGE_SIZE = 20;

/** GET /admin/incidencias con los filtros de la URL. */
export async function fetchAdminIncidents(
  filters: AdminFilters,
  page: number,
): Promise<AdminIncidentList> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(ADMIN_PAGE_SIZE) });
  if (filters.status) query.set("status", filters.status);
  if (filters.priority) query.set("priority", filters.priority);
  if (filters.location) query.set("location", filters.location);
  if (filters.assignee) query.set("assigneeId", filters.assignee);
  if (filters.search) query.set("search", filters.search);

  const res = await apiFetch(`admin/incidencias?${query}`);
  if (!res.ok) {
    throw new Error(`GET admin/incidencias respondió ${res.status}`);
  }
  return res.json();
}

/** GET /admin/responsables: responsables de mantenimiento activos. */
export async function fetchStaff(): Promise<MaintenanceStaff[]> {
  const res = await apiFetch("admin/responsables");
  if (!res.ok) {
    throw new Error(`GET admin/responsables respondió ${res.status}`);
  }
  const body = (await res.json()) as { data: MaintenanceStaff[] };
  return body.data;
}
