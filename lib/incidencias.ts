import { LOCATIONS } from "@/lib/validation/incidencia";

// Tipos y etiquetas del módulo de incidencias (H10-H13). Deben coincidir con
// las respuestas del backend (IncidentListDto, IncidentDetailDto).

export const STATUSES = ["PENDIENTE", "EN_PROCESO", "RESUELTO"] as const;
export type IncidentStatus = (typeof STATUSES)[number];
export type IncidentPriority = "BAJA" | "MEDIA" | "ALTA";
export type IncidentEventType = "CREACION" | "ESTADO" | "PRIORIDAD" | "ASIGNACION";

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  RESUELTO: "Resuelto",
};

export const PRIORITY_LABELS: Record<IncidentPriority, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
};

export function isStatus(value: unknown): value is IncidentStatus {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

export function locationLabel(value: string): string {
  return LOCATIONS.find((option) => option.value === value)?.label ?? value;
}

export type IncidentListItem = {
  id: string;
  number: string;
  title: string;
  location: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  createdAt: string;
};

export type IncidentList = {
  data: IncidentListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type IncidentEvent = {
  id: string;
  type: IncidentEventType;
  fromStatus: IncidentStatus | null;
  toStatus: IncidentStatus | null;
  fromValue: string | null;
  toValue: string | null;
  note: string | null;
  authorLabel: string;
  createdAt: string;
};

export type IncidentDetail = {
  id: string;
  number: string;
  title: string;
  description: string;
  location: string;
  locationDetail: string | null;
  status: IncidentStatus;
  priority: IncidentPriority;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  unit: { code: string };
  assignee: { name: string; specialty: string } | null;
  photos: { id: string; url: string }[];
  events: IncidentEvent[];
};

/** Prioridad tal como llega en fromValue/toValue ("ALTA") → "Alta". */
function priorityText(value: string | null): string {
  if (!value) return "—";
  return PRIORITY_LABELS[value as IncidentPriority] ?? value;
}

/** Texto de la columna "Cambio" del historial. */
export function describeEvent(event: IncidentEvent): string {
  switch (event.type) {
    case "CREACION":
      return `Registrada · ${STATUS_LABELS[event.toStatus ?? "PENDIENTE"]}`;
    case "ESTADO":
      return `${event.fromStatus ? STATUS_LABELS[event.fromStatus] : "—"} → ${
        event.toStatus ? STATUS_LABELS[event.toStatus] : "—"
      }`;
    case "PRIORIDAD":
      return `Prioridad: ${priorityText(event.fromValue)} → ${priorityText(event.toValue)}`;
    case "ASIGNACION":
      return `Responsable: ${event.fromValue ?? "Sin asignar"} → ${event.toValue ?? "Sin asignar"}`;
  }
}

const DATE_TIME = new Intl.DateTimeFormat("es-SV", {
  timeZone: "America/El_Salvador",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const DATE = new Intl.DateTimeFormat("es-SV", {
  timeZone: "America/El_Salvador",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** "06/11/2026, 10:42 a. m." en la hora del condominio. */
export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

/** "06/11/2026" en la hora del condominio. */
export function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
}
