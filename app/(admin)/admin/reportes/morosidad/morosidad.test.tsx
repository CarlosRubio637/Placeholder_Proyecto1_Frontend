import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { morosidadHref } from "@/lib/validation/morosidad";
import MorosidadPage from "./page";

const apiFetch = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  apiFetch,
  requireRole: vi.fn().mockResolvedValue({ id: "admin-1", role: "ADMINISTRADOR" }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));

// Domingo 22 de noviembre de 2026, 12:00 en El Salvador.
const NOW = new Date("2026-11-22T18:00:00Z");

const REPORT = {
  summary: { owedAmount: 2250, overdueUnits: 26, overdueActiveUnits: 25, activeUnits: 31, overduePct: 80.6 },
  data: [
    { unitCode: "C-201", owedAmount: 270, ageDays: 165 },
    { unitCode: "A-104", owedAmount: 225, ageDays: 135 },
  ],
  total: 26,
  page: 1,
  pageSize: 20,
};

function respond(body: object) {
  apiFetch.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
}

async function renderPage(searchParams: Record<string, string> = {}) {
  const ui = await MorosidadPage({ searchParams: Promise.resolve(searchParams) } as never);
  render(ui);
}

const requested = () => new URL(`http://api/${apiFetch.mock.calls.at(-1)?.[0]}`).searchParams;

describe("H32. Panel de morosidad", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    apiFetch.mockReset();
    push.mockReset();
    refresh.mockReset();
  });

  afterEach(() => vi.useRealTimers());

  it("AC1: muestra el monto adeudado, las unidades morosas y el porcentaje sobre las activas", async () => {
    respond(REPORT);
    await renderPage();

    expect(screen.getByText("$2,250.00")).toBeTruthy();
    expect(screen.getByText("26")).toBeTruthy();
    expect(screen.getByText("80.6 %")).toBeTruthy();
    expect(screen.getByText("25 de 31 unidades activas")).toBeTruthy();
  });

  it("AC2: la tabla lista código, monto y antigüedad en el orden del servidor (mayor antigüedad primero), 20 por página", async () => {
    respond(REPORT);
    await renderPage();

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent))).toEqual([
      ["C-201", "$270.00", "165"],
      ["A-104", "$225.00", "135"],
    ]);
    expect(requested().get("pageSize")).toBe("20");
    expect(screen.getByText(/20 por página · mayor antigüedad primero · página 1 de 2/)).toBeTruthy();
  });

  it("AC2: pagina con Anterior y Siguiente manteniendo el rango", async () => {
    respond(REPORT);
    await renderPage();

    expect(screen.getByRole("link", { name: "Siguiente" }).getAttribute("href")).toBe(
      morosidadHref("2025-11-22", "2026-11-22", 2),
    );
  });

  it("AC3: por defecto consulta los últimos 12 meses hasta hoy", async () => {
    respond(REPORT);
    await renderPage();

    expect(requested().get("from")).toBe("2025-11-22");
    expect(requested().get("to")).toBe("2026-11-22");
    expect((screen.getByLabelText("Desde") as HTMLInputElement).value).toBe("2025-11-22");
    expect((screen.getByLabelText("Hasta") as HTMLInputElement).value).toBe("2026-11-22");
  });

  it("AC3: al cambiar a un rango válido vuelve a consultar con ese rango", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(NOW);
    respond(REPORT);
    await renderPage();

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-01-01" } });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(push).toHaveBeenCalledWith(morosidadHref("2026-01-01", "2026-11-22"));
  });

  it("AC3: sin unidades morosas muestra el estado vacío", async () => {
    respond({ ...REPORT, data: [], total: 0 });
    await renderPage();

    expect(screen.getByText("No hay unidades morosas en el rango seleccionado.")).toBeTruthy();
  });

  it("AC4: tiene Exportar PDF, Exportar CSV y Actualizar, que vuelve a consultar", async () => {
    respond(REPORT);
    await renderPage();

    expect(screen.getByRole("button", { name: "Exportar PDF" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Exportar CSV" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));
    expect(refresh).toHaveBeenCalled();
  });
});
