import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicArea } from "@/lib/reservas";
import { ConfirmarReservaForm } from "./confirmar-form";
import ConfirmarReservaPage from "./page";

const apiFetch = vi.hoisted(() => vi.fn());
const fetchArea = vi.hoisted(() => vi.fn());
// Solo registra a dónde redirige (el redirect real corta la acción lanzando un error).
const redirect = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  apiFetch,
  requireRole: vi.fn(async () => ({ id: "u1", role: "RESIDENTE", unit: { code: "A-101" } })),
}));
vi.mock("@/lib/reservas-api", () => ({ fetchArea }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect, unstable_rethrow: vi.fn() }));

const AREA: PublicArea = {
  id: "area-1",
  name: "Piscina",
  capacity: 10,
  rules: "No se permite vidrio.",
  openTime: "08:00",
  closeTime: "20:00",
  slotMinutes: 60,
};

function json(status: number, body: unknown) {
  return { status, ok: status < 300, json: async () => body } as Response;
}
function attendees() {
  return screen.getByLabelText("Número de personas") as HTMLInputElement;
}
function rules() {
  return screen.getByLabelText("Acepto las reglas de uso") as HTMLInputElement;
}
function confirmButton() {
  return screen.getByRole("button", { name: /Confirmar reserva|Confirmando/ }) as HTMLButtonElement;
}
function renderForm() {
  render(
    <ConfirmarReservaForm
      area={{ id: AREA.id, capacity: AREA.capacity, rules: AREA.rules }}
      date="2026-11-23"
      startTime="10:00"
      backHref="/reservas/area-1?fecha=2026-11-23"
    />,
  );
}
async function submit() {
  await act(async () => {
    fireEvent.click(confirmButton());
  });
}

describe("H7. Reserva de un área común", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AC1: muestra área, fecha y franja, y pide personas y la aceptación de las reglas", async () => {
    fetchArea.mockResolvedValue(AREA);
    const page = await ConfirmarReservaPage({
      params: Promise.resolve({ areaId: "area-1" }),
      searchParams: Promise.resolve({ fecha: "2026-11-23", inicio: "10:00" }),
    } as PageProps<"/reservas/[areaId]/confirmar">);
    render(page);

    expect(screen.getByText("Piscina")).toBeTruthy();
    expect(screen.getByText("23/11/2026")).toBeTruthy();
    expect(screen.getByText("10:00 a 11:00")).toBeTruthy();
    expect(screen.getByText("10 personas")).toBeTruthy();
    expect(screen.getByText("No se permite vidrio.")).toBeTruthy();
    expect(attendees().value).toBe("1");
    expect(attendees().min).toBe("1");
    expect(attendees().max).toBe("10");
    expect(rules().checked).toBe(false);
  });

  it("AC1: una franja que no es del horario no muestra el formulario", async () => {
    fetchArea.mockResolvedValue(AREA);
    const page = await ConfirmarReservaPage({
      params: Promise.resolve({ areaId: "area-1" }),
      searchParams: Promise.resolve({ fecha: "2026-11-23", inicio: "10:30" }),
    } as PageProps<"/reservas/[areaId]/confirmar">);
    render(page);

    expect(screen.getByRole("alert").textContent).toContain("La franja elegida no es válida.");
    expect(screen.queryByLabelText("Número de personas")).toBeNull();
  });

  it("AC1: las personas deben ser un entero de 1 al aforo y la casilla es obligatoria", () => {
    renderForm();

    fireEvent.change(attendees(), { target: { value: "0" } });
    expect(screen.getByText("Ingresa entre 1 y 10 personas.")).toBeTruthy();
    fireEvent.change(attendees(), { target: { value: "11" } });
    expect(screen.getByText("Ingresa entre 1 y 10 personas.")).toBeTruthy();
    fireEvent.click(rules());
    fireEvent.click(rules());
    expect(screen.getByText("Debes aceptar las reglas de uso.")).toBeTruthy();
    expect(confirmButton().disabled).toBe(true);

    fireEvent.change(attendees(), { target: { value: "10" } });
    fireEvent.click(rules());
    expect(screen.queryByText(/Ingresa entre/)).toBeNull();
    expect(screen.queryByText("Debes aceptar las reglas de uso.")).toBeNull();
    expect(confirmButton().disabled).toBe(false);
  });

  it("AC2: al confirmar muestra el comprobante con número, área, fecha, franja, personas y Confirmada", async () => {
    apiFetch.mockResolvedValue(
      json(201, {
        id: "res-1",
        code: "RS-20261122-0001",
        area: { id: "area-1", name: "Piscina" },
        date: "2026-11-23",
        startTime: "10:00",
        endTime: "11:00",
        attendees: 4,
        status: "CONFIRMADA",
        createdAt: "2026-11-22T18:00:00Z",
      }),
    );
    renderForm();
    fireEvent.change(attendees(), { target: { value: "4" } });
    fireEvent.click(rules());

    await submit();

    const [path, init] = apiFetch.mock.calls[0] as [string, { method: string; body: string }];
    expect(path).toBe("reservas");
    expect(JSON.parse(init.body)).toEqual({
      areaId: "area-1",
      date: "2026-11-23",
      startTime: "10:00",
      attendees: 4,
      acceptRules: true,
    });
    expect(screen.getByRole("status").textContent).toBe("Reserva confirmada");
    expect(screen.getByText("RS-20261122-0001").textContent).toMatch(/^RS-\d{8}-\d{4}$/);
    expect(screen.getByText("Piscina")).toBeTruthy();
    expect(screen.getByText("23/11/2026")).toBeTruthy();
    expect(screen.getByText("10:00 a 11:00")).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByText("Confirmada")).toBeTruthy();
  });

  it("AC3: si otra unidad tomó la franja, regresa a la disponibilidad con el aviso", async () => {
    apiFetch.mockResolvedValue(json(409, { message: "Esta franja ya fue reservada por otra unidad." }));
    renderForm();
    fireEvent.click(rules());

    await submit();

    expect(redirect).toHaveBeenCalledWith("/reservas/area-1?fecha=2026-11-23&aviso=franja-ocupada");
  });

  it("AC3: la disponibilidad muestra \"Esta franja ya fue reservada por otra unidad. Elige otra.\" con datos actualizados", async () => {
    vi.resetModules();
    vi.doMock("@/lib/reservas-api", () => ({
      fetchArea: vi.fn(async () => AREA),
      fetchAvailability: vi.fn(async () => ({
        slots: [{ startTime: "10:00", endTime: "11:00", status: "RESERVADO", ownReservationId: null }],
      })),
    }));
    vi.doMock("next/navigation", () => ({
      notFound: vi.fn(),
      useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
    }));
    vi.doMock("@/lib/api", () => ({
      requireAnyRole: vi.fn(async () => ({ id: "u1", role: "RESIDENTE" })),
    }));
    const { default: DisponibilidadPage } = await import("@/app/(comun)/reservas/[areaId]/page");

    const page = await DisponibilidadPage({
      params: Promise.resolve({ areaId: "area-1" }),
      searchParams: Promise.resolve({ fecha: "2026-11-23", aviso: "franja-ocupada" }),
    } as PageProps<"/reservas/[areaId]">);
    render(page);

    expect(screen.getByRole("alert").textContent).toBe("Esta franja ya fue reservada por otra unidad. Elige otra.");
    expect(screen.getByText("Reservado")).toBeTruthy();
  });
});
