// Reservas de áreas comunes (H7): tipos de GET /areas y POST /reservas,
// mensajes y validación. Sin dependencias del servidor: lo importan también
// componentes de cliente. Las consultas al backend están en lib/reservas-api.ts.

/** Área habilitada tal como la ve el residente. */
export type PublicArea = {
  id: string;
  name: string;
  capacity: number;
  rules: string | null;
  openTime: string;
  closeTime: string;
  slotMinutes: number;
};

/** Comprobante que devuelve POST /reservas. */
export type Reservation = {
  id: string;
  code: string;
  area: { id: string; name: string };
  date: string;
  startTime: string;
  endTime: string;
  attendees: number;
  status: "CONFIRMADA" | "CANCELADA" | "CANCELADA_ADMIN";
  createdAt: string;
};

export const STATUS_LABEL: Record<Reservation["status"], string> = {
  CONFIRMADA: "Confirmada",
  CANCELADA: "Cancelada",
  CANCELADA_ADMIN: "Cancelada por la administración",
};

export const RESERVA_MESSAGES = {
  attendees: (capacity: number) => `Ingresa entre 1 y ${capacity} personas.`,
  acceptRules: "Debes aceptar las reglas de uso.",
  success: "Reserva confirmada",
  slotTaken: "Esta franja ya fue reservada por otra unidad. Elige otra.",
} as const;

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/**
 * Fin de la franja que empieza a `startTime`, o null si `startTime` no es el
 * inicio de una franja completa del horario del área.
 */
export function slotEnd(area: PublicArea, startTime: string): string | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) return null;
  const start = toMinutes(startTime);
  const open = toMinutes(area.openTime);
  const end = start + area.slotMinutes;
  if (start < open || end > toMinutes(area.closeTime) || (start - open) % area.slotMinutes !== 0) {
    return null;
  }
  return toTime(end);
}

export type ReservaValues = { attendees: string; acceptRules: boolean };
export type ReservaField = keyof ReservaValues;
export type ReservaErrors = Partial<Record<ReservaField, string>>;

export function validateReserva(values: ReservaValues, capacity: number): ReservaErrors {
  const errors: ReservaErrors = {};
  const attendees = Number(values.attendees);
  if (!/^\d+$/.test(values.attendees.trim()) || attendees < 1 || attendees > capacity) {
    errors.attendees = RESERVA_MESSAGES.attendees(capacity);
  }
  if (!values.acceptRules) {
    errors.acceptRules = RESERVA_MESSAGES.acceptRules;
  }
  return errors;
}

/** Ruta de la disponibilidad de un área (H6). */
export function availabilityPath(areaId: string, date?: string): string {
  return `/reservas/${areaId}${date ? `?fecha=${date}` : ""}`;
}

/** Ruta de la confirmación de una franja (H7). */
export function confirmationPath(areaId: string, date: string, startTime: string): string {
  return `/reservas/${areaId}/confirmar?fecha=${date}&inicio=${startTime}`;
}

export type SlotStatus = "DISPONIBLE" | "RESERVADO" | "MANTENIMIENTO" | "PASADO";

/** Franja de GET /areas/:areaId/disponibilidad (H6). */
export type AvailabilitySlot = {
  startTime: string;
  endTime: string;
  status: SlotStatus;
  ownReservationId: string | null;
};

/** "AAAA-MM-DD" más `days` días, sin depender de la zona del navegador. */
export function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
