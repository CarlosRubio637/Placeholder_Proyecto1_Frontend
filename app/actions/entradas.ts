"use server";

import { apiFetch } from "@/lib/api";
import { formatHora, type Solicitud, type UnidadDestino, type VisitaPorteria } from "@/lib/entradas";
import { buscarVisitas, getSolicitudes, getUnidadesDestino } from "@/lib/entradas-api";
import {
  FIELD_PATH_REGEX,
  MESSAGES,
  cleanSearch,
  cleanSolicitud,
  validateSearch,
  validateSolicitud,
  type SolicitudErrors,
  type SolicitudValues,
} from "@/lib/validation/entrada";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SERVER_ERROR = "No se pudo completar la acción. Intenta más tarde.";

function firstMessage(body: unknown) {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return undefined;
}

function commonError(status: number): string {
  if (status === 403) return "No tienes permiso para esta acción.";
  return SERVER_ERROR;
}

// ----------------- Buscar -----------------

export type BuscarState = { data?: VisitaPorteria[]; error?: string };

// GET /seguridad/visitas/buscar (H16): visitas de hoy por código o documento.
export async function buscarVisita(raw: unknown): Promise<BuscarState> {
  const q = typeof raw === "string" ? raw : "";
  const invalid = validateSearch(q);
  if (invalid) return { error: invalid };

  let res: Response;
  try {
    res = await buscarVisitas(cleanSearch(q));
  } catch (error) {
    console.error("Error al buscar la visita:", error);
    return { error: SERVER_ERROR };
  }
  if (res.ok) {
    const body = (await res.json()) as { data: VisitaPorteria[] };
    return body.data.length > 0 ? { data: body.data } : { error: MESSAGES.notFound };
  }
  const payload = await res.json().catch(() => null);
  if (res.status === 400) return { error: firstMessage(payload) ?? MESSAGES.search };
  return { error: commonError(res.status) };
}

// ----------------- Registrar entrada -----------------

export type EntradaState = { ok?: string; error?: string };

// POST /seguridad/visitas/:id/entrada (H16). Responde el aviso a mostrar.
export async function registrarEntrada(id: unknown): Promise<EntradaState> {
  if (typeof id !== "string" || !UUID_REGEX.test(id)) {
    return { error: "No se encontró la visita." };
  }
  let res: Response;
  try {
    res = await apiFetch(`seguridad/visitas/${id}/entrada`, { method: "POST" });
  } catch (error) {
    console.error("Error al registrar la entrada:", error);
    return { error: SERVER_ERROR };
  }
  const payload = await res.json().catch(() => null);
  if (res.ok) {
    const entryAt = (payload as { entryAt?: string } | null)?.entryAt ?? new Date().toISOString();
    return { ok: MESSAGES.entryRegistered(formatHora(entryAt)) };
  }
  if (res.status === 404) return { error: "No se encontró la visita." };
  if (res.status === 409) return { error: firstMessage(payload) ?? SERVER_ERROR };
  return { error: commonError(res.status) };
}

// ----------------- Solicitudes -----------------

export type SolicitudesState = { data?: Solicitud[]; error?: string };

// GET /seguridad/visitas/solicitudes: la usa la tabla al abrir, cada 15 s y con Actualizar.
export async function listarSolicitudes(): Promise<SolicitudesState> {
  try {
    return { data: await getSolicitudes() };
  } catch (error) {
    console.error("Error al cargar las solicitudes:", error);
    return { error: "No se pudieron cargar las solicitudes." };
  }
}

export type EnviarSolicitudState = {
  errors?: SolicitudErrors;
  formError?: string;
  /** Aviso de éxito; el formulario se cierra al recibirlo. */
  sent?: string;
};

const text = (value: unknown) => (typeof value === "string" ? value : "");

function readInput(raw: unknown): SolicitudValues {
  const input = (raw ?? {}) as Record<string, unknown>;
  return {
    visitorName: text(input.visitorName),
    documentType: text(input.documentType),
    documentNumber: text(input.documentNumber),
    towerId: text(input.towerId),
    unitId: text(input.unitId),
    reason: text(input.reason),
  };
}

// POST /seguridad/visitas/solicitudes (H16). Vuelve a validar en el servidor
// por si el navegador se saltó la validación del formulario.
export async function enviarSolicitud(
  _prev: EnviarSolicitudState,
  raw: SolicitudValues,
): Promise<EnviarSolicitudState> {
  const values = cleanSolicitud(readInput(raw));
  const errors = validateSolicitud(values);
  if (Object.keys(errors).length > 0) return { errors };

  let res: Response;
  try {
    res = await apiFetch("seguridad/visitas/solicitudes", {
      method: "POST",
      body: JSON.stringify({
        visitorName: values.visitorName,
        documentType: values.documentType,
        documentNumber: values.documentNumber,
        unitId: values.unitId,
        reason: values.reason,
      }),
    });
  } catch (error) {
    console.error("Error al enviar la solicitud:", error);
    return { formError: "No se pudo enviar la solicitud. Intenta más tarde." };
  }

  const payload = await res.json().catch(() => null);
  if (res.ok) {
    const unitCode = (payload as { unitCode?: string } | null)?.unitCode ?? "";
    return { sent: MESSAGES.requestSent(unitCode) };
  }

  const message = firstMessage(payload);
  if (res.status === 400) {
    const field = (payload as { field?: unknown } | null)?.field;
    if (typeof field === "string" && FIELD_PATH_REGEX.test(field) && message) {
      return { errors: { [field as keyof SolicitudErrors]: message } };
    }
    return { formError: message ?? "Revisa los datos del formulario." };
  }
  if (res.status === 404) return { errors: { unitId: message ?? "La unidad no existe." } };
  if (res.status === 409) {
    // Unidad sin residentes va junto al campo; visitante dentro u horario, arriba del botón.
    if (message === "La unidad no tiene residentes registrados.") {
      return { errors: { unitId: message } };
    }
    return { formError: message ?? SERVER_ERROR };
  }
  return { formError: commonError(res.status) };
}

export type UnidadesDestinoState = { data?: UnidadDestino[]; error?: string };

// El formulario la llama al elegir torre; así el cliente no maneja el token.
export async function listarUnidadesDestino(towerId: unknown): Promise<UnidadesDestinoState> {
  if (typeof towerId !== "string" || !UUID_REGEX.test(towerId)) return { data: [] };
  try {
    return { data: await getUnidadesDestino(towerId) };
  } catch (error) {
    console.error("Error al cargar las unidades:", error);
    return { error: "No se pudieron cargar las unidades." };
  }
}
