"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  todayInElSalvador,
  type FeeGeneration,
  type FeeGenerationPreview,
} from "@/lib/cuotas";
import {
  MESSAGES,
  readGeneracionValues,
  validateGeneracion,
  type GeneracionErrors,
  type GeneracionField,
} from "@/lib/validation/cuotas";

export type VistaPreviaResult = { preview: FeeGenerationPreview } | { error: string };

export type GenerarCuotasState = {
  result?: FeeGeneration;
  errors?: GeneracionErrors;
  formError?: string;
};

const PAGE_PATH = "/admin/cuotas/generar";
const FIELDS: GeneracionField[] = ["period", "amount", "dueDate", "concept"];
const FORBIDDEN = "No tienes permiso para esta acción.";
const GENERATE_ERROR = "No se pudieron generar las cuotas. Intenta de nuevo.";

function isField(value: unknown): value is GeneracionField {
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

export async function previsualizarGeneracion(period: string): Promise<VistaPreviaResult> {
  const res = await send(`cuotas/generaciones/vista-previa?period=${encodeURIComponent(period)}`);
  if (!res) return { error: MESSAGES.previewFailed };
  if (res.ok) return { preview: (await res.json()) as FeeGenerationPreview };
  if (res.status === 403) return { error: FORBIDDEN };

  const message = firstMessage(await res.json().catch(() => null));
  if (res.status === 400 && message) return { error: message };

  console.error(`GET cuotas/generaciones/vista-previa respondió ${res.status}`);
  return { error: MESSAGES.previewFailed };
}

export async function generarCuotas(
  _prevState: GenerarCuotasState,
  formData: FormData,
): Promise<GenerarCuotasState> {
  const values = readGeneracionValues(formData);
  const errors = validateGeneracion(values, todayInElSalvador());
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const body = {
    period: values.period,
    amount: Number(values.amount),
    dueDate: values.dueDate,
    ...(values.concept ? { concept: values.concept } : {}),
  };
  const res = await send("cuotas/generaciones", { method: "POST", body: JSON.stringify(body) });
  if (!res) return { formError: GENERATE_ERROR };

  if (res.status === 201) {
    const result = (await res.json()) as FeeGeneration;
    revalidatePath(PAGE_PATH);
    return { result };
  }

  const payload = await res.json().catch(() => null);
  const message = firstMessage(payload);

  if (res.status === 400) {
    const field = (payload as { field?: unknown } | null)?.field;
    if (isField(field) && message) return { errors: { [field]: message } };
    return { formError: message ?? "Revisa los datos del formulario." };
  }
  if (res.status === 409 && message) return { formError: message };
  if (res.status === 403) return { formError: FORBIDDEN };

  console.error(`POST cuotas/generaciones respondió ${res.status}`);
  return { formError: GENERATE_ERROR };
}
