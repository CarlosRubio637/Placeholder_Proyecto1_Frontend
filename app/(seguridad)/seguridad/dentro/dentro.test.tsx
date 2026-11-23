import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActualizarDentro } from "./actualizar";
import DentroPage from "./page";

const apiFetch = vi.hoisted(() => vi.fn());
const requireRole = vi.hoisted(() => vi.fn());
const router = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  push: vi.fn(),
}));
const urlParams = vi.hoisted(() => ({ current: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
  unstable_rethrow: vi.fn(),
  useRouter: () => router,
  usePathname: () => "/seguridad/dentro",
  useSearchParams: () => urlParams.current,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch, requireRole }));
vi.mock("@/app/actions/salidas", () => ({ registrarSalida: vi.fn() }));

const TORRE_A = "0b6a1f3e-2c4d-4e5f-8a9b-0c1d2e3f4a5b";

const ana = {
  id: "3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b",
  visitorName: "Ana López",
  documentType: "DUI",
  documentNumber: "01234567-8",
  unitCode: "A-101",
  reason: "Visita familiar",
  entryAt: "2026-11-19T16:05:00Z", // 10:05 en El Salvador
  minutesInside: 265,
};
const pedro = {
  id: "7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f",
  visitorName: "Pedro Martínez",
  documentType: "PASAPORTE",
  documentNumber: "C1112223",
  unitCode: "B-203",
  reason: "Entrega de muebles",
  entryAt: "2026-11-19T18:40:00Z",
  minutesInside: 110,
};

type Lista = { totalInside: number; data: unknown[]; total: number };

function respuesta(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function apiCon(lista: Lista) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path === "torres")
      return respuesta([{ id: TORRE_A, name: "Torre A", letter: "A" }]);
    if (path.startsWith("seguridad/visitas/dentro")) {
      return respuesta({ ...lista, page: 1, pageSize: 50 });
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

function filas() {
  // La primera fila es la de encabezados.
  return screen.getAllByRole("row").slice(1);
}

function visibilidad(estado: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => estado,
  });
}

describe("H18. Consulta de visitantes dentro del condominio", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    router.replace.mockReset();
    router.refresh.mockReset();
    requireRole.mockResolvedValue({ id: "guard-1", role: "SEGURIDAD" });
    urlParams.current = new URLSearchParams();
    visibilidad("visible");
    apiCon({ totalInside: 2, data: [ana, pedro], total: 2 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC1: muestra las columnas y los datos de cada visita dentro", async () => {
    await renderPage();

    const encabezados = screen
      .getAllByRole("columnheader")
      .map((th) => th.textContent);
    expect(encabezados).toEqual([
      "Visitante",
      "Documento",
      "Unidad",
      "Motivo",
      "Entrada",
      "Tiempo dentro",
      "Acciones",
    ]);

    const [primera] = filas();
    const celdas = Array.from(primera.querySelectorAll("td")).map(
      (td) => td.textContent,
    );
    expect(celdas.slice(0, 4)).toEqual([
      "Ana López",
      "DUI 01234567-8",
      "A-101",
      "Visita familiar",
    ]);
    expect(celdas[4]).toContain("10:05");
    expect(celdas[5]).toBe("4 h 25 min");
  });

  it("AC1: muestra el total de visitantes dentro", async () => {
    await renderPage();

    const tarjeta = screen.getByText("Visitantes dentro")
      .parentElement as HTMLElement;
    expect(tarjeta.textContent).toContain("2");
  });

  it("AC1: respeta el orden del servidor (entrada más antigua primero) y pide 50 por página", async () => {
    await renderPage();

    expect(filas().map((tr) => tr.querySelector("td")?.textContent)).toEqual([
      "Ana López",
      "Pedro Martínez",
    ]);
    expect(apiFetch).toHaveBeenCalledWith(
      "seguridad/visitas/dentro?page=1&pageSize=50",
    );
    expect(screen.getByText(/50 por página/)).toBeTruthy();
  });

  it("AC2: envía la torre y la búsqueda de la URL a la consulta", async () => {
    await renderPage({ towerId: TORRE_A, search: " lopez " });

    expect(apiFetch).toHaveBeenCalledWith(
      `seguridad/visitas/dentro?towerId=${TORRE_A}&search=lopez&page=1&pageSize=50`,
    );
  });

  it("AC2: una torre mal formada en la URL se ignora", async () => {
    await renderPage({ towerId: "abc" });

    expect(apiFetch).toHaveBeenCalledWith(
      "seguridad/visitas/dentro?page=1&pageSize=50",
    );
  });

  it("AC2: filtrar por torre actualiza la URL", async () => {
    await renderPage();

    fireEvent.change(screen.getByRole("combobox", { name: "Torre" }), {
      target: { value: TORRE_A },
    });

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        `/seguridad/dentro?towerId=${TORRE_A}`,
      ),
    );
  });

  it("AC2: buscar por nombre o documento actualiza la URL al dejar de escribir", async () => {
    await renderPage();

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar" }), {
      target: { value: "López " },
    });

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        "/seguridad/dentro?search=L%C3%B3pez",
      ),
    );
  });

  it("AC2: sin coincidencias muestra que ningún visitante coincide", async () => {
    apiCon({ totalInside: 2, data: [], total: 0 });

    await renderPage({ search: "zzz" });

    expect(
      screen.getByText("Ningún visitante dentro coincide con la búsqueda."),
    ).toBeTruthy();
  });

  it("AC3: se actualiza cada 30 segundos mientras la pantalla está visible", () => {
    vi.useFakeTimers();
    render(<ActualizarDentro />);

    act(() => {
      vi.advanceTimersByTime(29_999);
    });
    expect(router.refresh).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("AC3: con la pestaña oculta no consulta y se pone al día al volver", () => {
    vi.useFakeTimers();
    render(<ActualizarDentro />);

    visibilidad("hidden");
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(router.refresh).not.toHaveBeenCalled();

    visibilidad("visible");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("AC3: el botón Actualizar vuelve a consultar la lista", () => {
    render(<ActualizarDentro />);

    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));

    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it('AC3: sin visitantes muestra "No hay visitantes dentro del condominio."', async () => {
    apiCon({ totalInside: 0, data: [], total: 0 });

    await renderPage();

    expect(
      screen.getByText("No hay visitantes dentro del condominio."),
    ).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
