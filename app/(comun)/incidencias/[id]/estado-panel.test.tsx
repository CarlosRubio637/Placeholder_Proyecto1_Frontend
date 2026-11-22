import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { describeEvent, formatDateTime, type IncidentDetail, type IncidentStatus } from "@/lib/incidencias";
import { EstadoPanel } from "./estado-panel";
import DetalleIncidenciaPage from "./page";

const apiFetch = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());
const user = vi.hoisted(() => ({ current: { id: "a1", role: "ADMINISTRADOR", unit: null as null | { code: string } } }));

vi.mock("@/lib/api", () => ({
  apiFetch,
  requireAnyRole: vi.fn(async () => user.current),
}));
vi.mock("next/navigation", () => ({
  unstable_rethrow: vi.fn(),
  useRouter: () => ({ push: vi.fn(), refresh }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const INC = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const NOTE = "Se cambió el empaque de la tubería.";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function renderPanel(status: IncidentStatus, hasAssignee = true) {
  render(<EstadoPanel incidentId={INC} number="INC-2026-00001" status={status} hasAssignee={hasAssignee} />);
}
const note = () => screen.getByRole("textbox") as HTMLTextAreaElement;
const dialog = () => document.querySelector("dialog")!;

async function confirmChange(text = NOTE) {
  fireEvent.change(note(), { target: { value: text } });
  fireEvent.submit(note().closest("form")!);
  await act(async () => {
    fireEvent.click(within(dialog()).getByRole("button", { name: "Confirmar" }));
  });
}

describe("H13. Cambio de estado y seguimiento de incidencias", () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
  });
  beforeEach(() => {
    apiFetch.mockReset();
    refresh.mockReset();
    user.current = { id: "a1", role: "ADMINISTRADOR", unit: null };
  });

  it.each<[IncidentStatus, string, string, string]>([
    ["PENDIENTE", "Iniciar atención", "Trabajo que inicia", "Pendiente → En proceso"],
    ["EN_PROCESO", "Marcar como resuelta", "Acciones realizadas", "En proceso → Resuelto"],
    ["RESUELTO", "Reabrir", "Motivo de la reapertura", "Resuelto → En proceso"],
  ])("AC1: desde %s solo ofrece «%s»", (status, action, label, arrow) => {
    renderPanel(status);

    const panel = screen.getByRole("region", { name: "Estado" });
    expect(within(panel).getAllByRole("button").map((b) => b.textContent)).toEqual([action]);
    expect(within(panel).getByText(arrow)).toBeTruthy();
    expect(screen.getByLabelText(label)).toBeTruthy();
  });

  it("AC1: el panel solo lo ve el Administrador, no el Residente", async () => {
    const detail = {
      id: INC,
      number: "INC-2026-00001",
      title: "Fuga de agua",
      description: "Gotea agua del techo del pasillo.",
      location: "TORRE_A",
      locationDetail: null,
      status: "PENDIENTE",
      priority: "MEDIA",
      resolvedAt: null,
      createdAt: "2026-11-06T18:00:00.000Z",
      updatedAt: "2026-11-06T18:00:00.000Z",
      unit: { code: "A-101" },
      assignee: null,
      photos: [],
      events: [],
    };
    user.current = { id: "u1", role: "RESIDENTE", unit: { code: "A-101" } };
    apiFetch.mockResolvedValue(json(detail));

    render(await DetalleIncidenciaPage({ params: Promise.resolve({ id: INC }), searchParams: Promise.resolve({}) } as never));

    expect(screen.queryByRole("region", { name: "Estado" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Iniciar atención" })).toBeNull();
  });

  it("AC2: pide una observación de 10 a 500 caracteres con contador", () => {
    renderPanel("EN_PROCESO");
    const boton = screen.getByRole("button", { name: "Marcar como resuelta" }) as HTMLButtonElement;

    expect(screen.getByText("0/500")).toBeTruthy();
    expect(boton.disabled).toBe(true);

    fireEvent.change(note(), { target: { value: "Corta" } });
    fireEvent.blur(note());
    expect(screen.getByText("Escribe una observación de 10 a 500 caracteres.")).toBeTruthy();
    expect(boton.disabled).toBe(true);

    fireEvent.change(note(), { target: { value: "x".repeat(501) } });
    expect(boton.disabled).toBe(true);

    fireEvent.change(note(), { target: { value: NOTE } });
    expect(screen.getByText(`${NOTE.length}/500`)).toBeTruthy();
    expect(boton.disabled).toBe(false);
  });

  it("AC2: antes de guardar pide confirmación «¿Cambiar la incidencia <número> a <estado>?»", () => {
    renderPanel("PENDIENTE");

    fireEvent.change(note(), { target: { value: NOTE } });
    fireEvent.submit(note().closest("form")!);

    expect(dialog().open).toBe(true);
    expect(within(dialog()).getByText("¿Cambiar la incidencia INC-2026-00001 a En proceso?")).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();

    fireEvent.click(within(dialog()).getByRole("button", { name: "Cancelar" }));
    expect(dialog().open).toBe(false);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("AC3: al confirmar envía el cambio con el estado visto y muestra «Estado actualizado»", async () => {
    apiFetch.mockResolvedValue(json({ incident: { id: INC, status: "RESUELTO" } }, 201));
    renderPanel("EN_PROCESO");

    await confirmChange(`  ${NOTE}  `);

    expect(apiFetch).toHaveBeenCalledWith(`admin/incidencias/${INC}/estado`, {
      method: "POST",
      body: JSON.stringify({ toStatus: "RESUELTO", expectedStatus: "EN_PROCESO", note: NOTE }),
    });
    expect(screen.getByRole("status").textContent).toBe("Estado actualizado");
    // Vuelve a pedir el detalle para que el historial agregue el evento.
    expect(refresh).toHaveBeenCalled();
  });

  it("AC3: el historial muestra el evento con fecha, hora, estados y observación", async () => {
    const event = {
      id: "e2",
      type: "ESTADO",
      fromStatus: "EN_PROCESO",
      toStatus: "RESUELTO",
      fromValue: null,
      toValue: null,
      note: NOTE,
      authorLabel: "Administración",
      createdAt: "2026-11-07T15:30:00.000Z",
    } as const;
    apiFetch.mockImplementation(async (path: string) =>
      path.startsWith("admin/responsables")
        ? json({ data: [] })
        : json({
            id: INC,
            number: "INC-2026-00001",
            title: "Fuga de agua",
            description: "Gotea agua del techo del pasillo.",
            location: "TORRE_A",
            locationDetail: null,
            status: "RESUELTO",
            priority: "MEDIA",
            resolvedAt: "2026-11-07T15:30:00.000Z",
            createdAt: "2026-11-06T18:00:00.000Z",
            updatedAt: "2026-11-07T15:30:00.000Z",
            unit: { code: "A-101" },
            assignee: { id: "s1", name: "Pedro Alvarado", specialty: "Fontanería" },
            photos: [],
            events: [event],
          } satisfies IncidentDetail),
    );

    render(await DetalleIncidenciaPage({ params: Promise.resolve({ id: INC }), searchParams: Promise.resolve({}) } as never));

    const historial = screen.getByRole("heading", { name: "Historial" }).parentElement!;
    const [, fila] = within(historial).getAllByRole("row");
    expect(within(fila).getAllByRole("cell").map((c) => c.textContent)).toEqual([
      formatDateTime(event.createdAt),
      describeEvent(event),
      NOTE,
      "Administración",
    ]);
    expect(describeEvent(event)).toBe("En proceso → Resuelto");
  });

  it("AC3: un conflicto 409 muestra el mensaje del servidor", async () => {
    apiFetch.mockResolvedValue(json({ message: "La incidencia cambió de estado. Actualiza la página." }, 409));
    renderPanel("PENDIENTE");

    await confirmChange();

    expect(screen.getByRole("alert").textContent).toBe("La incidencia cambió de estado. Actualiza la página.");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("AC3: sin responsable avisa antes de iniciar la atención", () => {
    renderPanel("PENDIENTE", false);

    expect(screen.getByText("Asigna un responsable antes de iniciar la atención.")).toBeTruthy();
  });
});
