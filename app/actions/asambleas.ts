"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { ASAMBLEAS_PATH, UUID_REGEX } from "@/lib/asambleas";
import { localToMs } from "@/lib/fechas";
import {
  FIELD_PATH_REGEX,
  LIMITS,
  MESSAGES,
  cleanAsamblea,
  validateAsamblea,
  type AsambleaErrors,
  type AsambleaValues,
} from "@/lib/validation/asamblea";

export type GuardarAsambleaInput = AsambleaValues & {
  /** Con id se edita (PUT); sin id se crea (POST). */
  id?: string;
};

export type GuardarAsambleaState = {
  errors?: AsambleaErrors;
  formError?: string;
  /** 409: la asamblea ya no está Programada. */
  conflict?: boolean;
};

export type EliminarAsambleaState = {
  error?: string;
  /** 404 o 409: lo que se ve en pantalla quedó desactualizado. */
  stale?: boolean;
};

function firstMessage(body: unknown) {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return undefined;
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

// Los argumentos de un Server Function llegan del navegador: se normalizan
// antes de usarlos (y se acota el tamaño de las listas).
function readInput(raw: unknown): GuardarAsambleaInput {
  const input = (raw ?? {}) as Record<string, unknown>;
  const topics = Array.isArray(input.topics) ? input.topics : [];
  return {
    id: typeof input.id === "string" ? input.id : undefined,
    title: text(input.title),
    description: text(input.description),
    startsAt: text(input.startsAt),
    endsAt: text(input.endsAt),
    topics: topics.slice(0, LIMITS.topicsMax + 1).map((topic) => {
      const t = (topic ?? {}) as Record<string, unknown>;
      const options = Array.isArray(t.options) ? t.options : [];
      return {
        question: text(t.question),
        options: options.slice(0, LIMITS.optionsMax + 1).map(text),
      };
    }),
  };
}

// Crea (POST) o actualiza (PUT) la asamblea. Vuelve a validar en el servidor
// por si el navegador se saltó la validación del formulario.
export async function guardarAsamblea(
  _prevState: GuardarAsambleaState,
  raw: GuardarAsambleaInput,
): Promise<GuardarAsambleaState> {
  const { id, ...rest } = readInput(raw);
  if (id !== undefined && !UUID_REGEX.test(id)) {
    return { formError: "No se encontró la asamblea." };
  }

  const values = cleanAsamblea(rest);
  const errors = validateAsamblea(values, Date.now());
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  // Ya validadas arriba, así que ninguna es null.
  const startsAt = new Date(localToMs(values.startsAt)!).toISOString();
  const endsAt = new Date(localToMs(values.endsAt)!).toISOString();

  // Solo los campos que espera el backend (forbidNonWhitelisted).
  const body = {
    title: values.title,
    ...(values.description ? { description: values.description } : {}),
    startsAt,
    endsAt,
    topics: values.topics,
  };

  let res: Response;
  try {
    res = await apiFetch(id ? `admin/asambleas/${id}` : "admin/asambleas", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("Error al guardar la asamblea:", error);
    return { formError: "No se pudo guardar la asamblea. Intenta más tarde." };
  }

  if (res.ok) {
    revalidatePath(ASAMBLEAS_PATH);
    redirect(`${ASAMBLEAS_PATH}?aviso=programada`);
  }

  const payload = await res.json().catch(() => null);
  const message = firstMessage(payload);

  // 400: el backend indica en `field` el campo que falló.
  if (res.status === 400) {
    const field = (payload as { field?: unknown } | null)?.field;
    if (typeof field === "string" && FIELD_PATH_REGEX.test(field) && message) {
      return { errors: { [field]: message } };
    }
    return { formError: message ?? "Revisa los datos del formulario." };
  }
  if (res.status === 403) {
    return { formError: "No tienes permiso para esta acción." };
  }
  if (res.status === 404) {
    return { formError: "La asamblea ya no existe.", conflict: true };
  }
  if (res.status === 409) {
    return { formError: message ?? MESSAGES.started, conflict: true };
  }

  console.error(`${id ? "PUT" : "POST"} admin/asambleas respondió ${res.status}`);
  return { formError: "No se pudo guardar la asamblea. Intenta más tarde." };
}

// Elimina una asamblea Programada (DELETE). El backend responde 409 si ya inició.
export async function eliminarAsamblea(
  _prevState: EliminarAsambleaState,
  id: string,
): Promise<EliminarAsambleaState> {
  if (typeof id !== "string" || !UUID_REGEX.test(id)) {
    return { error: "No se encontró la asamblea.", stale: true };
  }

  let res: Response;
  try {
    res = await apiFetch(`admin/asambleas/${id}`, { method: "DELETE" });
  } catch (error) {
    console.error("Error al eliminar la asamblea:", error);
    return { error: "No se pudo eliminar la asamblea. Intenta más tarde." };
  }

  if (res.status === 204 || res.ok) {
    revalidatePath(ASAMBLEAS_PATH);
    redirect(`${ASAMBLEAS_PATH}?aviso=eliminada`);
  }

  if (res.status === 403) {
    return { error: "No tienes permiso para esta acción." };
  }
  if (res.status === 404) {
    return { error: "La asamblea ya no existe.", stale: true };
  }
  if (res.status === 409) {
    const payload = await res.json().catch(() => null);
    return { error: firstMessage(payload) ?? MESSAGES.started, stale: true };
  }

  console.error(`DELETE admin/asambleas respondió ${res.status}`);
  return { error: "No se pudo eliminar la asamblea. Intenta más tarde." };
}
