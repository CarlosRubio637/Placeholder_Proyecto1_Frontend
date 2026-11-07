import { apiFetch } from "@/lib/api";
import type { PublicArea } from "@/lib/reservas";

// Consultas de H6 y H7 al backend (solo servidor: usan la cookie de sesión).

/** GET /areas: áreas habilitadas, por nombre. */
export async function fetchAreas(): Promise<PublicArea[]> {
  const res = await apiFetch("areas");
  if (!res.ok) {
    throw new Error(`GET areas respondió ${res.status}`);
  }
  const body = (await res.json()) as { data: PublicArea[] };
  return body.data;
}

/** Un área habilitada, o null si no existe o está deshabilitada. */
export async function fetchArea(id: string): Promise<PublicArea | null> {
  return (await fetchAreas()).find((area) => area.id === id) ?? null;
}
