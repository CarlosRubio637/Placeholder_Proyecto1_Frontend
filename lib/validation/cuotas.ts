import { lastDayOf, periodOptions } from "@/lib/cuotas";

export const LIMITS = {
  minAmount: 1,
  maxAmount: 5000,
  conceptMax: 60,
} as const;

export const MESSAGES = {
  period: "El periodo debe estar entre el mes actual y 3 meses adelante.",
  amount: "El monto debe estar entre $1.00 y $5,000.00.",
  dueDate: "La fecha de vencimiento debe estar dentro del periodo y no puede ser anterior a hoy.",
  concept: "El concepto no puede superar los 60 caracteres.",
  noActiveUnits: "No hay unidades activas para generar cuotas.",
  previewFailed: "No se pudo consultar la vista previa. Intenta de nuevo.",
} as const;

export type GeneracionValues = {
  period: string;
  amount: string;
  dueDate: string;
  concept: string;
};

export type GeneracionField = keyof GeneracionValues;
export type GeneracionErrors = Partial<Record<GeneracionField, string>>;

const AMOUNT_FORMAT = /^\d+(\.\d{1,2})?$/;
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

export function readGeneracionValues(formData: FormData): GeneracionValues {
  const text = (name: GeneracionField) => String(formData.get(name) ?? "").trim();
  return {
    period: text("period"),
    amount: text("amount"),
    dueDate: text("dueDate"),
    concept: text("concept"),
  };
}

export function isValidAmount(amount: string): boolean {
  if (!AMOUNT_FORMAT.test(amount)) return false;
  const value = Number(amount);
  return value >= LIMITS.minAmount && value <= LIMITS.maxAmount;
}

function isValidDueDate(dueDate: string, period: string, today: string): boolean {
  return (
    DATE_FORMAT.test(dueDate) &&
    dueDate.startsWith(`${period}-`) &&
    dueDate <= lastDayOf(period) &&
    dueDate >= today
  );
}

export function validateGeneracion(values: GeneracionValues, today: string): GeneracionErrors {
  const errors: GeneracionErrors = {};
  if (!periodOptions(today).some((option) => option.value === values.period)) {
    errors.period = MESSAGES.period;
  }
  if (!isValidAmount(values.amount)) {
    errors.amount = MESSAGES.amount;
  }
  if (!isValidDueDate(values.dueDate, values.period, today)) {
    errors.dueDate = MESSAGES.dueDate;
  }
  if (values.concept.length > LIMITS.conceptMax) {
    errors.concept = MESSAGES.concept;
  }
  return errors;
}
