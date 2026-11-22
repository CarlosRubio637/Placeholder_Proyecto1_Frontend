import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountStatement, AdminUnit, StatementFee } from "@/lib/estado-cuenta";
import UnidadAdminPage from "@/app/(admin)/admin/unidades/[unitId]/page";
import EstadoDeCuentaPage from "./page";

const apiFetch = vi.hoisted(() => vi.fn());
const fetchMyStatement = vi.hoisted(() => vi.fn());
const fetchUnitStatement = vi.hoisted(() => vi.fn());
const fetchAdminUnit = vi.hoisted(() => vi.fn());
const cargarPagosCuota = vi.hoisted(() => vi.fn());
const regenerarCodigo = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());
const search = vi.hoisted(() => ({ value: "" }));

vi.mock("@/lib/api", () => ({
  apiFetch,
  requireRole: vi.fn(async (role: string) => ({ id: "u1", role, unit: { code: "A-101" } })),
}));
vi.mock("@/lib/estado-cuenta-api", () => ({ fetchMyStatement, fetchUnitStatement, fetchAdminUnit }));
vi.mock("@/lib/paquetes", () => ({
  getTorres: vi.fn(async () => [{ id: "t-a", name: "Torre A" }]),
  getUnidades: vi.fn(async () => [{ id: "unit-1", code: "A-101" }]),
}));
vi.mock("@/app/actions/pagos", () => ({ cargarPagosCuota, regenerarCodigo }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
  useRouter: () => ({ push, refresh }),
  usePathname: () => "/estado-de-cuenta",
  useSearchParams: () => new URLSearchParams(search.value),
}));

const fee = (id: string, period: string, status: StatementFee["status"]): StatementFee => ({
  id,
  period,
  concept: "Cuota de mantenimiento",
  amount: 45,
  dueDate: `${period}-30`,
  status,
  paidAt: null,
});

const STATEMENT: AccountStatement = {
  unit: { id: "unit-1", code: "A-101" },
  summary: { pendingBalance: 90, overdueCount: 1, nextDueDate: "2026-12-30" },
  years: [2026, 2025],
  data: [fee("f-12", "2026-12", "PENDIENTE"), fee("f-11", "2026-11", "MOROSO"), fee("f-10", "2026-10", "PAGADO")],
  total: 13,
  page: 1,
  pageSize: 12,
};

const UNIT: AdminUnit = {
  id: "unit-1",
  code: "A-101",
  tower: { id: "t-a", name: "Torre A" },
  registrationCode: "ABCD2345",
  registrationCodeUpdatedAt: null,
  residents: [{ fullName: "Ana Lopez", email: "ana@condominio.test" }],
};

async function renderResident(query: Record<string, string> = {}, statement = STATEMENT) {
  fetchMyStatement.mockResolvedValue(statement);
  const page = await EstadoDeCuentaPage({
    searchParams: Promise.resolve(query),
  } as PageProps<"/estado-de-cuenta">);
  render(page);
}

async function renderAdmin() {
  fetchAdminUnit.mockResolvedValue(UNIT);
  fetchUnitStatement.mockResolvedValue(STATEMENT);
  const page = await UnidadAdminPage({
    params: Promise.resolve({ unitId: "unit-1" }),
    searchParams: Promise.resolve({}),
  } as PageProps<"/admin/unidades/[unitId]">);
  render(page);
}

function rows() {
  return screen.getAllByRole("row").slice(1);
}

describe("H2. Estado de cuenta de la unidad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    search.value = "";
  });

  it("AC1: el encabezado muestra unidad, saldo pendiente, cuotas morosas y próximo vencimiento", async () => {
    await renderResident();

    const summary = screen.getByText("Saldo pendiente").closest("dl") as HTMLElement;
    expect(within(summary).getByText("A-101")).toBeTruthy();
    expect(within(summary).getByText("$90.00")).toBeTruthy();
    expect(within(summary).getByText("1")).toBeTruthy();
    expect(within(summary).getByText("30/12/2026")).toBeTruthy();
  });

  it("AC2: la tabla muestra periodo, concepto, monto, vencimiento y estado, en el orden del servidor (más reciente primero)", async () => {
    await renderResident();

    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers.slice(0, 5)).toEqual(["Periodo", "Concepto", "Monto", "Vencimiento", "Estado"]);
    expect(rows().map((r) => within(r).getAllByRole("cell")[0].textContent)).toEqual([
      "diciembre 2026",
      "noviembre 2026",
      "octubre 2026",
    ]);
    expect(within(rows()[0]).getByText("$45.00")).toBeTruthy();
    expect(within(rows()[0]).getByText("30/12/2026")).toBeTruthy();
  });

  it("AC2: Pendiente y Moroso tienen Pagar hacia /cuotas/:id/pagar; Pagado no", async () => {
    await renderResident();

    const [pendiente, moroso, pagado] = rows();
    expect(within(pendiente).getByRole("link", { name: "Pagar" }).getAttribute("href")).toBe("/cuotas/f-12/pagar");
    expect(within(moroso).getByRole("link", { name: "Pagar" }).getAttribute("href")).toBe("/cuotas/f-11/pagar");
    expect(within(pagado).queryByRole("link", { name: "Pagar" })).toBeNull();
  });

  it("AC2: pagina de 12 en 12 y empieza en la página 1", async () => {
    await renderResident();

    expect(fetchMyStatement).toHaveBeenCalledWith({ year: undefined, status: undefined, page: 1 });
    expect(screen.getByText(/13 cuotas · página 1 de 2/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Siguiente" }).getAttribute("href")).toBe("/estado-de-cuenta?page=2");

    const real = await vi.importActual<typeof import("@/lib/estado-cuenta-api")>("@/lib/estado-cuenta-api");
    apiFetch.mockResolvedValue({ ok: true, json: async () => STATEMENT });
    await real.fetchMyStatement({ page: 1 });
    expect(apiFetch).toHaveBeenCalledWith("estado-cuenta?page=1&pageSize=12");
  });

  it("AC3: filtra por año (años con cuotas) y estado, con Todos por defecto", async () => {
    await renderResident();

    const year = screen.getByLabelText("Año") as HTMLSelectElement;
    const status = screen.getByLabelText("Estado") as HTMLSelectElement;
    expect(within(year).getAllByRole("option").map((o) => o.textContent)).toEqual(["Todos", "2026", "2025"]);
    expect(within(status).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Todos",
      "Pendiente",
      "Pagado",
      "Moroso",
    ]);
    expect(year.value).toBe("");
    expect(status.value).toBe("");
  });

  it("AC3: al cambiar un filtro vuelve a la página 1", async () => {
    search.value = "anio=2025&page=2";
    await renderResident({ anio: "2025", page: "2" });

    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "MOROSO" } });

    expect(push).toHaveBeenCalledWith("/estado-de-cuenta?anio=2025&estado=MOROSO");
  });

  it("AC3: los filtros de la URL llegan a la consulta", async () => {
    await renderResident({ anio: "2025", estado: "PAGADO" });

    expect(fetchMyStatement).toHaveBeenCalledWith({ year: 2025, status: "PAGADO", page: 1 });
  });

  it("AC4: al expandir una cuota se ven sus pagos y solo los Aprobados tienen \"Ver recibo\"", async () => {
    cargarPagosCuota.mockResolvedValue({
      data: [
        { id: "p-2", transactionNumber: "TX-20261122-000002", createdAt: "2026-11-22T18:00:00Z", amount: 45, cardLast4: "4242", status: "APROBADO", failureReason: null },
        { id: "p-1", transactionNumber: "TX-20261122-000001", createdAt: "2026-11-22T17:00:00Z", amount: 45, cardLast4: "0002", status: "RECHAZADO", failureReason: "Fondos insuficientes" },
      ],
    });
    await renderResident();

    await act(async () => {
      fireEvent.click(within(rows()[0]).getByRole("button", { name: "Ver pagos" }));
    });

    expect(cargarPagosCuota).toHaveBeenCalledWith("f-12");
    const detail = document.getElementById("pagos-f-12") as HTMLElement;
    for (const header of ["Fecha y hora", "Transacción", "Monto", "Tarjeta", "Estado", "Motivo"]) {
      expect(within(detail).getByText(header)).toBeTruthy();
    }
    expect(within(detail).getByText("•••• 4242")).toBeTruthy();
    expect(within(detail).getByText("Aprobado")).toBeTruthy();
    expect(within(detail).getByText("Rechazado")).toBeTruthy();
    expect(within(detail).getByText("Fondos insuficientes")).toBeTruthy();
    const links = within(detail).getAllByRole("link", { name: "Ver recibo" });
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("/pagos/p-2/recibo");
  });

  it("AC5: sin cuotas muestra \"Tu unidad no tiene cuotas registradas.\"", async () => {
    await renderResident({}, { ...STATEMENT, data: [], total: 0, years: [] });

    expect(screen.getByText("Tu unidad no tiene cuotas registradas.")).toBeTruthy();
  });

  it("AC5: con filtros sin resultados muestra \"No hay cuotas que coincidan con los filtros.\"", async () => {
    await renderResident({ estado: "MOROSO" }, { ...STATEMENT, data: [], total: 0 });

    expect(screen.getByText("No hay cuotas que coincidan con los filtros.")).toBeTruthy();
  });

  it("AC6: el administrador ve torre y unidad, el estado de cuenta sin Pagar, el código y los residentes", async () => {
    await renderAdmin();

    expect(screen.getByRole("group", { name: "Torre" })).toBeTruthy();
    expect(within(screen.getByRole("group", { name: "Unidad" })).getByRole("link", { name: "A-101" })).toBeTruthy();
    expect(screen.getByText("ABCD2345")).toBeTruthy();
    expect(screen.getByText("Residentes registrados (1 de 4)")).toBeTruthy();
    expect(screen.getByText("Ana Lopez")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Pagar" })).toBeNull();
    expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
  });

  it("AC6: Regenerar pide confirmación; si se cancela no hace nada", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await renderAdmin();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Regenerar código" }));
    });

    expect(confirm).toHaveBeenCalledWith(
      "El código actual dejará de funcionar. Las cuentas ya creadas no se afectan. ¿Generar uno nuevo?",
    );
    expect(regenerarCodigo).not.toHaveBeenCalled();
  });

  it("AC6: al confirmar muestra el código nuevo con el botón Copiar", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    regenerarCodigo.mockResolvedValue({ code: "QRST6789" });
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await renderAdmin();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Regenerar código" }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copiar" }));
    });

    expect(screen.getByText("QRST6789")).toBeTruthy();
    expect(screen.queryByText("ABCD2345")).toBeNull();
    expect(writeText).toHaveBeenCalledWith("QRST6789");
    expect(screen.getByRole("button", { name: "Copiado" })).toBeTruthy();
  });
});
