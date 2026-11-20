"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { PAQUETES_PATH } from "@/lib/paquetes";
import {
  ENTREGA_FIELD_REGEX,
  ENTREGA_MESSAGES,
  cleanEntrega,
  validateEntrega,
  type EntregaErrors,
  type EntregaValues,
} from "@/lib/validation/entrega";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EntregarInput = EntregaValues & { id: string };

export type EntregarState = {
  errors?: EntregaErrors;
  formError?: string;
};

function firstMessage(body: unknown) {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return undefined;
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

// POST /seguridad/paquetes/:id/entrega (H21). Vuelve a validar en el servidor
// por si el navegador se saltó la validación del formulario.
export async function entregarPaquete(
  _prev: EntregarState,
  raw: EntregarInput,
): Promise<EntregarState> {
  const input = (raw ?? {}) as Record<string, unknown>;
  const id = text(input.id);
  if (!UUID_REGEX.test(id)) {
    return { formError: "El paquete no existe." };
  }

  const docType = input.pickedUpByDocType === "PASAPORTE" ? "PASAPORTE" : "DUI";
  const values = cleanEntrega({
    pickedUpByName: text(input.pickedUpByName),
    pickedUpByDocType: docType,
    pickedUpByDocNumber: text(input.pickedUpByDocNumber),
  });
  const errors = validateEntrega(values);
  if (Object.keys(errors).length > 0) return { errors };

  let res: Response;
  try {
    res = await apiFetch(`seguridad/paquetes/${id}/entrega`, {
      method: "POST",
      body: JSON.stringify(values),
    });
  } catch (error) {
    // Con un 401 (sesión vencida) `apiFetch` redirige al login lanzando una
    // excepción interna de Next: hay que dejarla pasar.
    unstable_rethrow(error);
    console.error("Error al registrar la entrega:", error);
    return { formError: "No se pudo registrar la entrega. Intenta más tarde." };
  }

  if (res.ok) {
    revalidatePath(PAQUETES_PATH);
    redirect(`${PAQUETES_PATH}?aviso=${encodeURIComponent(ENTREGA_MESSAGES.success)}`);
  }

  const payload = await res.json().catch(() => null);
  const message = firstMessage(payload);

  if (res.status === 400) {
    const field = (payload as { field?: unknown } | null)?.field;
    if (typeof field === "string" && ENTREGA_FIELD_REGEX.test(field) && message) {
      return { errors: { [field]: message } };
    }
    return { formError: message ?? "Revisa los datos del formulario." };
  }
  if (res.status === 403) return { formError: "No tienes permiso para esta acción." };
  if (res.status === 404 || res.status === 409) {
    // 409: otro agente ya lo entregó. 404: el paquete ya no existe. En los dos
    // casos la fila tiene que salir de la lista, y al recargarla se cerraría
    // el diálogo con el mensaje; por eso el aviso se muestra en la página.
    const fallback =
      res.status === 409 ? "Este paquete ya fue entregado." : "El paquete no existe.";
    revalidatePath(PAQUETES_PATH);
    redirect(`${PAQUETES_PATH}?alerta=${encodeURIComponent(message ?? fallback)}`);
  }

  console.error(`POST seguridad/paquetes/${id}/entrega respondió ${res.status}`);
  return { formError: "No se pudo registrar la entrega. Intenta más tarde." };
}