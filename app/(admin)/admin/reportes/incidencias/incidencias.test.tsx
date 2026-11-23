import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatPromedio } from "@/lib/reporte-incidencias";
import { REPORTE_INCIDENCIAS_PATH } from "@/lib/validation/reporte-incidencias";
import { reportePeriodoHref } from "@/lib/validation/reporte-periodo";
import ReporteIncidenciasPage from "./page";

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

const cell = (status: string, priority: string, count: number) => ({ status, priority, count });

const REPORT = {
  matrix: [
    cell("PENDIENTE", "ALTA", 1),
    cell("PENDIENTE", "MEDIA", 2),
    cell("PENDIENTE", "BAJA", 0),
    cell("EN_PROCESO", "ALTA", 0),
    cell("EN_PROCESO", "MEDIA", 1),
    cell("EN_PROCESO", "BAJA", 0),
    cell("RESUELTO", "ALTA", 0),
    cell("RESUELTO", "MEDIA", 0),
    cell("RESUELTO", "BAJA", 2),
  ],
  openTotal: 4,
  avgResolutionDays: 3.4,
  stale: {
    data: [
      { number: "INC-2026-00001", title: "Fuga en el lobby", unitCode: "A-101", status: "PENDIENTE", priority: "ALTA", assignee: "Miguel Torres", daysOpen: 24 },
      { number: "INC-2026-00003", title: "Portón dañado", unitCode: "A-102", status: "EN_PROCESO", priority: "MEDIA", assignee: null, daysOpen: 11 },
    ],
    total: 2,
    page: 1,
    pageSize: 20,
  },
};

function respond(body: object) {
  apiFetch.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
}

async function renderPage(searchParams: Record<string, string> = {}) {
  const ui = await ReporteIncidenciasPage({ searchParams: Promise.resolve(searchParams) } as never);
  render(ui);
}

const requested = () => new URL(`http://api/${apiFetch.mock.calls.at(-1)?.[0]}`).searchParams;

describe("H34. Reporte de incidencias abiertas", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    apiFetch.mockReset();
    push.mockReset();
  });

  afterEach(() => vi.useRealTimers());

  it("AC1: la tabla cruza estado y prioridad, con totales, y muestra el total de abiertas", async () => {
    respond(REPORT);
    await renderPage();

    const table = screen.getAllByRole("table")[0];
    const row = (name: string) =>
      within(within(table).getByRole("rowheader", { name }).closest("tr") as HTMLElement)
        .getAllByRole("cell")
        .map((td) => td.textContent);
    expect(row("Pendiente")).toEqual(["1", "2", "0", "3"]);
    expect(row("En proceso")).toEqual(["0", "1", "0", "1"]);
    expect(row("Resuelto")).toEqual(["0", "0", "2", "2"]);
    expect(row("Total")).toEqual(["1", "3", "2", "6"]);
    expect(screen.getByText("Abiertas").nextElementSibling?.textContent).toBe("4");
  });

  it("AC2: muestra el tiempo promedio de resolución en días con un decimal", async () => {
    respond(REPORT);
    await renderPage();

    expect(screen.getByText(formatPromedio(3.4))).toBeTruthy();
    expect(formatPromedio(3.4)).toContain("3.4");
  });

  it('AC2: sin resueltas en el periodo el promedio dice "Sin datos"', async () => {
    respond({ ...REPORT, avgResolutionDays: null });
    await renderPage();

    expect(screen.getByText("Sin datos")).toBeTruthy();
  });

  it("AC3: lista las abiertas con más de 7 días con número, título, unidad, estado, prioridad, responsable y días", async () => {
    respond(REPORT);
    await renderPage();

    const table = screen.getAllByRole("table")[1];
    const rows = within(table).getAllByRole("row").slice(1);
    expect(within(rows[0]).getAllByRole("cell").map((td) => td.textContent)).toEqual([
      "INC-2026-00001",
      "Fuga en el lobby",
      "A-101",
      "Pendiente",
      "Alta",
      "Miguel Torres",
      "24",
    ]);
    expect(within(rows[1]).getByText("Sin asignar")).toBeTruthy();
  });

  it("AC3: sin abiertas de más de 7 días muestra el estado vacío", async () => {
    respond({ ...REPORT, stale: { ...REPORT.stale, data: [], total: 0 } });
    await renderPage();

    expect(screen.getByText("No hay incidencias abiertas con más de 7 días.")).toBeTruthy();
  });

  it("AC4: el periodo se elige como en H33, con el mes actual por defecto", async () => {
    respond(REPORT);
    await renderPage();

    expect((screen.getByRole("radio", { name: "Mes actual" }) as HTMLInputElement).checked).toBe(true);
    expect(requested().get("from")).toBe("2026-11-01");
    expect(requested().get("to")).toBe("2026-11-22");
    fireEvent.click(screen.getByRole("radio", { name: "Últimos 3 meses" }));
    expect(push).toHaveBeenCalledWith(reportePeriodoHref(REPORTE_INCIDENCIAS_PATH, "3meses"));
  });

  it("AC4: tiene los botones Exportar PDF y Exportar CSV", async () => {
    respond(REPORT);
    await renderPage();

    expect(screen.getByRole("button", { name: "Exportar PDF" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Exportar CSV" })).toBeTruthy();
  });
});
