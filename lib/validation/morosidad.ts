// Validación del rango del panel de morosidad (H32). Mismas reglas y
// mensajes que GET /admin/reportes/morosidad, para avisar antes de consultar.
// Sin dependencias del servidor: la usan la página y el formulario (cliente).

export const MOROSIDAD_PATH = "/admin/reportes/morosidad";

/** URL del panel con el rango y la página (la 1 no se escribe). */
export function morosidadHref(desde: string, hasta: string, page = 1): string {
  const params = new URLSearchParams({ desde, hasta });
  if (page > 1) params.set("page", String(page));
  return `${MOROSIDAD_PATH}?${params}`;
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

export type RangoError = { field: "desde" | "hasta"; message: string };

/** null si el rango es válido. El máximo se mide como diferencia (hasta − desde). */
export function validateRango(desde: string, hasta: string): RangoError | null {
  if (!isIsoDate(desde)) return { field: "desde", message: MESSAGES.date };
  if (!isIsoDate(hasta)) return { field: "hasta", message: MESSAGES.date };
  if (hasta < desde) return { field: "hasta", message: MESSAGES.endBeforeStart };
  const days = (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / DAY_MS;
  if (days > MAX_RANGE_DAYS) return { field: "hasta", message: MESSAGES.rangeTooLong };
  return null;
}
