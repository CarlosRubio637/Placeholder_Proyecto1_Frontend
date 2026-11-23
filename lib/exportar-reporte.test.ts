import { describe, expect, it } from "vitest";
import { EXPORT_PATH, exportarHref, fallbackFilename, filenameFrom } from "./exportar-reporte";

describe("H36. Exportación de reportes en PDF y CSV", () => {
  it("AC1: arma la URL del route handler con el formato y los filtros de la pantalla", () => {
    expect(exportarHref("morosidad", "pdf", { from: "2025-10-28", to: "2026-10-28" })).toBe(
      "/archivos/admin/reportes/morosidad/exportar?format=pdf&from=2025-10-28&to=2026-10-28",
    );
  });

  it("AC1: participación con una asamblea elegida manda solo la asamblea", () => {
    expect(exportarHref("participacion", "pdf", { assemblyId: "5b1b7e0e-6c1f-4a8e-9a43-0f1d3a2b7c9d" })).toBe(
      "/archivos/admin/reportes/participacion/exportar?format=pdf&assemblyId=5b1b7e0e-6c1f-4a8e-9a43-0f1d3a2b7c9d",
    );
  });

  it("AC1: no manda los filtros vacíos", () => {
    expect(exportarHref("participacion", "csv", { assemblyId: undefined, from: "" })).toBe(
      "/archivos/admin/reportes/participacion/exportar?format=csv",
    );
  });

  it("AC3: lee el nombre del archivo de Content-Disposition", () => {
    expect(filenameFrom('attachment; filename="morosidad_2025-10-28_2026-10-28.pdf"')).toBe(
      "morosidad_2025-10-28_2026-10-28.pdf",
    );
    expect(filenameFrom("attachment; filename=areas_2026-11-01_2026-11-20.csv")).toBe(
      "areas_2026-11-01_2026-11-20.csv",
    );
    expect(filenameFrom(null)).toBeNull();
  });

  it("AC3: sin encabezado usa <reporte>_<desde>_<hasta>.<ext>", () => {
    expect(fallbackFilename("areas", "csv", { from: "2026-11-01", to: "2026-11-20" })).toBe(
      "areas_2026-11-01_2026-11-20.csv",
    );
  });

  it("AC1: el route handler solo reenvía las rutas de exportación de los 4 reportes", () => {
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
