// Periodo del reporte de incidencias abiertas (H34). Mismas reglas y mensajes
// que GET /admin/reportes/incidencias, para avisar antes de consultar. Sin
// dependencias del servidor: la usan la página y el formulario (cliente).
//
// El selector de periodo sigue la especificación de H33 (mes actual, últimos
// 3 meses o personalizado); H33 todavía no está hecha, así que vive aquí.

export const REPORTE_INCIDENCIAS_PATH = "/admin/reportes/incidencias";

export const PERIODOS = ["mes", "3meses", "personalizado"] as const;
export type Periodo = (typeof PERIODOS)[number];

export const PERIODO_LABELS: Record<Periodo, string> = {
  mes: "Mes actual",
  "3meses": "Últimos 3 meses",
  personalizado: "Personalizado",
};

export function isPeriodo(value: unknown): value is Periodo {
  return typeof value === "string" && (PERIODOS as readonly string[]).includes(value);
}

export const MAX_RANGE_DAYS = 366;

export const MESSAGES = {
  date: "Ingresa una fecha válida.",
  endBeforeStart: "La fecha final no puede ser anterior a la inicial.",
  rangeTooLong: `El rango máximo es de ${MAX_RANGE_DAYS} días.`,
} as const;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** "AAAA-MM-DD" que existe en el calendario. */
export function isIsoDate(value: string | undefined): value is string {
  if (!value || !DATE_ONLY.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** La misma fecha `months` meses antes; si ese día no existe, el último del mes. */
function monthsBefore(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 - months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

/** Fechas de un periodo predefinido; termina hoy. */
export function presetRange(
  periodo: Exclude<Periodo, "personalizado">,
  today: string,
): { desde: string; hasta: string } {
  if (periodo === "mes") return { desde: `${today.slice(0, 8)}01`, hasta: today };
  return { desde: monthsBefore(today, 3), hasta: today };
}

/** URL del reporte. Las fechas solo se escriben en Personalizado; la página 1 no se escribe. */
export function reporteIncidenciasHref(
  periodo: Periodo,
  desde?: string,
  hasta?: string,
  page = 1,
): string {
  const params = new URLSearchParams();
  if (periodo !== "mes") params.set("periodo", periodo);
  if (periodo === "personalizado") {
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${REPORTE_INCIDENCIAS_PATH}?${query}` : REPORTE_INCIDENCIAS_PATH;
}

export type RangoError = { field: "desde" | "hasta"; message: string };

/** null si el rango es válido. El máximo se mide como diferencia (hasta − desde), igual que H32. */
export function validateRango(desde: string, hasta: string): RangoError | null {
  if (!isIsoDate(desde)) return { field: "desde", message: MESSAGES.date };
  if (!isIsoDate(hasta)) return { field: "hasta", message: MESSAGES.date };
  if (hasta < desde) return { field: "hasta", message: MESSAGES.endBeforeStart };
  const days = (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / DAY_MS;
  if (days > MAX_RANGE_DAYS) return { field: "hasta", message: MESSAGES.rangeTooLong };
  return null;
}
