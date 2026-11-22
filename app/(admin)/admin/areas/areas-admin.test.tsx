import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Area } from "@/lib/areas";
import { AreaForm } from "./_components/area-form";
import { BlockForm } from "./_components/block-form";
import EditarAreaPage from "./[id]/page";
import AreasAdminPage from "./page";

const apiFetch = vi.hoisted(() => vi.fn());
const fetchAdminAreas = vi.hoisted(() => vi.fn());
// Solo registra a dónde redirige (el redirect real corta la acción lanzando un error).
const redirect = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  apiFetch,
  requireRole: vi.fn(async () => ({ id: "admin-1", role: "ADMINISTRADOR", unit: null })),
}));
vi.mock("@/lib/areas-api", () => ({ fetchAdminAreas }));
vi.mock("@/lib/session", () => ({ getSession: vi.fn(async () => "token-de-prueba") }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect, notFound: vi.fn(), unstable_rethrow: vi.fn() }));

const AREA: Area = {
  id: "area-1",
  name: "Piscina",
  capacity: 10,
  rules: null,
  openTime: "08:00",
  closeTime: "20:00",
  slotMinutes: 60,
  isActive: true,
  futureReservations: 3,
  blocks: [{ id: "block-1", startDate: "2026-11-25", endDate: "2026-11-27", reason: "Mantenimiento de la bomba" }],
};

function json(status: number, body: unknown) {
  return { status, ok: status < 300, json: async () => body } as Response;
}
function field(label: string | RegExp) {
  return screen.getByLabelText(label) as HTMLInputElement;
}
function change(label: string | RegExp, value: string) {
  fireEvent.change(field(label), { target: { value } });
}

describe("H9. Administración de áreas comunes, horarios y bloqueos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetch.mockReset();
    // Domingo 22 de noviembre de 2026, 12:00 en El Salvador.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-22T18:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC1: la lista muestra nombre, aforo, horario, franja, estado y reservas futuras, en el orden del servidor (por nombre)", async () => {
    fetchAdminAreas.mockResolvedValue([
      { ...AREA, id: "a-1", name: "Gimnasio", isActive: false, futureReservations: 0 },
      AREA,
    ]);

    render(await AreasAdminPage({ searchParams: Promise.resolve({}) } as PageProps<"/admin/areas">));

    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers.slice(0, 6)).toEqual(["Área", "Personas", "Horario", "Franja", "Estado", "Reservas futuras"]);
    const [gimnasio, piscina] = screen.getAllByRole("row").slice(1);
    expect(within(gimnasio).getByText("Gimnasio")).toBeTruthy();
    expect(within(gimnasio).getByText("Deshabilitada")).toBeTruthy();
    const cells = within(piscina).getAllByRole("cell").map((c) => c.textContent);
    expect(cells.slice(0, 6)).toEqual(["Piscina", "10", "08:00\u201320:00", "60 min", "Habilitada", "3"]);
  });

  it("AC1: sin áreas muestra \"No hay áreas registradas.\"", async () => {
    fetchAdminAreas.mockResolvedValue([]);

    render(await AreasAdminPage({ searchParams: Promise.resolve({}) } as PageProps<"/admin/areas">));

    expect(screen.getByText("No hay áreas registradas.")).toBeTruthy();
  });

  it("AC2: el formulario pide nombre, aforo, reglas opcionales, apertura y cierre en pasos de 30 minutos, franja de 60 o 120 y Habilitada", () => {
    render(<AreaForm />);

    expect(field("Nombre").maxLength).toBe(50);
    expect(field("Aforo máximo (personas)").min).toBe("1");
    expect(field("Aforo máximo (personas)").max).toBe("500");
    expect(field(/Reglas de uso/).maxLength).toBe(500);
    const open = within(field("Hora de apertura")).getAllByRole("option").map((o) => o.textContent);
    expect(open).toHaveLength(48);
    expect(open.slice(0, 3)).toEqual(["00:00", "00:30", "01:00"]);
    expect(field("Hora de apertura").value).toBe("08:00");
    expect(field("Hora de cierre").value).toBe("20:00");
    expect(screen.getAllByRole("radio").map((r) => (r as HTMLInputElement).value)).toEqual(["60", "120"]);
    expect((screen.getByLabelText("60 minutos") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("switch") as HTMLInputElement).checked).toBe(true);
  });

  it("AC2: muestra los mensajes de nombre, aforo, cierre y franja, y Guardar queda deshabilitado", () => {
    render(<AreaForm />);

    change("Nombre", "Pi");
    expect(screen.getByText("El nombre debe tener de 3 a 50 caracteres.")).toBeTruthy();
    change("Aforo máximo (personas)", "501");
    expect(screen.getByText("El aforo debe ser un entero entre 1 y 500.")).toBeTruthy();
    change("Hora de cierre", "08:00");
    expect(screen.getByText("La hora de cierre debe ser posterior a la de apertura.")).toBeTruthy();
    change("Hora de cierre", "09:30");
    expect(screen.getByText("El horario debe dividirse en franjas completas de 60 minutos.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Guardar" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("AC3: el bloqueo pide inicio, fin y motivo, sin fechas pasadas ni más de 90 días", () => {
    render(<BlockForm areaId="area-1" today="2026-11-22" />);

    expect(field("Inicio del bloqueo").min).toBe("2026-11-22");
    expect(field("Inicio del bloqueo").value).toBe("2026-11-22");
    expect(field("Motivo").maxLength).toBe(200);

    change("Inicio del bloqueo", "2026-11-21");
    expect(screen.getByText("La fecha de inicio no puede ser anterior a hoy.")).toBeTruthy();
    change("Inicio del bloqueo", "2026-11-23");
    change("Fin del bloqueo", "2027-02-21");
    expect(screen.getByText("El bloqueo puede durar máximo 90 días.")).toBeTruthy();
    change("Motivo", "Bomba");
    change("Motivo", "Bom");
    expect(screen.getByText("El motivo debe tener de 5 a 200 caracteres.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Bloquear" }) as HTMLButtonElement).disabled).toBe(true);

    change("Fin del bloqueo", "2027-02-20");
    change("Motivo", "Mantenimiento de la bomba");
    expect((screen.getByRole("button", { name: "Bloquear" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("AC3: la pantalla lista los bloqueos actuales y futuros con Eliminar bloqueo", async () => {
    fetchAdminAreas.mockResolvedValue([AREA]);

    render(await EditarAreaPage({ params: Promise.resolve({ id: "area-1" }) } as PageProps<"/admin/areas/[id]">));

    const list = screen.getByText("Mantenimiento de la bomba").closest("li") as HTMLElement;
    expect(within(list).getByText("25/11/2026 al 27/11/2026")).toBeTruthy();
    expect(within(list).getByRole("button", { name: "Eliminar bloqueo" })).toBeTruthy();
  });

  it("AC3: sin bloqueos muestra \"No hay bloqueos programados.\"", async () => {
    fetchAdminAreas.mockResolvedValue([{ ...AREA, blocks: [] }]);

    render(await EditarAreaPage({ params: Promise.resolve({ id: "area-1" }) } as PageProps<"/admin/areas/[id]">));

    expect(screen.getByText("No hay bloqueos programados.")).toBeTruthy();
  });

  it("AC4: si el cambio afecta reservas, pide confirmación con la cantidad y al continuar reenvía con confirmCancellations", async () => {
    apiFetch
      .mockResolvedValueOnce(json(409, { code: "RESERVAS_AFECTADAS", affectedCount: 2 }))
      .mockResolvedValueOnce(json(200, { area: AREA, cancelledReservations: 2 }));
    render(<AreaForm area={AREA} />);
    change("Hora de apertura", "09:00");
    change("Hora de cierre", "19:00");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    });

    expect(screen.getByRole("alertdialog").textContent).toContain(
      "Este cambio cancelará 2 reservas confirmadas y se avisará a los residentes. ¿Continuar?",
    );
    expect(JSON.parse((apiFetch.mock.calls[0][1] as { body: string }).body)).not.toHaveProperty("confirmCancellations");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    });
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));

    expect(apiFetch).toHaveBeenLastCalledWith(
      "admin/areas/area-1",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(JSON.parse((apiFetch.mock.calls[1][1] as { body: string }).body)).toMatchObject({
      openTime: "09:00",
      closeTime: "19:00",
      confirmCancellations: true,
    });
    expect(redirect).toHaveBeenCalledWith("/admin/areas?aviso=area-guardada");
  });

  it("AC4: al bloquear con reservas afectadas también pide confirmación (1 reserva)", async () => {
    apiFetch.mockResolvedValueOnce(json(409, { code: "RESERVAS_AFECTADAS", affectedCount: 1 }));
    render(<BlockForm areaId="area-1" today="2026-11-22" />);
    change("Motivo", "Mantenimiento de la bomba");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Bloquear" }));
    });

    expect(screen.getByRole("alertdialog").textContent).toContain(
      "Este cambio cancelará 1 reserva confirmada y se avisará a los residentes. ¿Continuar?",
    );
  });

  it("AC4: Cancelar en la confirmación no aplica el cambio", async () => {
    apiFetch.mockResolvedValueOnce(json(409, { code: "RESERVAS_AFECTADAS", affectedCount: 2 }));
    render(<AreaForm area={{ ...AREA, isActive: true }} />);
    fireEvent.click(screen.getByRole("switch"));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    });
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("AC5: los residentes ven los cambios en la siguiente carga: el frontend no guarda en caché las consultas al backend", async () => {
    vi.stubEnv("API_URL", "http://localhost:3000/api/v1/");
    const fetchMock = vi.fn(async () => json(200, { data: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const real = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");

    await real.apiFetch("areas");
    await real.apiFetch("areas");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("http://localhost:3000/api/v1/areas"),
      expect.objectContaining({ cache: "no-store" }),
    );
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});
