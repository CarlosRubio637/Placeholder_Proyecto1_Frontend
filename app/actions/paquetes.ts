"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getUnidades, PAQUETES_PATH, type Unidad } from "@/lib/paquetes";
import {
  cleanPaquete,
  FIELD_PATH_REGEX,
  MESSAGES,
  validatePaquete,
  type PaqueteErrors,
  type PaqueteValues,
} from "@/lib/validation/paquete";

export type GuardarPaqueteState = {
  errors?: PaqueteErrors;
  formError?: string;
};

function firstMessage(body: unknown) {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return undefined;
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

function readInput(raw: unknown): PaqueteValues {
  const input = (raw ?? {}) as Record<string, unknown>;
  return {
    towerId: text(input.towerId),
    unitId: text(input.unitId),
    courier: text(input.courier),
    trackingNumber: text(input.trackingNumber),
    notes: text(input.notes),
  };
}

// POST /seguridad/paquetes (H19). Valida en el servidor por si el navegador
// se saltó la validación del formulario; redirige con un aviso al terminar.
export async function guardarPaquete(
  _prev: GuardarPaqueteState,
  raw: PaqueteValues,
): Promise<GuardarPaqueteState> {
  const values = cleanPaquete(readInput(raw));
  const errors = validatePaquete(values);
  if (Object.keys(errors).length > 0) return { errors };

  const body = {
    unitId: values.unitId,
    courier: values.courier,
    ...(values.trackingNumber ? { trackingNumber: values.trackingNumber } : {}),
    ...(values.notes ? { notes: values.notes } : {}),
  };

  let res: Response;
  try {
    res = await apiFetch("seguridad/paquetes", {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("Error al registrar el paquete:", error);
    return { formError: "No se pudo registrar el paquete. Intenta más tarde." };
  }

  if (res.ok) {
    const paquete = (await res.json().catch(() => null)) as
      | { code?: string; unit?: { code?: string } }
      | null;
    const code = paquete?.code ?? "";
    const unitCode = paquete?.unit?.code ?? "";
    revalidatePath(PAQUETES_PATH);
    redirect(
      `${PAQUETES_PATH}?aviso=${encodeURIComponent(MESSAGES.saved(code, unitCode))}`,
    );
  }

  const payload = await res.json().catch(() => null);
  const message = firstMessage(payload);

  if (res.status === 400) {
    const field = (payload as { field?: unknown } | null)?.field;
    if (typeof field === "string" && FIELD_PATH_REGEX.test(field) && message) {
      return { errors: { [field as keyof PaqueteErrors]: message } };
    }
    return { formError: message ?? "Revisa los datos del formulario." };
  }
  if (res.status === 401) return { formError: "Tu sesión expiró. Vuelve a entrar." };
  if (res.status === 403) return { formError: "No tienes permiso para esta acción." };
  if (res.status === 404) return { errors: { unitId: MESSAGES.unitNotFound } };
  if (res.status === 409) {
    return {
      errors: { unitId: message ?? MESSAGES.unitWithoutResidents },
    };
  }

  console.error(`POST seguridad/paquetes respondió ${res.status}`);
  return { formError: "No se pudo registrar el paquete. Intenta más tarde." };
}

export type UnidadesState = { data?: Unidad[]; error?: string };

// Server Function que el modal llama al elegir torre. Vive aquí para que el
// cliente no mande el token ni conozca la URL del backend.
export async function listarUnidades(towerId: string): Promise<UnidadesState> {
  if (typeof towerId !== "string" || !towerId) return { data: [] };
  try {
    const data = await getUnidades(towerId);
    return { data };
  } catch (error) {
    console.error("Error al cargar las unidades:", error);
    return { error: "No se pudieron cargar las unidades." };
  }
}
