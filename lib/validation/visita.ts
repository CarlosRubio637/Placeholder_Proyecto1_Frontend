// Reglas del formulario "Autorizar visita" (H14). Deben coincidir con
// CreateVisitDto y las reglas de fecha y hora de VisitsService (POST /visitas).
// Sin dependencias del servidor: las usan el formulario (cliente) y la Server
// Function. Las fechas y horas son las de El Salvador (UTC−6, sin horario de verano).

export const DOCUMENT_TYPES = [
  { value: "DUI", label: "DUI" },
  { value: "PASAPORTE", label: "Pasaporte" },
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number]["value"];

export const LIMITS = {
  nameMin: 3,
  nameMax: 80,
  reasonMin: 5,
  reasonMax: 100,
  maxDaysAhead: 30,
  stepMinutes: 15,
} as const;

/** Horario de visitas: el código solo sirve en esta franja del día de la visita. */
export const VISIT_HOURS = { from: "06:00", until: "22:00" } as const;

export const MESSAGES = {
  name: "El nombre debe tener entre 3 y 80 caracteres, solo letras y espacios.",
  documentType: "Selecciona el tipo de documento: DUI o Pasaporte.",
  dui: "Ingresa el DUI con el formato 00000000-0.",
  passport: "El pasaporte debe tener de 6 a 12 letras o números.",
  dateRange: (limit: string) => `La fecha debe estar entre hoy y ${limit}.`,
  hours: "El horario de visitas es de 06:00 a 22:00.",
  timePassed: "La hora estimada no puede ser anterior a la hora actual.",
  reason: "El motivo debe tener entre 5 y 100 caracteres.",
} as const;

export type VisitaValues = {
  visitorName: string;
  documentType: string;
  documentNumber: string;
  visitDate: string;
  expectedTime: string;
  reason: string;
};

export type VisitaField = keyof VisitaValues;
export type VisitaErrors = Partial<Record<VisitaField, string>>;

const DUI_REGEX = /^\d{8}-\d$/;
const PASSPORT_REGEX = /^[A-Za-z0-9]{6,12}$/;
const NAME_REGEX = /^[\p{L} ]+$/u;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const TIME_HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

const SV_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Fecha y hora de pared de El Salvador: { date: "AAAA-MM-DD", time: "HH:mm" }. */
export function svNow(nowMs: number = Date.now()): { date: string; time: string } {
  const iso = new Date(nowMs - SV_OFFSET_MS).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/** "AAAA-MM-DD" más `days` días. */
export function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** "AAAA-MM-DD" → "DD/MM/AAAA". */
export function formatDateEs(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function fromMinutes(total: number): string {
  const hours = String(Math.floor(total / 60)).padStart(2, "0");
  const minutes = String(total % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** Horas del selector: de 06:00 a 22:00 cada 15 minutos. */
export const TIME_OPTIONS: string[] = (() => {
  const options: string[] = [];
  for (
    let minutes = toMinutes(VISIT_HOURS.from);
    minutes <= toMinutes(VISIT_HOURS.until);
    minutes += LIMITS.stepMinutes
  ) {
    options.push(fromMinutes(minutes));
  }
  return options;
})();

/** Si la visita es hoy, solo las horas que todavía no pasaron. */
export function availableTimes(visitDate: string, nowMs: number = Date.now()): string[] {
  const now = svNow(nowMs);
  if (visitDate !== now.date) return TIME_OPTIONS;
  return TIME_OPTIONS.filter((time) => time >= now.time);
}

/**
 * Valores iniciales: hoy y el siguiente cuarto de hora. Si hoy ya no queda
 * ningún horario (después de las 22:00), mañana a las 06:00.
 */
export function defaultSchedule(nowMs: number = Date.now()): { visitDate: string; expectedTime: string } {
  const today = svNow(nowMs).date;
  const next = availableTimes(today, nowMs)[0];
  if (next) return { visitDate: today, expectedTime: next };
  return { visitDate: addDays(today, 1), expectedTime: VISIT_HOURS.from };
}

/** Nombre con espacios simples. */
export function cleanName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

export function cleanValues(values: VisitaValues): VisitaValues {
  return {
    visitorName: cleanName(values.visitorName),
    documentType: values.documentType,
    documentNumber: values.documentNumber.trim(),
    visitDate: values.visitDate,
    expectedTime: values.expectedTime,
    reason: values.reason.trim(),
  };
}

export function readVisitaValues(formData: FormData): VisitaValues {
  const text = (name: VisitaField) => String(formData.get(name) ?? "");
  return cleanValues({
    visitorName: text("visitorName"),
    documentType: text("documentType"),
    documentNumber: text("documentNumber"),
    visitDate: text("visitDate"),
    expectedTime: text("expectedTime"),
    reason: text("reason"),
  });
}

/** Errores por campo de valores ya limpios (cleanValues). Vacío si todo es válido. */
export function validateVisita(values: VisitaValues, nowMs: number = Date.now()): VisitaErrors {
  const errors: VisitaErrors = {};
  const { length } = values.visitorName;
  if (length < LIMITS.nameMin || length > LIMITS.nameMax || !NAME_REGEX.test(values.visitorName)) {
    errors.visitorName = MESSAGES.name;
  }

  if (values.documentType === "DUI") {
    if (!DUI_REGEX.test(values.documentNumber)) errors.documentNumber = MESSAGES.dui;
  } else if (values.documentType === "PASAPORTE") {
    if (!PASSPORT_REGEX.test(values.documentNumber)) errors.documentNumber = MESSAGES.passport;
  } else {
    errors.documentType = MESSAGES.documentType;
  }

  const now = svNow(nowMs);
  const limit = addDays(now.date, LIMITS.maxDaysAhead);
  if (!DATE_ONLY.test(values.visitDate) || values.visitDate < now.date || values.visitDate > limit) {
    errors.visitDate = MESSAGES.dateRange(formatDateEs(limit));
  }

  if (!TIME_HH_MM.test(values.expectedTime) || !TIME_OPTIONS.includes(values.expectedTime)) {
    errors.expectedTime = MESSAGES.hours;
  } else if (values.visitDate === now.date && values.expectedTime < now.time) {
    errors.expectedTime = MESSAGES.timePassed;
  }

  const reasonLength = values.reason.length;
  if (reasonLength < LIMITS.reasonMin || reasonLength > LIMITS.reasonMax) {
    errors.reason = MESSAGES.reason;
  }
  return errors;
}
