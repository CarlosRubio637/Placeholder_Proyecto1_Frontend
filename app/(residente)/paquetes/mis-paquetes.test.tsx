import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MisPaquetesPage from "./page";

const apiFetch = vi.hoisted(() => vi.fn());
const requireRole = vi.hoisted(() => vi.fn());
const router = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
  useRouter: () => router,
  usePathname: () => "/paquetes",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/api", () => ({ apiFetch, requireRole }));

const pendiente = {
  id: "pkg-2",
  code: "PQ-20261119-0001",
  courier: "DHL",
  trackingNumber: "DHL-123456",
  notes: "Caja mediana",
  receivedAt: "2026-11-19T15:00:00Z",
  daysWaiting: 2,
  deliveredAt: null,
  pickedUpByName: null,
  pickedUpByDocLast4: null,
};
const pendienteAnterior = {
  ...pendiente,
  id: "pkg-1",
  code: "PQ-20261118-0003",
  courier: "Amazon",
  trackingNumber: null,
  notes: null,
  receivedAt: "2026-11-18T15:00:00Z",
  daysWaiting: 3,
};
const entregado = {
  id: "pkg-0",
  code: "PQ-20261110-0004",
  courier: "FedEx",
  trackingNumber: null,
  notes: null,
  receivedAt: "2026-11-10T15:00:00Z",
  daysWaiting: 11,
  deliveredAt: "2026-11-11T20:00:00Z", // 14:00 en El Salvador
  pickedUpByName: "Ana López",
  pickedUpByDocLast4: "67-8",
};

type Lista = { pendingCount: number; data: unknown[] };

function apiCon(lista: Lista) {
  apiFetch.mockImplementation(async (path: string) => {
    if (!path.startsWith("paquetes/mios?"))
      throw new Error(`Ruta inesperada: ${path}`);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ...lista,
        total: lista.data.length,
        page: 1,
        pageSize: 10,
      }),
    };
  });
}

async function renderPage(searchParams: Record<string, string> = {}) {
  const ui = await MisPaquetesPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(searchParams),
  } as never);
  return render(ui);
}

function encabezados() {
  return screen.getAllByRole("columnheader").map((th) => th.textContent);
}

function celdas(fila: number) {
  const tr = screen.getAllByRole("row")[fila];
  return Array.from(tr.querySelectorAll("td")).map((td) => td.textContent);
}

describe("H20. Mis paquetes", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    router.refresh.mockReset();
    requireRole.mockResolvedValue({
      id: "res-1",
      role: "RESIDENTE",
      unitId: "unit-a101",
    });
    apiCon({ pendingCount: 2, data: [pendiente, pendienteAnterior] });
  });

  it("AC1: Pendientes muestra código, empresa, guía, recepción, días en portería y observaciones", async () => {
    await renderPage();

    expect(encabezados()).toEqual([
      "Código",
      "Empresa",
      "Guía",
      "Recibido",
      "Días en portería",
      "Observaciones",
    ]);
    const fila = celdas(1);
    expect(fila.slice(0, 3)).toEqual(["PQ-20261119-0001", "DHL", "DHL-123456"]);
    expect(fila[3]).toContain("19/11/2026");
    expect(fila[4]).toBe("2");
    expect(fila[5]).toBe("Caja mediana");
  });

  it("AC1: Entregados agrega la fecha de entrega y quién recogió, sin el documento completo", async () => {
    apiCon({ pendingCount: 0, data: [entregado] });

    await renderPage({ tab: "ENTREGADO" });

    expect(encabezados()).toEqual([
      "Código",
      "Empresa",
      "Guía",
      "Recibido",
      "Entregado",
      "Recogido por",
      "Observaciones",
    ]);
    const fila = celdas(1);
    expect(fila[4]).toContain("11/11/2026");
    expect(fila[4]).toContain("14:00");
    expect(fila[5]).toBe("Ana López (***67-8)");
  });

  it("AC2: pide 10 por página y respeta el orden del servidor (más reciente primero)", async () => {
    await renderPage();

    expect(apiFetch).toHaveBeenCalledWith(
      "paquetes/mios?status=PENDIENTE_ENTREGA&page=1&pageSize=10",
    );
    expect([celdas(1)[0], celdas(2)[0]]).toEqual([
      "PQ-20261119-0001",
      "PQ-20261118-0003",
    ]);
    expect(screen.getByText(/10 por página/)).toBeTruthy();
  });

  it("AC2: la pestaña Pendientes muestra en su título la cantidad de pendientes", async () => {
    await renderPage();

    expect(screen.getByRole("link", { name: "Pendientes (2)" })).toBeTruthy();
  });

  it("AC2: sin pendientes el título queda solo como Pendientes", async () => {
    apiCon({ pendingCount: 0, data: [entregado] });

    await renderPage({ tab: "ENTREGADO" });

    expect(screen.getByRole("link", { name: "Pendientes" })).toBeTruthy();
  });

  it("AC3: cambiar de pestaña consulta los entregados", async () => {
    await renderPage();

    const pendientes = screen.getByRole("link", { name: "Pendientes (2)" });
    const entregados = screen.getByRole("link", { name: "Entregados" });
    expect(pendientes.getAttribute("aria-current")).toBe("page");
    expect(entregados.getAttribute("href")).toBe("/paquetes?tab=ENTREGADO");

    apiCon({ pendingCount: 2, data: [entregado] });
    await renderPage({ tab: "ENTREGADO" });

    expect(apiFetch).toHaveBeenLastCalledWith(
      "paquetes/mios?status=ENTREGADO&page=1&pageSize=10",
    );
  });

  it("AC3: el botón Actualizar vuelve a consultar", async () => {
    await renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));

    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it('AC3: vacío en Pendientes muestra "No tienes paquetes pendientes."', async () => {
    apiCon({ pendingCount: 0, data: [] });

    await renderPage();

    expect(screen.getByText("No tienes paquetes pendientes.")).toBeTruthy();
  });

  it('AC3: vacío en Entregados muestra "Todavía no hay paquetes entregados."', async () => {
    apiCon({ pendingCount: 0, data: [] });

    await renderPage({ tab: "ENTREGADO" });

    expect(
      screen.getByText("Todavía no hay paquetes entregados."),
    ).toBeTruthy();
  });
});
