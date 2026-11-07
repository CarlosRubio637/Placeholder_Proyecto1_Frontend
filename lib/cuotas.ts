export type FeeGeneration = {
  id: string;
  period: string;
  amount: number;
  dueDate: string;
  concept: string;
  createdCount: number;
  skippedCount: number;
  createdAt: string;
  createdBy: { id: string; name: string };
};

export type FeeGenerationsPage = {
  data: FeeGeneration[];
  total: number;
  page: number;
  pageSize: number;
};

export type FeeGenerationPreview = {
  activeUnits: number;
  alreadyGenerated: number;
  toCreate: number;
};

const SV_TIME_ZONE = "America/El_Salvador";
const MONTHS_AHEAD = 3;
const DEFAULT_DUE_DAY = "10";

const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

const todayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SV_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-SV", {
  timeZone: SV_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

function parsePeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  return { year, month };
}

export function todayInElSalvador(now: Date = new Date()): string {
  return todayFormatter.format(now);
}

export function addMonths(period: string, months: number): string {
  const { year, month } = parsePeriod(period);
  const monthIndex = year * 12 + month - 1 + months;
  const nextMonth = (monthIndex % 12) + 1;
  return `${Math.floor(monthIndex / 12)}-${String(nextMonth).padStart(2, "0")}`;
}

export function periodLabel(period: string): string {
  const { year, month } = parsePeriod(period);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function periodOptions(today: string): { value: string; label: string }[] {
  const currentPeriod = today.slice(0, 7);
  return Array.from({ length: MONTHS_AHEAD + 1 }, (_, offset) => {
    const value = addMonths(currentPeriod, offset);
    return { value, label: periodLabel(value) };
  });
}

export function defaultConcept(period: string): string {
  return `Cuota de mantenimiento ${periodLabel(period)}`;
}

export function lastDayOf(period: string): string {
  const { year, month } = parsePeriod(period);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${period}-${String(lastDay).padStart(2, "0")}`;
}

export function defaultDueDate(period: string, today: string): string {
  const tenth = `${period}-${DEFAULT_DUE_DAY}`;
  return today.startsWith(period) && today > tenth ? today : tenth;
}

export function formatMoney(amount: number): string {
  return moneyFormatter.format(amount);
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

export function confirmationQuestion(amount: number, units: number, period: string): string {
  return `Se generarán cuotas de ${formatMoney(amount)} para ${units} unidades del periodo ${periodLabel(period)}. ¿Continuar?`;
}

export function successMessage(created: number, skipped: number): string {
  return `Se generaron ${created} cuotas. ${skipped} unidades ya tenían cuota de este periodo.`;
}

export function periodCompleteMessage(period: string): string {
  return `Las cuotas del periodo ${periodLabel(period)} ya fueron generadas para todas las unidades.`;
}
