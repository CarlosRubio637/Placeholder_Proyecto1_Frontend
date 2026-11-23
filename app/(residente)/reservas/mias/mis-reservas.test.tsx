import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MyReservation } from "@/lib/reservas";
import MisReservasPage from "./page";

const apiFetch = vi.hoisted(() => vi.fn());
const fetchMyReservations = vi.hoisted(() => vi.fn());
// Solo registra a dónde redirige (el redirect real corta la acción lanzando un error).
const redirect = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  apiFetch,
  requireRole: vi.fn(async () => ({ id: "u1", role: "RESIDENTE", unit: { code: "A-101" } })),
}));
vi.mock("@/lib/reservas-api", () => ({ fetchMyReservations }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect, unstable_rethrow: vi.fn() }));

const reservation = (overrides: Partial<MyReservation> = {}): MyReservation => ({
  id: "res-1",
  code: "RS-20261120-0001",
  area: { id: "area-1", name: "Piscina" },
  date: "2026-11-25",
  startTime: "10:00",
  endTime: "11:00",
  attendees: 4,
  status: "CONFIRMADA",
  reservedBy: "Ana Lopez",
  canCancel: true,
  ...overrides,
});

function json(status: number, body: unknown) {
  return { status, ok: status < 300, json: async () => body } as Response;
}

async function renderPage(query: Record<string, string> = {}, data: MyReservation[] = [reservation()], total = data.length) {
  fetchMyReservations.mockResolvedValue({ data, total });
  const page = await MisReservasPage({
    searchParams: Promise.resolve(query),
  } as PageProps<"/reservas/mias">);
  render(page);
}

function rows() {
  return screen.getAllByRole("row").slice(1);
}

describe("H8. Mis reservas y cancelación", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AC1: tiene las pestañas Próximas (por defecto) e Historial", async () => {
    await renderPage();

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["Próximas", "Historial"]);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(tabs[1].getAttribute("href")).toBe("/reservas/mias?tab=historial");
    expect(fetchMyReservations).toHaveBeenCalledWith({ tab: "proximas", page: 1 });
  });

  it("AC1: muestra número, área, fecha, franja, personas, estado y residente, en el orden del servidor", async () => {
    await renderPage({}, [reservation(), reservation({ id: "res-2", code: "RS-20261120-0002", date: "2026-11-28" })]);

    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers.slice(0, 7)).toEqual(["Número", "Área", "Fecha", "Franja", "Personas", "Estado", "Reservó"]);
    const cells = within(rows()[0]).getAllByRole("cell").map((c) => c.textContent);
    expect(cells.slice(0, 7)).toEqual(["RS-20261120-0001", "Piscina", "25/11/2026", "10:00 a 11:00", "4", "Confirmada", "Ana Lopez"]);
    expect(within(rows()[1]).getByText("RS-20261120-0002")).toBeTruthy();
  });

  it("AC1: la pestaña Historial pide sus reservas y pagina de 10 en 10", async () => {
    await renderPage({ tab: "historial", page: "2" }, [reservation({ status: "CANCELADA", canCancel: false })], 15);

    expect(fetchMyReservations).toHaveBeenCalledWith({ tab: "historial", page: 2 });
    expect(screen.getByText(/15 reservas · página 2 de 2/)).toBeTruthy();

    const real = await vi.importActual<typeof import("@/lib/reservas-api")>("@/lib/reservas-api");
    apiFetch.mockResolvedValue(json(200, { data: [], total: 0 }));
    await real.fetchMyReservations({ tab: "historial", page: 1 });
    expect(apiFetch).toHaveBeenCalledWith("reservas/mias?tab=historial&page=1&pageSize=10");
  });

  it("AC2: Cancelar aparece solo en reservas Confirmada que inician en más de 24 horas", async () => {
    await renderPage({}, [
      reservation(),
      reservation({ id: "res-2", code: "RS-20261120-0002", canCancel: false }),
    ]);

    expect(within(rows()[0]).getByRole("button", { name: "Cancelar" })).toBeTruthy();
    expect(within(rows()[1]).queryByRole("button", { name: "Cancelar" })).toBeNull();
  });

  it("AC2: antes de cancelar pide confirmación; si no se acepta, no cancela", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await renderPage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    });

    expect(confirm).toHaveBeenCalledWith("¿Cancelar la reserva RS-20261120-0001? Esta acción no se puede deshacer.");
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("AC3: al confirmar cancela y va al Historial con \"Reserva cancelada\"", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    apiFetch.mockResolvedValue(json(200, { id: "res-1", status: "CANCELADA" }));
    await renderPage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    });

    expect(apiFetch).toHaveBeenCalledWith("reservas/res-1/cancelar", { method: "PATCH" });
    expect(redirect).toHaveBeenCalledWith("/reservas/mias?tab=historial&aviso=reserva-cancelada");
  });

  it("AC3: el Historial muestra el aviso y la reserva con estado Cancelada", async () => {
    await renderPage({ tab: "historial", aviso: "reserva-cancelada" }, [
      reservation({ status: "CANCELADA", canCancel: false }),
    ]);

    expect(screen.getByRole("status").textContent).toBe("Reserva cancelada");
    expect(screen.getAllByRole("tab")[1].getAttribute("aria-selected")).toBe("true");
    expect(within(rows()[0]).getByText("Cancelada")).toBeTruthy();
    expect(within(rows()[0]).queryByRole("button", { name: "Cancelar" })).toBeNull();
  });

  it("AC3: si el servidor responde que faltan menos de 24 horas, lo avisa arriba", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    apiFetch.mockResolvedValue(json(409, { message: "Solo puedes cancelar con al menos 24 horas de anticipación." }));
    await renderPage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    });

    expect(redirect).toHaveBeenCalledWith("/reservas/mias?aviso=menos-24h");
  });

  it("AC4: estado vacío de Próximas: \"No tienes reservas próximas.\"", async () => {
    await renderPage({}, []);

    expect(screen.getByText("No tienes reservas próximas.")).toBeTruthy();
  });

  it("AC4: estado vacío del Historial: \"No hay reservas en tu historial.\"", async () => {
    await renderPage({ tab: "historial" }, []);

    expect(screen.getByText("No hay reservas en tu historial.")).toBeTruthy();
  });
});
