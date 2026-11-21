"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { Perfil } from "@/lib/perfil";
import {
  MESSAGES,
  readPerfilValues,
  validatePerfil,
  type PerfilErrors,
  type PerfilField,
} from "@/lib/validation/perfil";

export type GuardarState = {
  saved?: Perfil;
  errors?: PerfilErrors;
  formError?: string;
};

const FIELDS: PerfilField[] = ["phone", "directory.showName"];

function isField(value: unknown): value is PerfilField {
  return typeof value === "string" && (FIELDS as string[]).includes(value);
}

function firstMessage(body: unknown) {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return undefined;
}

export async function guardarPerfil(_prevState: GuardarState, formData: FormData): Promise<GuardarState> {
  const values = readPerfilValues(formData);
  const errors = validatePerfil(values);
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  let res: Response;
  try {
    res = await apiFetch("perfil", { method: "PUT", body: JSON.stringify(values) });
  } catch (error) {
    unstable_rethrow(error);
    console.error("No se pudo llamar a perfil:", error);
    return { formError: MESSAGES.saveFailed };
  }

  if (res.ok) {
    revalidatePath("/perfil");
    return { saved: (await res.json()) as Perfil };
  }

  const payload = await res.json().catch(() => null);
  const message = firstMessage(payload);

  if (res.status === 400) {
    const field = (payload as { field?: unknown } | null)?.field;
    if (isField(field) && message) return { errors: { [field]: message } };
    return { formError: message ?? "Revisa los datos del formulario." };
  }
  if (res.status === 403) return { formError: MESSAGES.forbidden };

  console.error(`PUT perfil respondió ${res.status}`);
  return { formError: MESSAGES.saveFailed };
}
