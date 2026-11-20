import { describe, expect, it } from "vitest";
import { EXPORT_PATH, exportarHref, fallbackFilename, filenameFrom } from "./exportar-reporte";

describe("H36. Exportación de reportes", () => {
  it("arma la URL del route handler con el formato y los filtros de la pantalla", () => {
    expect(exportarHref("morosidad", "pdf", { from: "2025-10-28", to: "2026-10-28" })).toBe(
      "/archivos/admin/reportes/morosidad/exportar?format=pdf&from=2025-10-28&to=2026-10-28",
    );
  });

  it("no manda los filtros vacíos", () => {
    expect(exportarHref("participacion", "csv", { assemblyId: undefined, from: "" })).toBe(
      "/archivos/admin/reportes/participacion/exportar?format=csv",
    );
  });

  it("lee el nombre del archivo de Content-Disposition", () => {
    expect(filenameFrom('attachment; filename="morosidad_2025-10-28_2026-10-28.pdf"')).toBe(
      "morosidad_2025-10-28_2026-10-28.pdf",
    );
    expect(filenameFrom("attachment; filename=areas_2026-11-01_2026-11-20.csv")).toBe(
      "areas_2026-11-01_2026-11-20.csv",
    );
    expect(filenameFrom(null)).toBeNull();
  });

  it("sin encabezado usa <reporte>_<desde>_<hasta>.<ext>", () => {
    expect(fallbackFilename("areas", "csv", { from: "2026-11-01", to: "2026-11-20" })).toBe(
      "areas_2026-11-01_2026-11-20.csv",
    );
  });

  it("el route handler solo reenvía las rutas de exportación de los 4 reportes", () => {
    for (const reporte of ["morosidad", "areas", "incidencias", "participacion"]) {
      expect(EXPORT_PATH.test(`admin/reportes/${reporte}/exportar`)).toBe(true);
    }
    for (const path of [
      "admin/reportes/morosidad",
      "admin/reportes/visitas/exportar",
      "admin/reportes/morosidad/exportar/otra",
      "admin/usuarios",
    ]) {
      expect(EXPORT_PATH.test(path)).toBe(false);
    }
  });
});
