"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { AVISO_SALIDA, DENTRO_PATH, type AlertaKey } from "@/lib/dentro-client";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Filtros de la lista que se conservan al volver (sin el aviso anterior). */
const KEEP = ["towerId", "search", "page"] as const;

const SALIDA_MESSAGES = {
  notFound: "La visita no existe.",
  forbidden: "No tienes permiso para esta acción.",
  generic: "No se pudo registrar la salida. Intenta más tarde.",
} as const;

export type SalidaInput = { id: string; query: string };
export type SalidaState = { formError?: string };

const horaFormat = new Intl.DateTimeFormat("es-SV", {
  timeZone: "America/El_Salvador",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Vuelve a "Quién está dentro" con los mismos filtros y un aviso. La URL solo
 * lleva una clave (y la hora, que la página valida); el texto lo pone la
 * página, así nadie puede armar un enlace con un mensaje que parezca del
 * sistema.
 */
function backToList(query: string, aviso: Record<string, string>): never {
  const current = new URLSearchParams(query);
  const next = new URLSearchParams();
  for (const name of KEEP) {
    const value = current.get(name);
    if (value) next.set(name, value);
  }
  for (const [key, value] of Object.entries(aviso)) next.set(key, value);
  revalidatePath(DENTRO_PATH);
  redirect(`${DENTRO_PATH}?${next.toString()}`);
}

const alerta = (key: AlertaKey) => ({ alerta: key });

// POST /seguridad/visitas/:id/salida (H17). Con éxito o con 409/404 vuelve a
// la lista (la fila cambia en los tres casos) conservando torre, búsqueda y
// página; la página muestra el aviso que corresponde a la clave.
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
    const hora = horaFormat.format(Number.isNaN(exitAt) ? Date.now() : exitAt);
    backToList(query, { aviso: AVISO_SALIDA, hora });
  }

  // 409: otro agente ya registró la salida (o la visita no está Dentro).
  if (res.status === 409) backToList(query, alerta("sin-entrada"));
  if (res.status === 404) backToList(query, alerta("no-existe"));
  if (res.status === 403) return { formError: SALIDA_MESSAGES.forbidden };

  console.error(`POST seguridad/visitas/${id}/salida respondió ${res.status}`);
  return { formError: SALIDA_MESSAGES.generic };
}
