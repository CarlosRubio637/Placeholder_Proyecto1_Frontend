import { apiFetch } from "@/lib/api";
import { PAGE_SIZE, type MisVisitasLista, type Tab } from "@/lib/mis-visitas";

// Consultas de "Mis visitas" (H15). Solo para Server Components y Server
// Functions: usa apiFetch, que lee la cookie de sesión.

/** GET /visitas/mias: visitas de la unidad del residente. */
export async function fetchMisVisitas(tab: Tab, page: number): Promise<MisVisitasLista> {
  const query = new URLSearchParams({ tab, page: String(page), pageSize: String(PAGE_SIZE) });
  const res = await apiFetch(`visitas/mias?${query}`);
  if (!res.ok) throw new Error(`GET visitas/mias respondió ${res.status}`);
  return res.json();
}
