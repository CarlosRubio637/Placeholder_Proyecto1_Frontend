import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "@/app/_components/notification-bell";
import { useNotificationsStore } from "@/lib/stores/notifications-store";
import { BandejaNotificaciones } from "./bandeja-notificaciones";

const actions = vi.hoisted(() => ({
  listarNotificaciones: vi.fn(),
  marcarLeida: vi.fn(),
  marcarTodasLeidas: vi.fn(),
  contarNoLeidas: vi.fn(),
}));
const push = vi.hoisted(() => vi.fn());

vi.mock("@/app/actions/notificaciones", () => actions);
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/notificaciones",
}));

const notification = (id: string, overrides: object = {}) => ({
  id,
  title: `Aviso ${id}`,
  message: `Mensaje ${id}`,
  sourceModule: "PAQUETERIA",
  referenceType: null,
  referenceId: null,
  readAt: null,
  createdAt: "2026-11-21T15:00:00.000Z",
  ...overrides,
});

function page(data: object[], total = data.length) {
  return { ok: true, data: { data, total, page: 1, pageSize: 20 } };
}

async function renderInbox() {
  await act(async () => {
    render(<BandejaNotificaciones role="RESIDENTE" />);
  });
}

describe("H31. Bandeja centralizada de notificaciones", () => {
  beforeAll(() => {
    // jsdom no implementa <dialog>.
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.open = false;
    };
  });

  beforeEach(() => {
    Object.values(actions).forEach((fn) => fn.mockReset());
    push.mockReset();
    actions.contarNoLeidas.mockResolvedValue(1);
    actions.marcarLeida.mockResolvedValue({ ok: true, data: { id: "n-1", readAt: "2026-11-22T16:00:00Z" } });
    actions.marcarTodasLeidas.mockResolvedValue({ ok: true, data: { updated: 2 } });
    useNotificationsStore.setState({ unreadCount: null });
  });

  it("AC1: muestra título, mensaje, módulo, fecha y estado; las No leídas resaltadas", async () => {
    actions.listarNotificaciones.mockResolvedValue(
      page([notification("n-1"), notification("n-2", { readAt: "2026-11-21T16:00:00Z", sourceModule: "VISITAS" })]),
    );
    await renderInbox();

    const [first, second] = screen.getAllByRole("listitem");
    expect(within(first).getByText("Aviso n-1")).toBeTruthy();
    expect(within(first).getByText("Mensaje n-1")).toBeTruthy();
    expect(within(first).getByText(/Paquetería/)).toBeTruthy();
    expect(within(first).getByText("No leída")).toBeTruthy();
    expect(within(first).getByRole("button").className).toContain("bg-sky-50");
    expect(within(second).getByText("Leída")).toBeTruthy();
    expect(within(second).getByText(/Visitas/)).toBeTruthy();
    expect(first.querySelector("time")?.getAttribute("dateTime")).toBe("2026-11-21T15:00:00.000Z");
  });

  it("AC1: pide la primera página al abrir y pagina de 20 en 20", async () => {
    actions.listarNotificaciones.mockResolvedValue(page([notification("n-1")], 45));
    await renderInbox();

    expect(actions.listarNotificaciones).toHaveBeenCalledWith({ sourceModule: undefined, unread: false, page: 1 });
    expect(screen.getByText("Página 1 de 3 · 45 en total")).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Siguiente" })));
    expect(actions.listarNotificaciones).toHaveBeenLastCalledWith({ sourceModule: undefined, unread: false, page: 2 });
  });

  it("AC2: filtra por módulo de origen (Todos o uno de los 7) y por estado", async () => {
    actions.listarNotificaciones.mockResolvedValue(page([notification("n-1")]));
    await renderInbox();

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect([...select.options].map((option) => option.textContent)).toEqual([
      "Todos",
      "Cuotas",
      "Reservas",
      "Incidencias",
      "Visitas",
      "Paquetería",
      "Votaciones",
      "Comunicados",
    ]);
    await act(async () => fireEvent.change(select, { target: { value: "VISITAS" } }));
    await act(async () => fireEvent.click(screen.getByRole("radio", { name: "No leídas" })));

    expect(actions.listarNotificaciones).toHaveBeenLastCalledWith({ sourceModule: "VISITAS", unread: true, page: 1 });
  });

  it("AC2: muestra el estado vacío sin notificaciones y con filtros", async () => {
    actions.listarNotificaciones.mockResolvedValue(page([]));
    await renderInbox();
    expect(screen.getByText("No tienes notificaciones.")).toBeTruthy();

    await act(async () => fireEvent.click(screen.getByRole("radio", { name: "No leídas" })));
    expect(screen.getByText("No hay notificaciones con esos filtros.")).toBeTruthy();
  });

  it("AC3: al hacer clic pasa a Leída y navega a la pantalla de origen", async () => {
    actions.listarNotificaciones.mockResolvedValue(
      page([notification("n-1", { referenceType: "visit", referenceId: "visit-1", sourceModule: "VISITAS" })]),
    );
    await renderInbox();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Aviso n-1/ })));

    expect(actions.marcarLeida).toHaveBeenCalledWith("n-1");
    expect(screen.getByText("Leída")).toBeTruthy();
    expect(push).toHaveBeenCalledWith("/visitas");
  });

  it("AC3: Marcar todas como leídas pide confirmación y marca las No leídas", async () => {
    actions.listarNotificaciones.mockResolvedValue(page([notification("n-1"), notification("n-2")]));
    useNotificationsStore.setState({ unreadCount: 2 });
    await renderInbox();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Marcar todas como leídas" })));
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(within(dialog).getByText("¿Marcar todas como leídas?")).toBeTruthy();
    expect(actions.marcarTodasLeidas).not.toHaveBeenCalled();

    await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: "Marcar todas", hidden: true })));
    expect(actions.marcarTodasLeidas).toHaveBeenCalledTimes(1);
  });

  it("AC4: el encabezado muestra el contador de No leídas y 99+ si pasa de 99", async () => {
    actions.contarNoLeidas.mockResolvedValue(7);
    const { unmount } = await act(async () => render(<NotificationBell />));
    expect(screen.getByRole("link", { name: "Notificaciones, 7 sin leer" }).textContent).toContain("7");
    unmount();

    actions.contarNoLeidas.mockResolvedValue(150);
    await act(async () => {
      render(<NotificationBell />);
    });
    expect(screen.getByRole("link", { name: "Notificaciones, 150 sin leer" }).textContent).toContain("99+");
  });

  it("AC4: el contador se vuelve a consultar cada 30 segundos", async () => {
    vi.useFakeTimers();
    actions.contarNoLeidas.mockResolvedValue(3);
    await act(async () => {
      render(<NotificationBell />);
    });
    expect(actions.contarNoLeidas).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(actions.contarNoLeidas).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
