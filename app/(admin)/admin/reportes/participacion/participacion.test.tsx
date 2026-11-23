import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reporteParticipacionHref } from "@/lib/validation/reporte-participacion";
import ParticipacionPage from "./page";

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
const ASSEMBLY_ID = "5b1b7e0e-6c1f-4a8e-9a43-0f1d3a2b7c9d";

const assembly = (id: string, title: string, status: string, openedAt: string, avg: number) => ({
  assemblyId: id,
  title,
  status,
  openedAt,
  avgParticipationPct: avg,
  topics: [
    { question: "¿Aprueba el presupuesto?", votedUnits: 4, eligibleUnits: 31, participationPct: 12.9 },
    { question: "¿Pintar la fachada?", votedUnits: 2, eligibleUnits: 31, participationPct: 6.5 },
  ],
});

const REPORT = {
  data: [
    assembly("as-2", "Asamblea extraordinaria", "ABIERTA", "2026-11-20T15:00:00Z", 9.7),
    assembly(ASSEMBLY_ID, "Asamblea ordinaria", "CERRADA", "2026-11-05T15:00:00Z", 9.7),
  ],
  total: 2,
  page: 1,
  pageSize: 10,
};

const OPTIONS = {
  ABIERTA: [{ id: "as-2", title: "Asamblea extraordinaria", status: "ABIERTA", startsAt: "2026-11-20T15:00:00Z" }],
  CERRADA: [{ id: ASSEMBLY_ID, title: "Asamblea ordinaria", status: "CERRADA", startsAt: "2026-11-05T15:00:00Z" }],
};

function respond(report: object) {
  apiFetch.mockImplementation((path: string) => {
    const status = /status=(ABIERTA|CERRADA)/.exec(path)?.[1] as keyof typeof OPTIONS | undefined;
    const body = status ? { data: OPTIONS[status] } : report;
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  });
}

async function renderPage(searchParams: Record<string, string> = {}) {
  const ui = await ParticipacionPage({ searchParams: Promise.resolve(searchParams) } as never);
  render(ui);
}

/** La consulta al reporte, sin las de la lista de asambleas. */
const reportQuery = () => {
  const path = apiFetch.mock.calls.map(([p]) => p as string).find((p) => p.startsWith("admin/reportes/participacion"));
  return new URL(`http://api/${path}`).searchParams;
};

describe("H35. Reporte de participación en votaciones", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    apiFetch.mockReset();
    push.mockReset();
  });

  afterEach(() => vi.useRealTimers());

  it("AC1: por tema muestra unidades que votaron, habilitadas y porcentaje, más el promedio por asamblea", async () => {
    respond(REPORT);
    await renderPage();

    const card = screen.getByText("Asamblea ordinaria", { selector: "h2, h3, p, span" }).closest("section, article, div[class*='rounded']") as HTMLElement;
    expect(within(card).getByText("Promedio de participación")).toBeTruthy();
    expect(within(card).getByText("9.7 %")).toBeTruthy();
    const [first] = within(card).getAllByRole("row").slice(1);
    expect([...first.querySelectorAll("th, td")].map((c) => c.textContent)).toEqual([
      "¿Aprueba el presupuesto?",
      "4",
      "31",
      "12.9 %",
    ]);
  });

  it("AC2: por defecto filtra por la apertura de los últimos 12 meses", async () => {
    respond(REPORT);
    await renderPage();

    expect(reportQuery().get("from")).toBe("2025-11-22");
    expect(reportQuery().get("to")).toBe("2026-11-22");
    expect((screen.getByLabelText("Desde") as HTMLInputElement).value).toBe("2025-11-22");
  });

  it("AC2: muestra la apertura más reciente primero, como la ordena el servidor", async () => {
    respond(REPORT);
    await renderPage();

    const titles = screen.getAllByText(/^Asamblea (extraordinaria|ordinaria)$/, { selector: "h2, h3" }).map((h) => h.textContent);
    expect(titles).toEqual(["Asamblea extraordinaria", "Asamblea ordinaria"]);
  });

  it("AC2: al elegir una asamblea filtra por ella y deshabilita las fechas", async () => {
    respond(REPORT);
    await renderPage();

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Asamblea"), { target: { value: ASSEMBLY_ID } });
    });

    expect(push).toHaveBeenCalledWith(
      reporteParticipacionHref({ asamblea: ASSEMBLY_ID, desde: "2025-11-22", hasta: "2026-11-22" }),
    );
    expect((screen.getByLabelText("Desde") as HTMLInputElement).disabled).toBe(true);
  });

  it("AC2: con una asamblea en la URL consulta solo esa asamblea", async () => {
    respond(REPORT);
    await renderPage({ asamblea: ASSEMBLY_ID });

    expect(reportQuery().get("assemblyId")).toBe(ASSEMBLY_ID);
    expect(reportQuery().get("from")).toBeNull();
  });

  it("AC2: sin asambleas en el periodo muestra el estado vacío", async () => {
    respond({ ...REPORT, data: [], total: 0 });
    await renderPage();

    expect(screen.getByText("No hay asambleas en el periodo seleccionado.")).toBeTruthy();
  });

  it("AC3: tiene los botones Exportar PDF y Exportar CSV", async () => {
    respond(REPORT);
    await renderPage();

    expect(screen.getByRole("button", { name: "Exportar PDF" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Exportar CSV" })).toBeTruthy();
  });
});
