// Tipos, etiquetas y formatos de "Mis visitas" (H15). Sin dependencias del
// servidor: los usan los componentes de cliente. Las consultas están en
// lib/mis-visitas-api.ts.

export const MIS_VISITAS_PATH = "/visitas";
export const PAGE_SIZE = 10;
/** La pestaña Activas se actualiza cada 15 segundos. */
export const POLL_MS = 15_000;
export const REJECT_REASON_MAX = 100;

export const TABS = [
  { value: "activas", label: "Activas" },
  { value: "historial", label: "Historial" },
] as const;
export type Tab = (typeof TABS)[number]["value"];

export function isTab(value: unknown): value is Tab {
  return value === "activas" || value === "historial";
}

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
  PENDIENTE_AUTORIZACION: "Pendiente de autorización",
  RECHAZADA: "Rechazada",
  DENTRO: "Dentro",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
  VENCIDA: "Vencida",
};

export type MiVisita = {
  id: string;
  visitorName: string;
  documentType: "DUI" | "PASAPORTE";
  documentNumber: string;
  visitDate: string;
  expectedTime: string | null;
  entryAt: string | null;
  reason: string;
  code: string | null;
  status: VisitStatus;
  origin: "PREAUTORIZADA" | "SIN_AUTORIZACION_PREVIA";
  createdBy: string;
  rejectReason: string | null;
  expiresAt: string | null;
};

export type MisVisitasLista = {
  data: MiVisita[];
  total: number;
  page: number;
  pageSize: number;
};

export const MESSAGES = {
  emptyActive: "No tienes visitas activas.",
  emptyHistory: "No hay visitas en tu historial.",
  cancelled: "Autorización cancelada",
  approved: "Visita aprobada",
  rejected: "Visita rechazada",
  confirmCancel: (visitor: string, date: string) =>
    `¿Cancelar la autorización de ${visitor} del ${date}?`,
  waiting: (minutes: number) => `Seguridad espera tu respuesta (quedan ${minutes} min)`,
  reason: `El motivo puede tener máximo ${REJECT_REASON_MAX} caracteres.`,
} as const;

/** "DUI 01234567-8" o "Pasaporte A1234567". */
export function documentLabel(type: MiVisita["documentType"], number: string): string {
  return `${type === "DUI" ? "DUI" : "Pasaporte"} ${number}`;
}

/** "AAAA-MM-DD" → "DD/MM/AAAA". */
export function formatFecha(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

const TIME = new Intl.DateTimeFormat("es-SV", {
  timeZone: "America/El_Salvador",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Hora estimada (preautorizadas) o de llegada (ya entró). */
export function horaLabel(visita: MiVisita): string {
  if (visita.entryAt) return `Llegó ${TIME.format(new Date(visita.entryAt))}`;
  return visita.expectedTime ?? "—";
}

/** Minutos que le quedan a la unidad para responder (0 si ya venció). */
export function minutosRestantes(expiresAt: string, nowMs: number = Date.now()): number {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - nowMs) / 60_000));
}
