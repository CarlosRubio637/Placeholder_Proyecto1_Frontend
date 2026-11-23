import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExportarReporte } from "./exportar-reporte";

const FILTROS = { from: "2025-10-28", to: "2026-10-28" };

function button(name: string) {
  return screen.getByRole("button", { name }) as HTMLButtonElement;
}

function fileResponse(disposition: string | null) {
  const headers = new Headers({ "Content-Type": "application/pdf" });
  if (disposition) headers.set("Content-Disposition", disposition);
  // Cuerpo como texto: el Response de Node 22 no sabe leer el Blob de jsdom.
  return new Response("%PDF-", { status: 200, headers });
}

describe("H36. Exportación de reportes en PDF y CSV", () => {
  const fetchMock = vi.fn();
  const clicks: { href: string; download: string }[] = [];

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    URL.createObjectURL = vi.fn(() => "blob:archivo");
    URL.revokeObjectURL = vi.fn();
    clicks.length = 0;
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicks.push({ href: this.href, download: this.download });
    });
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("AC1: descarga el reporte con los filtros de la pantalla", async () => {
    fetchMock.mockResolvedValue(
      fileResponse('attachment; filename="morosidad_2025-10-28_2026-10-28.pdf"'),
    );
    render(<ExportarReporte reporte="morosidad" filtros={FILTROS} />);

    await act(async () => fireEvent.click(button("Exportar PDF")));

    expect(fetchMock).toHaveBeenCalledWith(
      "/archivos/admin/reportes/morosidad/exportar?format=pdf&from=2025-10-28&to=2026-10-28",
    );
    expect(clicks).toEqual([
      { href: "blob:archivo", download: "morosidad_2025-10-28_2026-10-28.pdf" },
    ]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:archivo");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each([
    ["morosidad", { from: "2025-11-22", to: "2026-11-22" }, "from=2025-11-22&to=2026-11-22"],
    ["areas", { from: "2026-11-01", to: "2026-11-22" }, "from=2026-11-01&to=2026-11-22"],
    ["incidencias", { from: "2026-11-01", to: "2026-11-22" }, "from=2026-11-01&to=2026-11-22"],
    ["participacion", { assemblyId: "as-1" }, "assemblyId=as-1"],
  ] as const)("AC1: el reporte de %s exporta a PDF con sus filtros", async (reporte, filtros, query) => {
    fetchMock.mockResolvedValue(fileResponse(null));
    render(<ExportarReporte reporte={reporte} filtros={filtros} />);

    await act(async () => fireEvent.click(button("Exportar PDF")));

    expect(fetchMock).toHaveBeenCalledWith(`/archivos/admin/reportes/${reporte}/exportar?format=pdf&${query}`);
  });

  it("AC3: guarda el archivo con el nombre que manda el servidor", async () => {
    fetchMock.mockResolvedValue(fileResponse('attachment; filename="morosidad_2025-10-28_2026-10-28.csv"'));
    render(<ExportarReporte reporte="morosidad" filtros={FILTROS} />);

    await act(async () => fireEvent.click(button("Exportar CSV")));

    expect(clicks[0].download).toBe("morosidad_2025-10-28_2026-10-28.csv");
  });

  it("AC3: sin Content-Disposition usa <reporte>_<desde>_<hasta>.<ext>", async () => {
    fetchMock.mockResolvedValue(fileResponse(null));
    render(<ExportarReporte reporte="areas" filtros={FILTROS} />);

    await act(async () => fireEvent.click(button("Exportar CSV")));

    expect(clicks[0].download).toBe("areas_2025-10-28_2026-10-28.csv");
  });

  it("AC2: mientras genera, el botón dice Generando… y los dos se deshabilitan", async () => {
    let resolve!: (res: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
    render(<ExportarReporte reporte="incidencias" filtros={FILTROS} />);

    await act(async () => fireEvent.click(button("Exportar CSV")));

    expect(button("Generando…").disabled).toBe(true);
    expect(button("Exportar PDF").disabled).toBe(true);

    await act(async () => resolve(fileResponse(null)));

    expect(button("Exportar CSV").disabled).toBe(false);
    expect(button("Exportar PDF").disabled).toBe(false);
  });

  it("AC2: si falla muestra «No se pudo generar el archivo. Intenta de nuevo.» y vuelve a habilitar los botones", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 502 }));
    render(<ExportarReporte reporte="morosidad" filtros={FILTROS} />);

    await act(async () => fireEvent.click(button("Exportar PDF")));

    expect(screen.getByRole("alert").textContent).toBe(
      "No se pudo generar el archivo. Intenta de nuevo.",
    );
    expect(button("Exportar PDF").disabled).toBe(false);
    expect(clicks).toEqual([]);
  });

  it("AC2: con un error de red también muestra el mensaje de error", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<ExportarReporte reporte="morosidad" filtros={FILTROS} />);

    await act(async () => fireEvent.click(button("Exportar CSV")));

    expect(screen.getByRole("alert").textContent).toBe(
      "No se pudo generar el archivo. Intenta de nuevo.",
    );
  });

  it("AC2: un 400 muestra el mensaje del servidor (más de 5,000 filas)", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { message: ["El reporte supera 5,000 filas. Reduce el rango."], field: "to" },
        { status: 400 },
      ),
    );
    render(<ExportarReporte reporte="incidencias" filtros={FILTROS} />);

    await act(async () => fireEvent.click(button("Exportar CSV")));

    expect(screen.getByRole("alert").textContent).toBe(
      "El reporte supera 5,000 filas. Reduce el rango.",
    );
  });
});
