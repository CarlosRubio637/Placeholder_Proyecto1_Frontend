// Exportación de los reportes H32 a H35 a PDF o CSV (H36).

export const REPORTES_EXPORTABLES = ["morosidad", "areas", "incidencias", "participacion"] as const;
export type ReporteExportable = (typeof REPORTES_EXPORTABLES)[number];

export type FormatoExportacion = "pdf" | "csv";

export const EXPORT_ERROR = "No se pudo generar el archivo. Intenta de nuevo.";

// Ruta del backend que el route handler de /archivos permite reenviar.
export const EXPORT_PATH = /^admin\/reportes\/(morosidad|areas|incidencias|participacion)\/exportar$/;

// Filtros del reporte con los nombres del backend (from, to, assemblyId…).
// Los vacíos no viajan.
export type FiltrosExportacion = Record<string, string | undefined>;

// URL del route handler que descarga el archivo con el token de la sesión:
// /archivos/admin/reportes/<reporte>/exportar?format=pdf&from=…&to=…
export function exportarHref(
  reporte: ReporteExportable,
  formato: FormatoExportacion,
  filtros: FiltrosExportacion,
) {
  const params = new URLSearchParams({ format: formato });
  for (const [key, value] of Object.entries(filtros)) {
    if (value) params.set(key, value);
  }
  return `/archivos/admin/reportes/${reporte}/exportar?${params}`;
}

// Nombre del archivo según `Content-Disposition: attachment; filename="…"`.
export function filenameFrom(disposition: string | null): string | null {
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  return match ? match[1] : null;
}

// Nombre de respaldo si el encabezado no llega: <reporte>_<desde>_<hasta>.<ext>.
export function fallbackFilename(
  reporte: ReporteExportable,
  formato: FormatoExportacion,
  filtros: FiltrosExportacion,
) {
  const partes = [reporte, filtros.from, filtros.to].filter(Boolean);
  return `${partes.join("_")}.${formato}`;
}
