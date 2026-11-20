// Tipos y formatos de la portería (H16). Sin dependencias del servidor: los
// usan los componentes de cliente. Las consultas están en lib/entradas-api.ts.

/** La lista "Esperando respuesta" se actualiza cada 15 segundos. */
export const SOLICITUDES_POLL_MS = 15_000;

export type VisitStatus =
  | "AUTORIZADA"
  | "PENDIENTE_AUTORIZACION"
  | "RECHAZADA"
  | "DENTRO"
  | "FINALIZADA"
  | "CANCELADA"
  | "VENCIDA";

export const STATUS_LABELS: Record<VisitStatus, string> = {
  AUTORIZADA: "Autorizada",
  PENDIENTE_AUTORIZACION: "Esperando respuesta",
  RECHAZADA: "Rechazada",
  DENTRO: "Dentro",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
  VENCIDA: "Vencida",
};

export type VisitaPorteria = {
  id: string;
  code: string | null;
  origin: "PREAUTORIZADA" | "SIN_AUTORIZACION_PREVIA";
  visitorName: string;
  documentType: "DUI" | "PASAPORTE";
  documentNumber: string;
  unitCode: string;
  reason: string;
  visitDate: string;
  status: VisitStatus;
  validFrom: string;
  validUntil: string;
};

export type Solicitud = VisitaPorteria & {
  rejectReason: string | null;
  createdAt: string;
  expiresAt: string | null;
};

// ----------------- Formato -----------------

const timeFormatter = new Intl.DateTimeFormat("es-SV", {
  timeZone: "America/El_Salvador",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "HH:mm" en hora de El Salvador. */
export function formatHora(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? "—" : timeFormatter.format(ms);
}

/** "DUI 01234567-8" o "Pasaporte A1234567". */
export function documentLabel(type: VisitaPorteria["documentType"], number: string): string {
  return `${type === "DUI" ? "DUI" : "Pasaporte"} ${number}`;
}

/** Autorizada y dentro de su vigencia: se puede registrar la entrada. */
export function puedeEntrar(visita: VisitaPorteria, nowMs: number = Date.now()): boolean {
  return (
    visita.status === "AUTORIZADA" &&
    nowMs >= Date.parse(visita.validFrom) &&
    nowMs <= Date.parse(visita.validUntil)
  );
}

/** Minutos que le quedan al residente para responder (0 si ya venció). */
export function minutosRestantes(expiresAt: string, nowMs: number = Date.now()): number {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - nowMs) / 60_000));
}
