"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { todaySV } from "@/lib/areas";
import {
  MESSAGES,
  readComunicadoValues,
  validateComunicado,
  type ComunicadoErrors,
  type ComunicadoField,
} from "@/lib/validation/comunicados";

export type AudienciaResult = { recipientCount: number } | { error: string };

export type PublicarState = {
  errors?: ComunicadoErrors;
  formError?: string;
};

const LIST_PATH = "/admin/comunicados";
const FIELDS: ComunicadoField[] = ["title", "body", "category", "towerIds", "expiresOn"];

function isField(value: unknown): value is ComunicadoField {
  return typeof value === "string" && (FIELDS as string[]).includes(value);
}

function firstMessage(body: unknown) {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return undefined;
}

async function send(path: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await apiFetch(path, init);
  } catch (error) {
    unstable_rethrow(error);
    console.error(`No se pudo llamar a ${path}:`, error);
    return null;
  }
}

export async function contarAudiencia(towerIds: string[]): Promise<AudienciaResult> {
  const query = towerIds.length > 0 ? `?towerIds=${towerIds.map(encodeURIComponent).join(",")}` : "";
  const res = await send(`admin/comunicados/audiencia${query}`);
  if (!res) return { error: MESSAGES.audienceFailed };
  if (res.ok) return (await res.json()) as { recipientCount: number };
  if (res.status === 403) return { error: MESSAGES.forbidden };

  const message = firstMessage(await res.json().catch(() => null));
  if (res.status === 400 && message) return { error: message };

  console.error(`GET admin/comunicados/audiencia respondió ${res.status}`);
  return { error: MESSAGES.audienceFailed };
}

export async function publicarComunicado(
  _prevState: PublicarState,
  formData: FormData,
): Promise<PublicarState> {
  const values = readComunicadoValues(formData);
  const errors = validateComunicado(values, todaySV());
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const body = {
    title: values.title,
    body: values.body,
    category: values.category,
    audience: values.allTowers ? "TODOS" : "TORRES",
    ...(values.allTowers ? {} : { towerIds: values.towerIds }),
    expiresOn: values.expiresOn,
  };
  const res = await send("admin/comunicados", { method: "POST", body: JSON.stringify(body) });
  if (!res) return { formError: MESSAGES.publishFailed };

  if (res.status === 201) {
    revalidatePath(LIST_PATH);
    redirect(`${LIST_PATH}?aviso=comunicado-publicado`);
  }

  const payload = await res.json().catch(() => null);
  const message = firstMessage(payload);

  if (res.status === 400) {
    const field = (payload as { field?: unknown } | null)?.field;
    if (isField(field) && message) return { errors: { [field]: message } };
    return { formError: message ?? "Revisa los datos del formulario." };
  }
  if (res.status === 403) return { formError: MESSAGES.forbidden };

  console.error(`POST admin/comunicados respondió ${res.status}`);
  return { formError: MESSAGES.publishFailed };
}
