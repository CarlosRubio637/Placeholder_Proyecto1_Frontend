"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { DENTRO_PATH } from "@/lib/dentro";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Filtros de la lista que se conservan al volver (sin el aviso anterior). */
const KEEP = ["towerId", "search", "page"] as const;

const SALIDA_MESSAGES = {
  notInside: "Este visitante no tiene una entrada activa.",
  notFound: "La visita no existe.",
  forbidden: "No tienes permiso para esta acción.",
  generic: "No se pudo registrar la salida. Intenta más tarde.",
} as const;

export type SalidaInput = { id: string; query: string };
export type SalidaState = { formError?: string };

const hora = new Intl.DateTimeFormat("es-SV", {
  timeZone: "America/El_Salvador",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Vuelve a "Quién está dentro" con los mismos filtros y el aviso indicado. */
function backToList(query: string, key: "aviso" | "alerta", message: string): never {
  const current = new URLSearchParams(query);
  const next = new URLSearchParams();
  for (const name of KEEP) {
    const value = current.get(name);
    if (value) next.set(name, value);
  }
  next.set(key, message);
  revalidatePath(DENTRO_PATH);
  redirect(`${DENTRO_PATH}?${next.toString()}`);
}

function firstMessage(body: unknown) {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return undefined;
}

// POST /seguridad/visitas/:id/salida (H17). Con éxito o con 409/404 vuelve a
// la lista (la fila cambia en los tres casos) conservando torre, búsqueda y
// página, y muestra el aviso en la página.
export async function registrarSalida(
  _prev: SalidaState,
  raw: SalidaInput,
): Promise<SalidaState> {
  const id = typeof raw?.id === "string" ? raw.id : "";
  const query = typeof raw?.query === "string" ? raw.query : "";
  if (!UUID_REGEX.test(id)) return { formError: SALIDA_MESSAGES.notFound };

  let res: Response;
  try {
    res = await apiFetch(`seguridad/visitas/${id}/salida`, { method: "POST" });
  } catch (error) {
    // Con un 401 (sesión vencida) `apiFetch` redirige al login lanzando una
    // excepción interna de Next: hay que dejarla pasar.
    unstable_rethrow(error);
    console.error("Error al registrar la salida:", error);
    return { formError: SALIDA_MESSAGES.generic };
  }

  if (res.ok) {
    const body = (await res.json().catch(() => null)) as { exitAt?: string } | null;
    const exitAt = body?.exitAt ? Date.parse(body.exitAt) : Number.NaN;
    const when = hora.format(Number.isNaN(exitAt) ? Date.now() : exitAt);
    backToList(query, "aviso", `Salida registrada a las ${when}`);
  }

  if (res.status === 409) {
    // Otro agente ya registró la salida (o la visita no está Dentro).
    backToList(query, "alerta", SALIDA_MESSAGES.notInside);
  }
  if (res.status === 404) {
    const payload = await res.json().catch(() => null);
    backToList(query, "alerta", firstMessage(payload) ?? SALIDA_MESSAGES.notFound);
  }
  if (res.status === 403) return { formError: SALIDA_MESSAGES.forbidden };

  console.error(`POST seguridad/visitas/${id}/salida respondió ${res.status}`);
  return { formError: SALIDA_MESSAGES.generic };
}
