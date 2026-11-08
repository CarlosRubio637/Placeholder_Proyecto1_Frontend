"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  availabilityPath,
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
