import { apiFetch } from "@/lib/api";
import type { Area } from "@/lib/areas";

// Consultas de H9 al backend (solo servidor: usan la cookie de sesión).

/** GET /admin/areas: lista de administración. */
export async function fetchAdminAreas(): Promise<Area[]> {
  const res = await apiFetch("admin/areas");
  if (!res.ok) {
    throw new Error(`GET admin/areas respondió ${res.status}`);
  }
  const body = (await res.json()) as { data: Area[] };
  return body.data;
}
