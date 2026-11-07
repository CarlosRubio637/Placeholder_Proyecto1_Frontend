"use server";

import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  readIncidenciaValues,
  validateIncidencia,
  validatePhotos,
  type IncidenciaErrors,
  type IncidenciaField,
} from "@/lib/validation/incidencia";

export type RegistrarIncidenciaState = {
  errors?: IncidenciaErrors;
  formError?: string;
};

const FIELDS: IncidenciaField[] = ["title", "description", "location", "locationDetail", "photos"];

function isField(value: unknown): value is IncidenciaField {
  return typeof value === "string" && (FIELDS as string[]).includes(value);
}

function firstMessage(body: unknown) {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return undefined;
}

// Reenvía el formulario a POST /incidencias (multipart). Vuelve a validar en
// el servidor por si el navegador se saltó la validación del formulario.
export async function registrarIncidencia(
  _prevState: RegistrarIncidenciaState,
  formData: FormData,
): Promise<RegistrarIncidenciaState> {
  const values = readIncidenciaValues(formData);
  const photos = formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File && value.size > 0);

  const errors = validateIncidencia(values);
  const photosError = validatePhotos(photos);
  if (photosError) errors.photos = photosError;
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  // Solo los campos que espera el backend (forbidNonWhitelisted).
  const body = new FormData();
  body.set("title", values.title);
  body.set("description", values.description);
  body.set("location", values.location);
  if (values.locationDetail) body.set("locationDetail", values.locationDetail);
  for (const photo of photos) body.append("photos", photo, photo.name);

  let res: Response;
  try {
    res = await apiFetch("incidencias", { method: "POST", body });
  } catch (error) {
    console.error("Error al registrar la incidencia:", error);
    return { formError: "No se pudo registrar la incidencia. Intenta más tarde." };
  }

  if (res.status === 201) {
    const incident = (await res.json()) as { id: string; number: string };
    redirect(`/incidencias/${incident.id}?registrada=${encodeURIComponent(incident.number)}`);
  }

  const payload = await res.json().catch(() => null);
  const message = firstMessage(payload);

  // 400: el backend indica en `field` el campo que falló.
  if (res.status === 400) {
    const field = (payload as { field?: unknown } | null)?.field;
    if (isField(field) && message) {
      return { errors: { [field]: message } };
    }
    return { formError: message ?? "Revisa los datos del formulario." };
  }
  if (res.status === 403) {
    return { formError: "No tienes permiso para esta acción." };
  }

  console.error(`POST incidencias respondió ${res.status}`);
  return { formError: "No se pudo registrar la incidencia. Intenta más tarde." };
}
