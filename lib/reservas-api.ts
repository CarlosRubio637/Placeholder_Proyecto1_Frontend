import { apiFetch } from "@/lib/api";
import type { AvailabilitySlot, PublicArea } from "@/lib/reservas";

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

export type AvailabilityResult = {
  slots: AvailabilitySlot[];
  /** 400: fecha inválida o fuera de rango, con el mensaje del backend. */
  error?: string;
  /** 404: el área no existe o está deshabilitada. */
  notFound?: boolean;
};

/** GET /areas/:areaId/disponibilidad (H6). */
export async function fetchAvailability(areaId: string, date: string): Promise<AvailabilityResult> {
  const res = await apiFetch(`areas/${areaId}/disponibilidad?date=${encodeURIComponent(date)}`);
  if (res.ok) {
    const body = (await res.json()) as { slots: AvailabilitySlot[] };
    return { slots: body.slots };
  }
  if (res.status === 404) return { slots: [], notFound: true };
  if (res.status === 400) {
    const body = (await res.json().catch(() => null)) as { message?: unknown } | null;
    const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
    return { slots: [], error: typeof message === "string" ? message : "La fecha no es válida." };
  }
  throw new Error(`GET disponibilidad respondió ${res.status}`);
}
