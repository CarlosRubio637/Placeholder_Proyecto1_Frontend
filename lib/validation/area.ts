// Reglas de H9 para el formulario de área y el de bloqueo. Coinciden con el
// backend (src/reservations); el servidor valida de nuevo.

export const AREA_MESSAGES = {
  name: "El nombre debe tener de 3 a 50 caracteres.",
  capacity: "El aforo debe ser un entero entre 1 y 500.",
  rules: "Las reglas de uso pueden tener máximo 500 caracteres.",
  time: "Elige una hora en pasos de 30 minutos.",
  closeAfterOpen: "La hora de cierre debe ser posterior a la de apertura.",
  slot: "La duración de la franja debe ser de 60 o 120 minutos.",
  slotMultiple: (slot: number) =>
    `El horario debe dividirse en franjas completas de ${slot} minutos.`,
} as const;

export const BLOCK_MESSAGES = {
  date: "Elige una fecha válida.",
  pastStart: "La fecha de inicio no puede ser anterior a hoy.",
  endBeforeStart: "La fecha de fin no puede ser anterior a la de inicio.",
  tooLong: "El bloqueo puede durar máximo 90 días.",
  reason: "El motivo debe tener de 5 a 200 caracteres.",
} as const;

export const SLOT_OPTIONS = [60, 120] as const;
export const MAX_BLOCK_DAYS = 90;

/** 00:00, 00:30, ..., 23:30 */
export const HALF_HOURS = Array.from({ length: 48 }, (_, i) =>
  `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
);

export type AreaValues = {
  name: string;
  capacity: string;
  rules: string;
  openTime: string;
  closeTime: string;
  slotMinutes: string;
  isActive: boolean;
};
export type AreaField = Exclude<keyof AreaValues, "isActive">;
export type AreaErrors = Partial<Record<AreaField, string>>;

export const AREA_FIELDS: AreaField[] = [
  "name",
  "capacity",
  "rules",
  "openTime",
  "closeTime",
  "slotMinutes",
];

export function readAreaValues(formData: FormData): AreaValues {
  const text = (name: string) => String(formData.get(name) ?? "");
  return {
    name: text("name").trim().replace(/\s+/g, " "),
    capacity: text("capacity").trim(),
    rules: text("rules").trim(),
    openTime: text("openTime"),
    closeTime: text("closeTime"),
    slotMinutes: text("slotMinutes"),
    isActive: formData.get("isActive") === "on",
  };
}

const minutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export function validateArea(values: AreaValues): AreaErrors {
  const errors: AreaErrors = {};

  if (values.name.length < 3 || values.name.length > 50) {
    errors.name = AREA_MESSAGES.name;
  }
  const capacity = Number(values.capacity);
  if (!/^\d+$/.test(values.capacity) || capacity < 1 || capacity > 500) {
    errors.capacity = AREA_MESSAGES.capacity;
  }
  if (values.rules.length > 500) {
    errors.rules = AREA_MESSAGES.rules;
  }
  if (!HALF_HOURS.includes(values.openTime)) {
    errors.openTime = AREA_MESSAGES.time;
  }
  if (!HALF_HOURS.includes(values.closeTime)) {
    errors.closeTime = AREA_MESSAGES.time;
  }
  const slot = Number(values.slotMinutes);
  if (!SLOT_OPTIONS.includes(slot as 60 | 120)) {
    errors.slotMinutes = AREA_MESSAGES.slot;
  }

  if (!errors.openTime && !errors.closeTime) {
    const span = minutes(values.closeTime) - minutes(values.openTime);
    if (span <= 0) {
      errors.closeTime = AREA_MESSAGES.closeAfterOpen;
    } else if (!errors.slotMinutes && span % slot !== 0) {
      errors.closeTime = AREA_MESSAGES.slotMultiple(slot);
    }
  }
  return errors;
}

export type BlockValues = { startDate: string; endDate: string; reason: string };
export type BlockField = keyof BlockValues;
export type BlockErrors = Partial<Record<BlockField, string>>;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function readBlockValues(formData: FormData): BlockValues {
  return {
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    reason: String(formData.get("reason") ?? "").trim(),
  };
}

/** `today` es "AAAA-MM-DD" en hora del condominio. */
export function validateBlock(values: BlockValues, today: string): BlockErrors {
  const errors: BlockErrors = {};
  const validStart = DATE_ONLY.test(values.startDate);
  const validEnd = DATE_ONLY.test(values.endDate);

  if (!validStart) errors.startDate = BLOCK_MESSAGES.date;
  else if (values.startDate < today) errors.startDate = BLOCK_MESSAGES.pastStart;

  if (!validEnd) errors.endDate = BLOCK_MESSAGES.date;
  else if (validStart && values.endDate < values.startDate) {
    errors.endDate = BLOCK_MESSAGES.endBeforeStart;
  } else if (validStart) {
    const days =
      (Date.parse(`${values.endDate}T00:00:00Z`) - Date.parse(`${values.startDate}T00:00:00Z`)) /
        DAY_MS +
      1;
    if (days > MAX_BLOCK_DAYS) errors.endDate = BLOCK_MESSAGES.tooLong;
  }

  if (values.reason.length < 5 || values.reason.length > 200) {
    errors.reason = BLOCK_MESSAGES.reason;
  }
  return errors;
}
