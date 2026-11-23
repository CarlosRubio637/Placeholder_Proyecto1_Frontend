import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REPORTE_AREAS_PATH } from "@/lib/reporte-areas";
import { reportePeriodoHref } from "@/lib/validation/reporte-periodo";
import ReporteAreasPage from "./page";

const apiFetch = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  apiFetch,
  requireRole: vi.fn().mockResolvedValue({ id: "admin-1", role: "ADMINISTRADOR" }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));

// Domingo 22 de noviembre de 2026, 12:00 en El Salvador.
const NOW = new Date("2026-11-22T18:00:00Z");

const area = (areaId: string, name: string, confirmed: number, occupancyPct: number) => ({
  areaId,
  name,
  confirmed,
  cancelled: 1,
  reservedHours: confirmed,
  enabledHours: 264,
  occupancyPct,
});

const REPORT = {
  data: [area("a-1", "Piscina", 5, 1.9), area("a-2", "Asador", 1, 0.8)],
  mostUsed: { areaId: "a-1", name: "Piscina" },
  leastUsed: { areaId: "a-2", name: "Asador" },
};

function respond(body: object) {
  apiFetch.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
}

async function renderPage(searchParams: Record<string, string> = {}) {
  const ui = await ReporteAreasPage({ searchParams: Promise.resolve(searchParams) } as never);
  render(ui);
}

const requested = () => new URL(`http://api/${apiFetch.mock.calls.at(-1)?.[0]}`).searchParams;

describe("H33. Reporte de uso de áreas comunes", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    apiFetch.mockReset();
    push.mockReset();
  });

  afterEach(() => vi.useRealTimers());

  it("AC1: por área muestra confirmadas, canceladas, horas reservadas, horas habilitadas y ocupación", async () => {
    respond(REPORT);
    await renderPage();

    const headers = screen.getAllByRole("columnheader").map((th) => th.textContent?.toLowerCase());
    expect(headers).toEqual(["área", "confirmadas", "canceladas", "horas reservadas", "horas habilitadas", "ocupación"]);
    const [piscina] = screen.getAllByRole("row").slice(1);
    expect(within(piscina).getByRole("rowheader").textContent).toBe("Piscina");
    expect(within(piscina).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      "5",
      "1",
      "5 h",
      "264 h",
      "1.9 %",
    ]);
  });

  it("AC2: por defecto el periodo es el mes actual y las fechas no se editan", async () => {
    respond(REPORT);
    await renderPage();

    expect((screen.getByRole("radio", { name: "Mes actual" }) as HTMLInputElement).checked).toBe(true);
    expect(requested().get("from")).toBe("2026-11-01");
    expect(requested().get("to")).toBe("2026-11-22");
    expect((screen.getByLabelText("Desde") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("Hasta") as HTMLInputElement).disabled).toBe(true);
  });

  it("AC2: se puede elegir los últimos 3 meses", async () => {
    respond(REPORT);
    await renderPage();

    fireEvent.click(screen.getByRole("radio", { name: "Últimos 3 meses" }));

    expect(push).toHaveBeenCalledWith(reportePeriodoHref(REPORTE_AREAS_PATH, "3meses"));
  });

  it("AC2: en Personalizado se editan las fechas, con un máximo de 366 días", async () => {
    respond(REPORT);
    await renderPage({ periodo: "personalizado", desde: "2026-01-01", hasta: "2026-11-22" });

    const desde = screen.getByLabelText("Desde") as HTMLInputElement;
    expect(desde.disabled).toBe(false);
    await act(async () => {
      fireEvent.change(desde, { target: { value: "2025-01-01" } });
    });

    expect(screen.getByRole("alert").textContent).toBe("El rango máximo es de 366 días.");
    expect(push).not.toHaveBeenCalled();
  });

  it("AC3: indica el área más usada y la menos usada del periodo", async () => {
    respond(REPORT);
    await renderPage();

    expect(screen.getByText("Más usada").parentElement?.textContent).toContain("Piscina");
    expect(screen.getByText("Menos usada").parentElement?.textContent).toContain("Asador");
  });

  it("AC3: sin reservas en el periodo muestra el estado vacío", async () => {
    respond({ ...REPORT, mostUsed: null, leastUsed: null });
    await renderPage();

    expect(screen.getByText("No hay reservas en el periodo seleccionado.")).toBeTruthy();
  });

  it("AC4: tiene los botones Exportar PDF y Exportar CSV", async () => {
    respond(REPORT);
    await renderPage();

    expect(screen.getByRole("button", { name: "Exportar PDF" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Exportar CSV" })).toBeTruthy();
  });
});
