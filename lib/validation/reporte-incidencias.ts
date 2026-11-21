// Periodo del reporte de incidencias abiertas (H34). Las reglas y los mensajes
// del selector de periodo son los de todos los reportes (H33) y viven en
// reporte-periodo.ts; aquí solo queda la ruta de este reporte.

import { reportePeriodoHref, type Periodo } from "./reporte-periodo";

export * from "./reporte-periodo";

export const REPORTE_INCIDENCIAS_PATH = "/admin/reportes/incidencias";

/** URL del reporte. Las fechas solo se escriben en Personalizado; la página 1 no se escribe. */
export function reporteIncidenciasHref(
  periodo: Periodo,
  desde?: string,
  hasta?: string,
  page = 1,
): string {
  return reportePeriodoHref(REPORTE_INCIDENCIAS_PATH, periodo, desde, hasta, page);
}
