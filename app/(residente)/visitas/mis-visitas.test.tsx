import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { MiVisita } from "@/lib/mis-visitas";
import { ActualizarButton } from "./actualizar-button";
import MisVisitasPage from "./page";
import { VisitasTabla } from "./visitas-tabla";

const apiFetch = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  apiFetch,
  requireRole: vi.fn(async () => ({ id: "u1", role: "RESIDENTE", unit: { code: "A-101" } })),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  unstable_rethrow: vi.fn(),
  useRouter: () => ({ push: vi.fn(), refresh }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const MIN = 60_000;

const autorizada: MiVisita = {
  id: "11111111-1111-4111-8111-111111111111",
  visitorName: "Rosa Martínez",
  documentType: "DUI",
  documentNumber: "01234567-8",
  visitDate: "2026-11-21",
  expectedTime: "15:30",
  entryAt: null,
  reason: "Visita familiar",
  code: "K7M2QX",
  status: "AUTORIZADA",
  origin: "PREAUTORIZADA",
  createdBy: "Ana Gómez",
  rejectReason: null,
  expiresAt: null,
};
const pendiente = (minutos = 12): MiVisita => ({
  ...autorizada,
  id: "22222222-2222-4222-8222-222222222222",
  visitorName: "Pedro Gómez",
  documentType: "PASAPORTE",
  documentNumber: "A1234567",
  expectedTime: null,
  reason: "Entrega de muebles",
  code: null,
  status: "PENDIENTE_AUTORIZACION",
  origin: "SIN_AUTORIZACION_PREVIA",
  createdBy: "Seguridad",
  expiresAt: new Date(Date.now() + minutos * MIN - 1000).toISOString(),
});

async function renderPage(searchParams: Record<string, string> = {}) {
  render(await MisVisitasPage({ searchParams: Promise.resolve(searchParams) } as never));
}
const dialog = () => document.querySelector("dialog")!;

describe("H15. Mis visitas: cancelar autorizaciones y responder solicitudes", () => {
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
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC1: tiene las pestañas Activas e Historial; por defecto abre Activas y pide 10 por página", async () => {
    apiFetch.mockResolvedValue(json({ data: [autorizada], total: 1, page: 1, pageSize: 10 }));
    await renderPage();

    const tabs = within(screen.getByRole("navigation", { name: "Pestañas" })).getAllByRole("link");
    expect(tabs.map((t) => [t.textContent, t.getAttribute("aria-current")])).toEqual([
      ["Activas", "page"],
      ["Historial", null],
    ]);
    expect(apiFetch).toHaveBeenCalledWith("visitas/mias?tab=activas&page=1&pageSize=10");
  });

  it("AC1: Historial consulta su pestaña y pagina de 10 en 10", async () => {
    apiFetch.mockResolvedValue(json({ data: [autorizada], total: 25, page: 2, pageSize: 10 }));
    await renderPage({ tab: "historial", page: "2" });

    expect(apiFetch).toHaveBeenCalledWith("visitas/mias?tab=historial&page=2&pageSize=10");
    expect(screen.getByText(/25 visitas · página 2 de 3/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Siguiente" }).getAttribute("href")).toBe("/visitas?tab=historial&page=3");
  });

  it("AC1: las columnas son visitante, documento, fecha, hora, motivo, código, estado y quién la creó", () => {
    render(<VisitasTabla visitas={[autorizada]} poll={false} emptyMessage="" />);

    expect(screen.getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
      "Visitante",
      "Documento",
      "Fecha",
      "Hora",
      "Motivo",
      "Código",
      "Estado",
      "Creada por",
      "Acciones",
    ]);
    const [, fila] = screen.getAllByRole("row");
    expect(within(fila).getAllByRole("cell").slice(0, 8).map((td) => td.textContent)).toEqual([
      "Rosa Martínez",
      "DUI 01234567-8",
      "21/11/2026",
      "15:30",
      "Visita familiar",
      "K7M2QX",
      "Autorizada",
      "Ana Gómez",
    ]);
  });

  it("AC2: Cancelar pide «¿Cancelar la autorización de <visitante> del <fecha>?» y al confirmar muestra «Autorización cancelada»", async () => {
    apiFetch.mockResolvedValue(json({ id: autorizada.id, status: "CANCELADA" }));
    const { rerender } = render(<VisitasTabla visitas={[autorizada]} poll={false} emptyMessage="No tienes visitas activas." />);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(dialog().open).toBe(true);
    expect(within(dialog()).getByText("¿Cancelar la autorización de Rosa Martínez del 21/11/2026?")).toBeTruthy();

    await act(async () => {
      fireEvent.click(within(dialog()).getByRole("button", { name: "Cancelar autorización" }));
    });

    expect(apiFetch).toHaveBeenCalledWith(`visitas/${autorizada.id}/cancelar`, { method: "PATCH" });
    // Aunque la única visita se vaya de la lista, el aviso se queda.
    rerender(<VisitasTabla visitas={[]} poll={false} emptyMessage="No tienes visitas activas." />);
    expect(screen.getByRole("status").textContent).toBe("Autorización cancelada");
    expect(screen.getByText("No tienes visitas activas.")).toBeTruthy();
  });

  it("AC2: solo una visita Autorizada tiene el botón Cancelar", () => {
    render(
      <VisitasTabla
        visitas={[{ ...autorizada, status: "DENTRO", entryAt: "2026-11-21T21:35:00.000Z" }, pendiente()]}
        poll={false}
        emptyMessage=""
      />,
    );

    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
  });

  it("AC3: una solicitud pendiente muestra «Seguridad espera tu respuesta (quedan N min)» con Aprobar y Rechazar", () => {
    render(<VisitasTabla visitas={[pendiente(12)]} poll={false} emptyMessage="" />);

    expect(screen.getByText("Seguridad espera tu respuesta (quedan 12 min)")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Aprobar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rechazar" })).toBeTruthy();
  });

  it("AC3: Aprobar envía la respuesta y muestra «Visita aprobada»", async () => {
    apiFetch.mockResolvedValue(json({ status: "AUTORIZADA" }));
    const visita = pendiente();
    render(<VisitasTabla visitas={[visita]} poll={false} emptyMessage="" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Aprobar" }));
    });

    expect(apiFetch).toHaveBeenCalledWith(`visitas/${visita.id}/respuesta`, {
      method: "POST",
      body: JSON.stringify({ decision: "APROBAR" }),
    });
    expect(screen.getByRole("status").textContent).toBe("Visita aprobada");
  });

  it("AC3: Rechazar pide un motivo opcional de máximo 100 caracteres", async () => {
    apiFetch.mockResolvedValue(json({ status: "RECHAZADA" }));
    const visita = pendiente();
    render(<VisitasTabla visitas={[visita]} poll={false} emptyMessage="" />);

    fireEvent.click(screen.getByRole("button", { name: "Rechazar" }));
    const motivo = within(dialog()).getByLabelText("Motivo (opcional)");
    const confirmar = within(dialog()).getByRole("button", { name: "Rechazar" }) as HTMLButtonElement;

    fireEvent.change(motivo, { target: { value: "x".repeat(101) } });
    expect(within(dialog()).getByText("El motivo puede tener máximo 100 caracteres.")).toBeTruthy();
    expect(confirmar.disabled).toBe(true);

    fireEvent.change(motivo, { target: { value: "No espero a nadie" } });
    expect(within(dialog()).getByText("17/100")).toBeTruthy();
    await act(async () => {
      fireEvent.click(confirmar);
    });

    expect(apiFetch).toHaveBeenCalledWith(`visitas/${visita.id}/respuesta`, {
      method: "POST",
      body: JSON.stringify({ decision: "RECHAZAR", reason: "No espero a nadie" }),
    });
    expect(screen.getByRole("status").textContent).toBe("Visita rechazada");
  });

  it("AC3: un conflicto 409 muestra el mensaje del servidor", async () => {
    apiFetch.mockResolvedValue(json({ message: "Otro residente ya respondió esta solicitud." }, 409));
    render(<VisitasTabla visitas={[pendiente()]} poll={false} emptyMessage="" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Aprobar" }));
    });

    expect(screen.getByRole("alert").textContent).toBe("Otro residente ya respondió esta solicitud.");
  });

  it("AC4: Activas se actualiza cada 15 segundos, también cuando está vacía", () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    render(<VisitasTabla visitas={[]} poll emptyMessage="No tienes visitas activas." />);

    vi.advanceTimersByTime(14_999);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(15_000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("AC4: Historial no se actualiza solo", () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    render(<VisitasTabla visitas={[autorizada]} poll={false} emptyMessage="" />);

    vi.advanceTimersByTime(60_000);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("AC4: el botón Actualizar vuelve a consultar", () => {
    render(<ActualizarButton />);

    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{}, "No tienes visitas activas."],
    [{ tab: "historial" }, "No hay visitas en tu historial."],
  ])("AC4: con %o vacío dice «%s»", async (params, message) => {
    apiFetch.mockResolvedValue(json({ data: [], total: 0, page: 1, pageSize: 10 }));
    await renderPage(params);

    expect(screen.getByText(message)).toBeTruthy();
  });
});
