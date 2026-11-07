"use server";

import { unstable_rethrow } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  PAGE_SIZE,
  isSourceModule,
  type NotificationFilters,
  type NotificationPage,
} from "@/lib/notificaciones";

// Server actions de la bandeja de notificaciones (H31). El backend filtra
// por el usuario del token: cada uno solo ve y marca las suyas.

export type NotificationError = "server" | "forbidden" | "not-found";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: NotificationError };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Llama al backend y traduce la respuesta. Un 401 ya redirige dentro de
// apiFetch (sesión expirada); unstable_rethrow deja pasar esa redirección.
async function call<T>(path: string, init?: RequestInit): Promise<ActionResult<T>> {
  try {
    const res = await apiFetch(path, init);
    if (res.ok) return { ok: true, data: (await res.json()) as T };
    if (res.status === 403) return { ok: false, error: "forbidden" };
    if (res.status === 404) return { ok: false, error: "not-found" };
    console.error(`${init?.method ?? "GET"} ${path} respondió ${res.status}`);
  } catch (error) {
    unstable_rethrow(error);
    console.error(`Error al llamar ${path}:`, error);
  }
  return { ok: false, error: "server" };
}

/** GET /notificaciones con filtros y página. */
export async function listarNotificaciones(
  filters: NotificationFilters,
): Promise<ActionResult<NotificationPage>> {
  const params = new URLSearchParams();
  if (isSourceModule(filters.sourceModule)) params.set("sourceModule", filters.sourceModule);
  if (filters.unread === true) params.set("unread", "true");
  const page = Number.isInteger(filters.page) && filters.page >= 1 ? filters.page : 1;
  params.set("page", String(page));
  params.set("pageSize", String(PAGE_SIZE));

  return call<NotificationPage>(`notificaciones?${params}`);
}

/** Cantidad de No leídas, o null si no se pudo consultar. */
export async function contarNoLeidas(): Promise<number | null> {
  const result = await call<{ count: number }>("notificaciones/no-leidas/conteo");
  return result.ok ? result.data.count : null;
}

/** PATCH /notificaciones/:id/leida. Marcar de nuevo no cambia la fecha. */
export async function marcarLeida(id: string): Promise<ActionResult<{ id: string; readAt: string }>> {
  if (typeof id !== "string" || !UUID_REGEX.test(id)) {
    return { ok: false, error: "not-found" };
  }
  return call(`notificaciones/${id}/leida`, { method: "PATCH" });
}

/** PATCH /notificaciones/leidas. Devuelve cuántas pasaron a Leída. */
export async function marcarTodasLeidas(): Promise<ActionResult<{ updated: number }>> {
  return call("notificaciones/leidas", { method: "PATCH" });
}
