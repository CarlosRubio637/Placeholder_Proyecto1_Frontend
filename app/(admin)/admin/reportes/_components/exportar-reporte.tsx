"use client";

import { useState } from "react";
import {
  EXPORT_ERROR,
  exportarHref,
  fallbackFilename,
  filenameFrom,
  type FiltrosExportacion,
  type FormatoExportacion,
  type ReporteExportable,
} from "@/lib/exportar-reporte";

const buttonClass =
  "rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900";

const FORMATOS: { formato: FormatoExportacion; label: string }[] = [
  { formato: "pdf", label: "Exportar PDF" },
  { formato: "csv", label: "Exportar CSV" },
];

// Mensaje del backend en un 400 (por ejemplo, "El reporte supera 5,000
// filas. Reduce el rango."); si no viene, el genérico de H36.
async function errorMessage(res: Response) {
  if (res.status !== 400) return EXPORT_ERROR;
  const body = (await res.json().catch(() => null)) as { message?: unknown } | null;
  const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
  return typeof message === "string" && message ? message : EXPORT_ERROR;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

type Props = {
  reporte: ReporteExportable;
  /** Los filtros que se muestran en pantalla, con los nombres del backend. */
  filtros: FiltrosExportacion;
};

// Botones Exportar PDF y Exportar CSV de los reportes H32 a H35 (H36).
// Descargan el reporte con los filtros de la pantalla. Mientras se genera,
// el botón dice "Generando…" y los dos quedan deshabilitados.
export function ExportarReporte({ reporte, filtros }: Props) {
  const [generando, setGenerando] = useState<FormatoExportacion | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function exportar(formato: FormatoExportacion) {
    setGenerando(formato);
    setError(null);
    try {
      const res = await fetch(exportarHref(reporte, formato, filtros));
      // Sesión expirada: el route handler redirige a /sesion/expirada y
      // fetch sigue la redirección. Se navega ahí en vez de descargar la página.
      if (res.redirected) {
        window.location.assign(res.url);
        return;
      }
      if (!res.ok) {
        setError(await errorMessage(res));
        return;
      }
      const filename =
        filenameFrom(res.headers.get("Content-Disposition")) ??
        fallbackFilename(reporte, formato, filtros);
      download(await res.blob(), filename);
    } catch {
      setError(EXPORT_ERROR);
    } finally {
      setGenerando(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap gap-3">
        {FORMATOS.map(({ formato, label }) => (
          <button
            key={formato}
            type="button"
            onClick={() => exportar(formato)}
            disabled={generando !== null}
            className={buttonClass}
          >
            {generando === formato ? "Generando…" : label}
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
