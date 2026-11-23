import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type * as SalidasModule from "@/app/actions/salidas";
import DentroPage from "./page";

const apiFetch = vi.hoisted(() => vi.fn());
const requireRole = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());
const registrarSalidaMock = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
);
const router = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  push: vi.fn(),
}));
const urlParams = vi.hoisted(() => ({ current: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  redirect,
  unstable_rethrow: vi.fn(),
  useRouter: () => router,
  usePathname: () => "/seguridad/dentro",
  useSearchParams: () => urlParams.current,
}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/api", () => ({ apiFetch, requireRole }));
// El botón usa una versión simulada; la acción real se prueba aparte.
vi.mock("@/app/actions/salidas", () => ({
  registrarSalida: registrarSalidaMock,
}));

const VISIT_ID = "3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b";

const ana = {
  id: VISIT_ID,
  visitorName: "Ana López",
  documentType: "DUI",
  documentNumber: "01234567-8",
  unitCode: "A-101",
  reason: "Visita familiar",
  entryAt: "2026-11-19T16:05:00Z",
  minutesInside: 265,
};

function respuesta(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function apiConLista() {
  apiFetch.mockImplementation(async (path: string) => {
    if (path === "torres")
      return respuesta([{ id: "t1", name: "Torre A", letter: "A" }]);
    if (path.startsWith("seguridad/visitas/dentro")) {
      return respuesta({
        totalInside: 1,
        data: [ana],
        total: 1,
        page: 1,
        pageSize: 50,
      });
    }
    throw new Error(`Ruta inesperada: ${path}`);
  });
}

async function renderPage(searchParams: Record<string, string> = {}) {
  const ui = await DentroPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(searchParams),
  } as never);
  return render(ui);
}

async function accionReal() {
  const actual = await vi.importActual<typeof SalidasModule>(
    "@/app/actions/salidas",
  );
  return actual.registrarSalida;
}

describe("H17. Registro de salida de visitantes", () => {
  beforeAll(() => {
    // jsdom no implementa showModal/close de <dialog>.
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
    };
  });

  beforeEach(() => {
    apiFetch.mockReset();
    redirect.mockClear();
    revalidatePath.mockReset();
    router.replace.mockReset();
    registrarSalidaMock.mockReset();
    registrarSalidaMock.mockResolvedValue({});
    requireRole.mockResolvedValue({ id: "guard-1", role: "SEGURIDAD" });
    urlParams.current = new URLSearchParams();
    apiConLista();
  });

  it("AC1: cada fila de quién está dentro tiene el botón Registrar salida", async () => {
    await renderPage();

    const fila = screen
      .getByRole("cell", { name: "Ana López" })
      .closest("tr") as HTMLElement;
    expect(
      within(fila).getByRole("button", {
        name: "Registrar la salida de Ana López",
      }),
    ).toBeTruthy();
  });

  it("AC2: pide confirmación con el nombre del visitante y envía la salida con los filtros", async () => {
    urlParams.current = new URLSearchParams("towerId=t1");
    await renderPage({ towerId: "t1" });

    fireEvent.click(
      screen.getByRole("button", { name: "Registrar la salida de Ana López" }),
    );
    const dialogo = screen.getByRole("dialog");
    expect(
      within(dialogo).getByRole("heading", {
        name: "¿Registrar la salida de Ana López?",
      }),
    ).toBeTruthy();

    fireEvent.click(within(dialogo).getByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(registrarSalidaMock).toHaveBeenCalledWith(
        {},
        { id: VISIT_ID, query: "towerId=t1" },
      ),
    );
  });

  it("AC2: Cancelar cierra la confirmación sin registrar la salida", async () => {
    await renderPage();

    fireEvent.click(
      screen.getByRole("button", { name: "Registrar la salida de Ana López" }),
    );
    const dialogo = screen.getByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }));

    expect(dialogo.hasAttribute("open")).toBe(false);
    expect(registrarSalidaMock).not.toHaveBeenCalled();
  });

  it("AC2: con éxito vuelve a la lista recargada con la hora de salida y los mismos filtros", async () => {
    const registrarSalida = await accionReal();
    apiFetch.mockResolvedValue(
      respuesta({ id: VISIT_ID, exitAt: "2026-11-19T20:30:00Z" }),
    );

    await expect(
      registrarSalida(
        {},
        { id: VISIT_ID, query: "towerId=t1&search=ana&alerta=sin-entrada" },
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(apiFetch).toHaveBeenCalledWith(
      `seguridad/visitas/${VISIT_ID}/salida`,
      {
        method: "POST",
      },
    );
    expect(revalidatePath).toHaveBeenCalledWith("/seguridad/dentro");
    expect(redirect).toHaveBeenCalledWith(
      "/seguridad/dentro?towerId=t1&search=ana&aviso=salida&hora=14%3A30",
    );
  });

  it('AC2: muestra "Salida registrada a las HH:mm" y quita el aviso de la URL', async () => {
    urlParams.current = new URLSearchParams("aviso=salida&hora=14:30");
    await renderPage({ aviso: "salida", hora: "14:30" });

    expect(screen.getByRole("status").textContent).toBe(
      "Salida registrada a las 14:30",
    );
    expect(router.replace).toHaveBeenCalledWith("/seguridad/dentro", {
      scroll: false,
    });
  });

  it("AC2: una hora mal formada en la URL no muestra ningún aviso", async () => {
    await renderPage({ aviso: "salida", hora: "<b>99:99</b>" });

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("AC3: si la visita ya no está Dentro (409) vuelve a la lista recargada con la alerta", async () => {
    const registrarSalida = await accionReal();
    apiFetch.mockResolvedValue(
      respuesta(
        { message: "Este visitante no tiene una entrada activa." },
        409,
      ),
    );

    await expect(
      registrarSalida({}, { id: VISIT_ID, query: "towerId=t1" }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(revalidatePath).toHaveBeenCalledWith("/seguridad/dentro");
    expect(redirect).toHaveBeenCalledWith(
      "/seguridad/dentro?towerId=t1&alerta=sin-entrada",
    );
  });

  it('AC3: muestra "Este visitante no tiene una entrada activa."', async () => {
    await renderPage({ alerta: "sin-entrada" });

    expect(screen.getByRole("alert").textContent).toBe(
      "Este visitante no tiene una entrada activa.",
    );
  });

  it("AC3: una clave de alerta desconocida en la URL no muestra texto", async () => {
    await renderPage({ alerta: "Tu cuenta fue bloqueada" });

    expect(screen.queryByRole("alert")).toBeNull();
  });
});
