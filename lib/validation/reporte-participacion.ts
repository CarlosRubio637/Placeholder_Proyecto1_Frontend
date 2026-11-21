// Filtros del reporte de participación en votaciones (H35). Las reglas del
// rango (fechas válidas, fin no anterior al inicio, máximo 366 días) son las
// de todos los reportes (reporte-periodo.ts). Sin dependencias del servidor:
// la usan la página y el formulario (cliente).

import { isIsoDate, monthsBefore } from "./reporte-periodo";

export const REPORTE_PARTICIPACION_PATH = "/admin/reportes/participacion";

/** Sin fechas, el periodo de apertura va de hoy − 12 meses a hoy. */
export const DEFAULT_MONTHS = 12;

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type FiltrosParticipacion = {
  /** Una sola asamblea; si viene, el backend no aplica las fechas. */
  asamblea: string | null;
  desde: string;
  hasta: string;
};

/** Periodo por defecto: de hoy − 12 meses a hoy. */
export function defaultRange(today: string): { desde: string; hasta: string } {
  return { desde: monthsBefore(today, DEFAULT_MONTHS), hasta: today };
}

/**
 * Filtros efectivos a partir de la URL (?asamblea&desde&hasta). Una asamblea
 * que no es uuid se ignora; una fecha que no es fecha usa la de por defecto.
 */
export function resolveFiltros(
  params: { asamblea?: string; desde?: string; hasta?: string },
  today: string,
): FiltrosParticipacion {
  const fallback = defaultRange(today);
  return {
    asamblea: params.asamblea && UUID_REGEX.test(params.asamblea) ? params.asamblea : null,
    desde: isIsoDate(params.desde) ? params.desde : fallback.desde,
    hasta: isIsoDate(params.hasta) ? params.hasta : fallback.hasta,
  };
}

/**
 * URL del reporte. Con una asamblea solo se escribe la asamblea (las fechas
 * no aplican); sin ella, las fechas. La página 1 no se escribe.
 */
export function reporteParticipacionHref(filtros: FiltrosParticipacion, page = 1): string {
  const params = new URLSearchParams();
  if (filtros.asamblea) {
    params.set("asamblea", filtros.asamblea);
  } else {
    params.set("desde", filtros.desde);
    params.set("hasta", filtros.hasta);
  }
  if (page > 1) params.set("page", String(page));
  return `${REPORTE_PARTICIPACION_PATH}?${params}`;
}
