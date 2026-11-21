"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  MESSAGES as MIS_VISITAS_MESSAGES,
  MIS_VISITAS_PATH,
  REJECT_REASON_MAX,
} from "@/lib/mis-visitas";
import {
  readVisitaValues,
  validateVisita,
  type VisitaErrors,
  type VisitaField,
} from "@/lib/validation/visita";

/** Respuesta 201 de POST /visitas. */
export type VisitaAutorizada = {
  id: string;
  code: string;
  status: "AUTORIZADA";
  visitorName: string;
  visitDate: string;
  expectedTime: string;
  validFrom: string;
  validUntil: string;
};

export type AutorizarVisitaState = {
  errors?: VisitaErrors;
  /** 409: el visitante ya tiene una autorización para esa fecha. */
  conflict?: string;
  formError?: string;
  visit?: VisitaAutorizada;
};

const FIELDS: VisitaField[] = [
  "visitorName",
  "documentType",
  "documentNumber",
  "visitDate",
  "expectedTime",
  "reason",
];

function isField(value: unknown): value is VisitaField {
  return typeof value === "string" && (FIELDS as string[]).includes(value);
}

function firstMessage(body: unknown) {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return undefined;
}

const GENERIC_ERROR = "No se pudo autorizar la visita. Intenta más tarde.";

// Envía el formulario a POST /visitas (H14). Vuelve a validar en el servidor
// por si el navegador se saltó la validación del formulario.
export async function autorizarVisita(
  _prevState: AutorizarVisitaState,
  formData: FormData,
): Promise<AutorizarVisitaState> {
  const values = readVisitaValues(formData);
  const errors = validateVisita(values);
  if (Object.keys(errors).length > 0) return { errors };

  let res: Response;
  try {
    res = await apiFetch("visitas", { method: "POST", body: JSON.stringify(values) });
  } catch (error) {
    console.error("Error al autorizar la visita:", error);
    return { formError: GENERIC_ERROR };
  }

  if (res.status === 201) {
    return { visit: (await res.json()) as VisitaAutorizada };
  }

  const payload = await res.json().catch(() => null);
  const message = firstMessage(payload);

  // 400: el backend indica en `field` el campo que falló.
  if (res.status === 400) {
    const field = (payload as { field?: unknown } | null)?.field;
    if (isField(field) && message) return { errors: { [field]: message } };
    return { formError: message ?? "Revisa los datos del formulario." };
  }
  if (res.status === 409) {
    return { conflict: message ?? "Este visitante ya tiene una autorización para esa fecha." };
  }
  if (res.status === 403) {
    return { formError: "No tienes permiso para esta acción." };
  }

  console.error(`POST visitas respondió ${res.status}`);
  return { formError: GENERIC_ERROR };
}

// ----------------- H15: Mis visitas -----------------

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type VisitaAccionState = { ok?: string; error?: string };

function accionError(status: number, message: string | undefined): VisitaAccionState {
  if (status === 403) return { error: "No tienes permiso para esta acción." };
  if (status === 404) return { error: "La visita ya no existe." };
  if (status === 409) return { error: message ?? "La visita cambió. Actualiza la lista." };
  if (status === 400) return { error: message ?? "Revisa los datos." };
  return { error: "No se pudo completar la acción. Intenta más tarde." };
}

// PATCH /visitas/:id/cancelar (H15).
export async function cancelarVisita(id: unknown): Promise<VisitaAccionState> {
  if (typeof id !== "string" || !UUID_REGEX.test(id)) return { error: "La visita ya no existe." };
  let res: Response;
  try {
    res = await apiFetch(`visitas/${id}/cancelar`, { method: "PATCH" });
  } catch (error) {
    // Un 401 redirige dentro de apiFetch (sesión expirada): deja pasar esa redirección.
    unstable_rethrow(error);
    console.error("Error al cancelar la visita:", error);
    return { error: "No se pudo cancelar la autorización. Intenta más tarde." };
  }
  if (res.ok) {
    revalidatePath(MIS_VISITAS_PATH);
    return { ok: MIS_VISITAS_MESSAGES.cancelled };
  }
  const payload = await res.json().catch(() => null);
  return accionError(res.status, firstMessage(payload));
}

// POST /visitas/:id/respuesta (H15): aprueba o rechaza una solicitud de portería.
export async function responderVisita(
  id: unknown,
  decision: unknown,
  reason: unknown,
): Promise<VisitaAccionState> {
  if (typeof id !== "string" || !UUID_REGEX.test(id)) return { error: "La visita ya no existe." };
  if (decision !== "APROBAR" && decision !== "RECHAZAR") return { error: "Respuesta inválida." };
  const motivo = typeof reason === "string" ? reason.trim() : "";
  if (motivo.length > REJECT_REASON_MAX) return { error: MIS_VISITAS_MESSAGES.reason };

  let res: Response;
  try {
    res = await apiFetch(`visitas/${id}/respuesta`, {
      method: "POST",
      body: JSON.stringify(
        decision === "RECHAZAR" && motivo ? { decision, reason: motivo } : { decision },
      ),
    });
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error al responder la solicitud:", error);
    return { error: "No se pudo enviar tu respuesta. Intenta más tarde." };
  }
  if (res.ok) {
    revalidatePath(MIS_VISITAS_PATH);
    return {
      ok: decision === "APROBAR" ? MIS_VISITAS_MESSAGES.approved : MIS_VISITAS_MESSAGES.rejected,
    };
  }
  const payload = await res.json().catch(() => null);
  return accionError(res.status, firstMessage(payload));
}
