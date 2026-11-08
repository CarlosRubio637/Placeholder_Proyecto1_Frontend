"use server";

import { apiFetch } from "@/lib/api";
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
