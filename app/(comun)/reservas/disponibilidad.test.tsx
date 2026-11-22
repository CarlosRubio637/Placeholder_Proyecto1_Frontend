import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AvailabilitySlot, PublicArea } from "@/lib/reservas";
import { AvailabilityView } from "./[areaId]/availability-view";
import DisponibilidadPage from "./[areaId]/page";
import AreasComunesPage from "./page";

const apiFetch = vi.hoisted(() => vi.fn());
const fetchAreas = vi.hoisted(() => vi.fn());
const fetchArea = vi.hoisted(() => vi.fn());
const fetchAvailability = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());
const role = vi.hoisted(() => ({ value: "RESIDENTE" }));

vi.mock("@/lib/api", () => ({
  apiFetch,
  requireAnyRole: vi.fn(async () => ({ id: "u1", role: role.value, unit: { code: "A-101" } })),
}));
vi.mock("@/lib/reservas-api", () => ({ fetchAreas, fetchArea, fetchAvailability }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  useRouter: () => ({ refresh, replace, push: vi.fn() }),
}));

const AREA: PublicArea = {
  id: "area-1",
  name: "Piscina",
  capacity: 10,
  rules: "No se permite vidrio.",
  openTime: "08:00",
  closeTime: "20:00",
  slotMinutes: 60,
};

const SLOTS: AvailabilitySlot[] = [
  { startTime: "08:00", endTime: "09:00", status: "PASADO", ownReservationId: null },
  { startTime: "13:00", endTime: "14:00", status: "DISPONIBLE", ownReservationId: null },
  { startTime: "14:00", endTime: "15:00", status: "RESERVADO", ownReservationId: null },
  { startTime: "15:00", endTime: "16:00", status: "RESERVADO", ownReservationId: "res-own" },
  { startTime: "16:00", endTime: "17:00", status: "MANTENIMIENTO", ownReservationId: null },
];

function slot(start: string) {
  return screen.getByText(new RegExp(`^${start} a `)).closest("li") as HTMLElement;
}

async function renderAvailability(fecha?: string) {
  fetchArea.mockResolvedValue(AREA);
  fetchAvailability.mockResolvedValue({ slots: SLOTS });
  const page = await DisponibilidadPage({
    params: Promise.resolve({ areaId: "area-1" }),
    searchParams: Promise.resolve(fecha ? { fecha } : {}),
  } as PageProps<"/reservas/[areaId]">);
  return render(page);
}

describe("H6. Consulta de disponibilidad de áreas comunes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    role.value = "RESIDENTE";
    // Domingo 22 de noviembre de 2026, 12:00 en El Salvador.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-22T18:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC1: el catálogo muestra nombre, aforo, horario, duración de franja y reglas de cada área", async () => {
    fetchAreas.mockResolvedValue([AREA]);

    render(await AreasComunesPage());

    const card = screen.getByRole("link", { name: /Piscina/ });
    expect(within(card).getByText(/Aforo máximo: 10 personas/)).toBeTruthy();
    expect(within(card).getByText(/Horario: 08:00 a 20:00/)).toBeTruthy();
    expect(within(card).getByText(/Franjas de 60 minutos/)).toBeTruthy();
    expect(within(card).getByText("No se permite vidrio.")).toBeTruthy();
    expect(card.getAttribute("href")).toBe("/reservas/area-1");
  });

  it("AC1: solo muestra las áreas que devuelve GET /areas (las habilitadas) y avisa si no hay", async () => {
    const real = await vi.importActual<typeof import("@/lib/reservas-api")>("@/lib/reservas-api");
    apiFetch.mockResolvedValue({ ok: true, json: async () => ({ data: [AREA] }) });
    await expect(real.fetchAreas()).resolves.toEqual([AREA]);
    expect(apiFetch).toHaveBeenCalledWith("areas");

    fetchAreas.mockResolvedValue([]);
    render(await AreasComunesPage());
    expect(screen.getByText("No hay áreas comunes habilitadas.")).toBeTruthy();
  });

  it("AC2: muestra todas las franjas del día con su estado; las de la propia unidad dicen \"Reservado por tu unidad\"", async () => {
    await renderAvailability("2026-11-23");

    expect(fetchAvailability).toHaveBeenCalledWith("area-1", "2026-11-23");
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(within(slot("08:00")).getByText("Pasado")).toBeTruthy();
    expect(within(slot("13:00")).getByText("Disponible")).toBeTruthy();
    expect(within(slot("14:00")).getByText("Reservado")).toBeTruthy();
    expect(within(slot("15:00")).getByText("Reservado por tu unidad")).toBeTruthy();
    expect(within(slot("16:00")).getByText("Mantenimiento")).toBeTruthy();
  });

  it("AC3: solo las franjas Disponible se pueden seleccionar y llevan a la confirmación", async () => {
    await renderAvailability("2026-11-23");

    const links = screen.getAllByRole("link").filter((a) => a.getAttribute("href")?.includes("/confirmar"));
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("/reservas/area-1/confirmar?fecha=2026-11-23&inicio=13:00");
    for (const start of ["08:00", "14:00", "15:00", "16:00"]) {
      expect(within(slot(start)).queryByRole("link")).toBeNull();
    }
  });

  it("AC3: el administrador ve la disponibilidad pero no selecciona franjas", async () => {
    role.value = "ADMINISTRADOR";
    await renderAvailability("2026-11-23");

    expect(within(slot("13:00")).queryByRole("link")).toBeNull();
  });

  it("AC4: el selector de fecha va de hoy a hoy + 30 días y empieza en hoy", async () => {
    await renderAvailability();

    const input = screen.getByLabelText("Fecha") as HTMLInputElement;
    expect(input.min).toBe("2026-11-22");
    expect(input.max).toBe("2026-12-22");
    expect(input.value).toBe("2026-11-22");
    expect(fetchAvailability).toHaveBeenCalledWith("area-1", "2026-11-22");
  });

  it("AC4: una fecha fuera del rango no se consulta; una válida sí", () => {
    render(
      <AvailabilityView areaId="area-1" date="2026-11-22" min="2026-11-22" max="2026-12-22" slots={SLOTS} canReserve />,
    );
    const input = screen.getByLabelText("Fecha");

    fireEvent.change(input, { target: { value: "2026-11-21" } });
    fireEvent.change(input, { target: { value: "2026-12-23" } });
    expect(replace).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "2026-12-22" } });
    expect(replace).toHaveBeenCalledWith("/reservas/area-1?fecha=2026-12-22");
  });

  it("AC5: las franjas se actualizan cada 30 segundos y el temporizador se detiene al salir", () => {
    vi.useFakeTimers();
    const view = render(
      <AvailabilityView areaId="area-1" date="2026-11-23" min="2026-11-22" max="2026-12-22" slots={SLOTS} canReserve />,
    );

    act(() => {
      vi.advanceTimersByTime(29_999);
    });
    expect(refresh).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(refresh).toHaveBeenCalledTimes(2);

    view.unmount();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("AC5: el botón Actualizar vuelve a consultar", () => {
    render(
      <AvailabilityView areaId="area-1" date="2026-11-23" min="2026-11-22" max="2026-12-22" slots={SLOTS} canReserve />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));

    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
