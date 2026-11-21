"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  availabilityPath,
  CANCEL_AVISOS,
  validateReserva,
  type ReservaErrors,
  type ReservaField,
  type Reservation,
} from "@/lib/reservas";

// H7: el residente confirma la reserva de una franja.

export type ReservaFormState = {
  errors?: ReservaErrors;
  formError?: string;
  reservation?: Reservation;
};

const FIELDS: ReservaField[] = ["attendees", "acceptRules"];
const SERVER_ERROR = "No se pudo confirmar la reserva. Intenta más tarde.";
const SLOT_TAKEN = "Esta franja ya fue reservada por otra unidad.";

function firstMessage(body: { message?: unknown } | null) {
  const message = body?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return undefined;
}

export async function reservar(
  _prev: ReservaFormState,
  formData: FormData,
): Promise<ReservaFormState> {
  const areaId = String(formData.get("areaId") ?? "");
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const capacity = Number(formData.get("capacity"));
  const values = {
    attendees: String(formData.get("attendees") ?? "").trim(),
    acceptRules: formData.get("acceptRules") === "on",
  };

  // El aforo llega del formulario solo para el mensaje; el backend lo valida
  // con el valor real del área.
  const errors = validateReserva(values, Number.isInteger(capacity) && capacity > 0 ? capacity : 500);
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  let res: Response;
  try {
    res = await apiFetch("reservas", {
      method: "POST",
      body: JSON.stringify({
        areaId,
        date,
        startTime,
        attendees: Number(values.attendees),
        acceptRules: true,
      }),
    });
  } catch (error) {
    console.error("Error al reservar:", error);
    return { formError: SERVER_ERROR };
  }

  if (res.status === 201) {
    revalidatePath(`/reservas/${areaId}`);
    return { reservation: (await res.json()) as Reservation };
  }

  const body = (await res.json().catch(() => null)) as { message?: unknown; field?: unknown } | null;
  const message = firstMessage(body);
  if (res.status === 400) {
    const field = body?.field;
    if (typeof field === "string" && (FIELDS as string[]).includes(field) && message) {
      return { errors: { [field as ReservaField]: message } };
    }
    return { formError: message ?? "Revisa los datos de la reserva." };
  }
  if (res.status === 409) {
    if (message === SLOT_TAKEN) {
      // Regresa a la disponibilidad, que muestra el aviso y los datos al día.
      redirect(`${availabilityPath(areaId, date)}&aviso=franja-ocupada`);
    }
    return { formError: message ?? SERVER_ERROR };
  }
  if (res.status === 404) {
    return { formError: "El área no existe." };
  }
  if (res.status === 403) {
    return { formError: "No tienes permiso para esta acción." };
  }
  console.error(`Reservar respondió ${res.status}`);
  return { formError: SERVER_ERROR };
}

export type CancelarState = { error?: string };

const AVISO_FROM_MESSAGE: Record<string, keyof typeof CANCEL_AVISOS> = {
  [CANCEL_AVISOS["ya-cancelada"]]: "ya-cancelada",
  [CANCEL_AVISOS["menos-24h"]]: "menos-24h",
  [CANCEL_AVISOS["no-existe"]]: "no-existe",
};

/**
 * H8: PATCH /reservas/:id/cancelar. Con éxito va al Historial con el aviso.
 * Un 404 o 409 (otro residente de la unidad ya la canceló, o faltan menos de
 * 24 h) recarga la lista y muestra el motivo arriba: si se quedara junto al
 * botón, se perdería al desaparecer la fila.
 */
export async function cancelarReserva(
  _prev: CancelarState,
  formData: FormData,
): Promise<CancelarState> {
  const id = String(formData.get("id") ?? "");
  const tab = formData.get("tab") === "historial" ? "historial" : "proximas";
  let res: Response;
  try {
    res = await apiFetch(`reservas/${encodeURIComponent(id)}/cancelar`, { method: "PATCH" });
  } catch (error) {
    // Deja pasar el redirect() de apiFetch cuando la sesión venció.
    unstable_rethrow(error);
    console.error("Error al cancelar la reserva:", error);
    return { error: "No se pudo cancelar la reserva. Intenta más tarde." };
  }

  if (res.ok) {
    revalidatePath("/reservas/mias");
    redirect("/reservas/mias?tab=historial&aviso=reserva-cancelada");
  }

  const body = (await res.json().catch(() => null)) as { message?: unknown } | null;
  const message = firstMessage(body);
  if (res.status === 404 || res.status === 409) {
    const aviso = (message && AVISO_FROM_MESSAGE[message]) ?? (res.status === 404 ? "no-existe" : "ya-cancelada");
    revalidatePath("/reservas/mias");
    redirect(`/reservas/mias?${tab === "historial" ? "tab=historial&" : ""}aviso=${aviso}`);
  }
  if (res.status === 403) {
    return { error: "No tienes permiso para esta acción." };
  }
  console.error(`Cancelar reserva respondió ${res.status}`);
  return { error: "No se pudo cancelar la reserva. Intenta más tarde." };
}
