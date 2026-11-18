import { apiFetch } from "@/lib/api";
import type { Solicitud, UnidadDestino } from "@/lib/entradas";

// Consultas de la portería (H16). Solo para Server Components y Server
// Functions: usa apiFetch, que lee la cookie de sesión.

export async function buscarVisitas(q: string): Promise<Response> {
  return apiFetch(`seguridad/visitas/buscar?q=${encodeURIComponent(q)}`);
}

export async function getSolicitudes(): Promise<Solicitud[]> {
  const res = await apiFetch("seguridad/visitas/solicitudes");
  if (!res.ok) throw new Error(`GET seguridad/visitas/solicitudes respondió ${res.status}`);
  const body = (await res.json()) as { data: Solicitud[] };
  return body.data;
}

export async function getUnidadesDestino(towerId: string): Promise<UnidadDestino[]> {
  const res = await apiFetch(`unidades?towerId=${encodeURIComponent(towerId)}`);
  if (!res.ok) throw new Error(`GET unidades respondió ${res.status}`);
  return res.json();
}
