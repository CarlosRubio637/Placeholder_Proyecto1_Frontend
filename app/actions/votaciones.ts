"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";
import { ASAMBLEAS_PATH, UUID_REGEX } from "@/lib/votaciones";

export type EmitirVotoInput = { topicId: string; optionId: string };

export type EmitirVotoState =
  | { status: "ok"; votedAt: string }
  | { status: "conflict"; message: string }
  | { status: "forbidden"; message: string }
  | { status: "not-found"; message: string }
  | { status: "error"; message: string };

function firstMessage(body: unknown) {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return undefined;
}

// POST /asambleas/temas/:temaId/votos (H23). El backend decide si se admite:
// este action solo traduce la respuesta para el formulario.
export async function emitirVoto(
  _prev: EmitirVotoState | null,
  input: EmitirVotoInput,
): Promise<EmitirVotoState> {
  const topicId = typeof input?.topicId === "string" ? input.topicId : "";
  const optionId = typeof input?.optionId === "string" ? input.optionId : "";
  if (!UUID_REGEX.test(topicId) || !UUID_REGEX.test(optionId)) {
    return { status: "error", message: "No se pudo enviar el voto. Intenta de nuevo." };
  }

  let res: Response;
  try {
    res = await apiFetch(`asambleas/temas/${topicId}/votos`, {
      method: "POST",
      body: JSON.stringify({ optionId }),
    });
  } catch (error) {
    console.error("Error al emitir voto:", error);
    return { status: "error", message: "No se pudo enviar el voto. Intenta más tarde." };
  }

  if (res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { votedAt?: string }
      | null;
    // La vista vuelve a consultar el detalle para mostrar "Ya votaste".
    revalidatePath(ASAMBLEAS_PATH);
    revalidatePath(`${ASAMBLEAS_PATH}/${topicId}`);
    return { status: "ok", votedAt: body?.votedAt ?? new Date().toISOString() };
  }

  const payload = await res.json().catch(() => null);
  const message = firstMessage(payload);

  if (res.status === 409) {
    // Si ya votó, también conviene refrescar la lista para que la pestaña muestre el número actualizado.
    revalidatePath(ASAMBLEAS_PATH);
    revalidatePath(`${ASAMBLEAS_PATH}/${topicId}`);
    return { status: "conflict", message: message ?? "La operación no se pudo completar." };
  }
  if (res.status === 403) {
    return { status: "forbidden", message: message ?? "No tienes permiso para esta acción." };
  }
  if (res.status === 404) {
    return { status: "not-found", message: message ?? "El tema no existe." };
  }
  if (res.status === 400) {
    return { status: "error", message: message ?? "La opción no es válida." };
  }

  console.error(`POST asambleas/temas/${topicId}/votos respondió ${res.status}`);
  return { status: "error", message: "No se pudo enviar el voto. Intenta más tarde." };
}
