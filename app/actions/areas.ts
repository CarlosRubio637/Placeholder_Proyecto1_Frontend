"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { todaySV } from "@/lib/areas";
import {
  AREA_FIELDS,
  readAreaValues,
  readBlockValues,
  validateArea,
  validateBlock,
  type AreaErrors,
  type AreaField,
  type BlockErrors,
  type BlockField,
} from "@/lib/validation/area";

// H9: acciones de la administración de áreas comunes. Todas llaman al
// backend con apiFetch (token de la sesión; un 401 lleva al login).

export type AreaFormState = {
  errors?: AreaErrors;
  formError?: string;
  /** 409 RESERVAS_AFECTADAS: cuántas reservas cancelaría el cambio. */
  confirmCount?: number;
};

export type BlockFormState = {
  errors?: BlockErrors;
  formError?: string;
  confirmCount?: number;
  success?: string;
};

type ErrorBody = {
  message?: unknown;
  field?: unknown;
  code?: unknown;
  affectedCount?: unknown;
};

async function readBody(res: Response): Promise<ErrorBody | null> {
  return (await res.json().catch(() => null)) as ErrorBody | null;
}

function firstMessage(body: ErrorBody | null) {
  const message = body?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return undefined;
}

function affectedCount(res: Response, body: ErrorBody | null): number | undefined {
  return res.status === 409 && body?.code === "RESERVAS_AFECTADAS" && typeof body.affectedCount === "number"
    ? body.affectedCount
    : undefined;
}

const SERVER_ERROR = "No se pudo guardar. Intenta más tarde.";

/** Crea (sin `id`) o edita (con `id`) un área. */
export async function guardarArea(
  _prev: AreaFormState,
  formData: FormData,
): Promise<AreaFormState> {
  const id = String(formData.get("id") ?? "");
  const values = readAreaValues(formData);
  const errors = validateArea(values);
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const payload: Record<string, unknown> = {
    name: values.name,
    capacity: Number(values.capacity),
    rules: values.rules || null,
    openTime: values.openTime,
    closeTime: values.closeTime,
    slotMinutes: Number(values.slotMinutes),
    isActive: values.isActive,
  };
  if (id && formData.get("confirmCancellations") === "true") {
    payload.confirmCancellations = true;
  }

  let res: Response;
  try {
    res = await apiFetch(id ? `admin/areas/${id}` : "admin/areas", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Error al guardar el área:", error);
    return { formError: SERVER_ERROR };
  }

  if (res.ok) {
    revalidatePath("/admin/areas");
    redirect("/admin/areas?aviso=area-guardada");
  }

  const body = await readBody(res);
  const count = affectedCount(res, body);
  if (count !== undefined) {
    return { confirmCount: count };
  }

  const message = firstMessage(body);
  if (res.status === 400) {
    const field = body?.field;
    if (typeof field === "string" && (AREA_FIELDS as string[]).includes(field) && message) {
      return { errors: { [field as AreaField]: message } };
    }
    return { formError: message ?? "Revisa los datos del formulario." };
  }
  if (res.status === 409) {
    // Nombre repetido: "Ya existe un área con ese nombre."
    return { errors: { name: message ?? "Ya existe un área con ese nombre." } };
  }
  if (res.status === 404) {
    return { formError: "El área no existe." };
  }
  if (res.status === 403) {
    return { formError: "No tienes permiso para esta acción." };
  }
  console.error(`Guardar área respondió ${res.status}`);
  return { formError: SERVER_ERROR };
}

const BLOCK_FIELDS: BlockField[] = ["startDate", "endDate", "reason"];

export async function registrarBloqueo(
  _prev: BlockFormState,
  formData: FormData,
): Promise<BlockFormState> {
  const areaId = String(formData.get("areaId") ?? "");
  const values = readBlockValues(formData);
  const errors = validateBlock(values, todaySV());
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  let res: Response;
  try {
    res = await apiFetch(`admin/areas/${areaId}/bloqueos`, {
      method: "POST",
      body: JSON.stringify({
        ...values,
        ...(formData.get("confirmCancellations") === "true" ? { confirmCancellations: true } : {}),
      }),
    });
  } catch (error) {
    console.error("Error al registrar el bloqueo:", error);
    return { formError: SERVER_ERROR };
  }

  if (res.status === 201) {
    const body = (await res.json()) as { cancelledReservations: number };
    revalidatePath(`/admin/areas/${areaId}`);
    revalidatePath("/admin/areas");
    const n = body.cancelledReservations;
    return {
      success:
        n > 0
          ? `Bloqueo registrado. Se ${n === 1 ? "canceló 1 reserva" : `cancelaron ${n} reservas`} y se avisó a los residentes.`
          : "Bloqueo registrado",
    };
  }

  const body = await readBody(res);
  const count = affectedCount(res, body);
  if (count !== undefined) {
    return { confirmCount: count };
  }
  const message = firstMessage(body);
  if (res.status === 400) {
    const field = body?.field;
    if (typeof field === "string" && (BLOCK_FIELDS as string[]).includes(field) && message) {
      return { errors: { [field as BlockField]: message } };
    }
    return { formError: message ?? "Revisa los datos del bloqueo." };
  }
  if (res.status === 404) {
    return { formError: "El área no existe." };
  }
  console.error(`Registrar bloqueo respondió ${res.status}`);
  return { formError: SERVER_ERROR };
}

export async function eliminarBloqueo(formData: FormData): Promise<void> {
  const areaId = String(formData.get("areaId") ?? "");
  const blockId = String(formData.get("blockId") ?? "");
  const res = await apiFetch(`admin/areas/${areaId}/bloqueos/${blockId}`, { method: "DELETE" });
  if (res.status !== 204 && res.status !== 404) {
    throw new Error(`Eliminar bloqueo respondió ${res.status}`);
  }
  revalidatePath(`/admin/areas/${areaId}`);
  revalidatePath("/admin/areas");
}
