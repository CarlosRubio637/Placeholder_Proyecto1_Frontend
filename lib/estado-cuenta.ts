// Estado de cuenta (H2) y pago de cuotas (H1): tipos, etiquetas y validación
// de la tarjeta. Sin dependencias del servidor: lo importan también
// componentes de cliente. Las consultas están en lib/estado-cuenta-api.ts.

export type FeeStatus = "PENDIENTE" | "PAGADO" | "MOROSO";
export type PaymentStatus = "APROBADO" | "RECHAZADO";

export const FEE_STATUSES: FeeStatus[] = ["PENDIENTE", "PAGADO", "MOROSO"];

export const FEE_STATUS_LABEL: Record<FeeStatus, string> = {
  PENDIENTE: "Pendiente",
  PAGADO: "Pagado",
  MOROSO: "Moroso",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};

export function isFeeStatus(value: unknown): value is FeeStatus {
  return typeof value === "string" && (FEE_STATUSES as string[]).includes(value);
}

export const STATEMENT_PAGE_SIZE = 12;

export type StatementFee = {
  id: string;
  period: string;
  concept: string;
  amount: number;
  dueDate: string;
  status: FeeStatus;
  paidAt: string | null;
};

export type AccountStatement = {
  unit: { id: string; code: string };
  summary: { pendingBalance: number; overdueCount: number; nextDueDate: string | null };
  years: number[];
  data: StatementFee[];
  total: number;
  page: number;
  pageSize: number;
};

export type FeePayment = {
  id: string;
  transactionNumber: string;
  createdAt: string;
  amount: number;
  cardLast4: string;
  status: PaymentStatus;
  failureReason: string | null;
};

export type FeeDetail = {
  id: string;
  period: string;
  concept: string;
  amount: number;
  dueDate: string;
  status: FeeStatus;
};

export type PaymentReceipt = {
  id: string;
  transactionNumber: string;
  status: PaymentStatus;
  failureReason: string | null;
  amount: number;
  cardLast4: string;
  holderName: string;
  createdAt: string;
  unit: { code: string };
  fee: { id: string; period: string; concept: string; dueDate: string; status: FeeStatus };
};

export type AdminUnit = {
  id: string;
  code: string;
  tower: { id: string; name: string };
  registrationCode: string;
  registrationCodeUpdatedAt: string | null;
  residents: { fullName: string; email: string }[];
};

export const STATEMENT_MESSAGES = {
  emptyUnit: "Tu unidad no tiene cuotas registradas.",
  emptyAdminUnit: "La unidad no tiene cuotas registradas.",
  emptyFilters: "No hay cuotas que coincidan con los filtros.",
  regenerateConfirm:
    "El código actual dejará de funcionar. Las cuentas ya creadas no se afectan. ¿Generar uno nuevo?",
} as const;

export const PAY_MESSAGES = {
  cardNumber: "Ingresa los 16 dígitos de la tarjeta.",
  expiry: "Fecha de vencimiento inválida o vencida (MM/AA).",
  cvv: "Ingresa los 3 dígitos del código de seguridad.",
  holderName: "Ingresa el nombre como aparece en la tarjeta (3 a 60 letras).",
  processing: "Procesando pago…",
  rejected: (reason: string) => `Pago rechazado: ${reason}`,
  alreadyPaid: "Esta cuota ya está pagada.",
  notFound: "La cuota no existe.",
  serverError: "No se pudo procesar el pago. Intenta de nuevo.",
  approved: "Pago aprobado",
} as const;

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "2026-10" → "octubre 2026". */
export function periodLabel(period: string): string {
  const [year, month] = period.split("-").map(Number);
  return `${MONTHS[month - 1] ?? period} ${year}`;
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export const formatMoney = (amount: number) => money.format(amount);

/** "AAAA-MM-DD" → "DD/MM/AAAA". */
export function formatDay(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

const dateTime = new Intl.DateTimeFormat("es-SV", {
  timeZone: "America/El_Salvador",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

// --- Tarjeta (H1) -----------------------------------------------------------

export type CardValues = { cardNumber: string; expiry: string; cvv: string; holderName: string };
export type CardField = keyof CardValues;
export type CardErrors = Partial<Record<CardField, string>>;

export const onlyDigits = (value: string) => value.replace(/\D/g, "");

/** "4242424242424242" → "4242 4242 4242 4242". */
export function groupCardNumber(value: string): string {
  return onlyDigits(value).slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** "MM/AA" → { month, year } si el formato es válido. */
export function parseExpiry(value: string): { month: number; year: number } | null {
  const match = /^(\d{2})\/(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const month = Number(match[1]);
  if (month < 1 || month > 12) return null;
  return { month, year: 2000 + Number(match[2]) };
}

/** `today` es "AAAA-MM-DD" en hora del condominio. */
export function validateCard(values: CardValues, today: string): CardErrors {
  const errors: CardErrors = {};
  if (!/^\d{16}$/.test(values.cardNumber.replace(/\s/g, ""))) {
    errors.cardNumber = PAY_MESSAGES.cardNumber;
  }
  const expiry = parseExpiry(values.expiry);
  const [year, month] = today.split("-").map(Number);
  if (!expiry || expiry.year > 2040 || expiry.year * 12 + expiry.month < year * 12 + month) {
    errors.expiry = PAY_MESSAGES.expiry;
  }
  if (!/^\d{3}$/.test(values.cvv)) {
    errors.cvv = PAY_MESSAGES.cvv;
  }
  if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]{3,60}$/.test(values.holderName.trim().replace(/\s+/g, " "))) {
    errors.holderName = PAY_MESSAGES.holderName;
  }
  return errors;
}
