import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type * as EntregasActions from "@/app/actions/entregas";
import {
  ENTREGA_MESSAGES,
  validateEntrega,
  type EntregaValues,
} from "@/lib/validation/entrega";
import PaquetesPage from "./page";

const apiFetch = vi.hoisted(() => vi.fn());
const requireRole = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());
const entregarPaqueteMock = vi.hoisted(() => vi.fn());
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
  usePathname: () => "/seguridad/paquetes",
  useSearchParams: () => urlParams.current,
}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/api", () => ({ apiFetch, requireRole }));
vi.mock("@/app/actions/paquetes", () => ({
  guardarPaquete: vi.fn(),
  listarUnidades: vi.fn(),
}));
// El diálogo usa una versión simulada; la acción real se prueba aparte.
vi.mock("@/app/actions/entregas", () => ({
  entregarPaquete: entregarPaqueteMock,
}));

const PKG_ID = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a";

const paquete = {
  id: PKG_ID,
  code: "PQ-20261121-0003",
  unit: { id: "u-a101", code: "A-101" },
  courier: "DHL",
  trackingNumber: "DHL-123456",
  notes: "Caja mediana",
  status: "PENDIENTE_ENTREGA",
  receivedAt: "2026-11-21T16:42:00Z", // 10:42 en El Salvador
};

function respuesta(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function apiConPendientes() {
  apiFetch.mockImplementation(async (path: string) => {
    if (path === "torres") return respuesta([]);
    if (path.startsWith("seguridad/paquetes?")) {
      return respuesta({ data: [paquete], total: 1, page: 1, pageSize: 20 });
    }
    throw new Error(`Ruta inesperada: ${path}`);
  });
}

async function renderPage(searchParams: Record<string, string> = {}) {
  const ui = await PaquetesPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(searchParams),
  } as never);
  return render(ui);
}

async function abrirEntrega() {
  await renderPage();
  fireEvent.click(
    screen.getByRole("button", { name: `Entregar el paquete ${paquete.code}` }),
  );
  return screen.getByRole("dialog", { name: "Entregar paquete" });
}

function llenar(dialogo: HTMLElement, nombre: string, documento: string) {
  fireEvent.change(
    within(dialogo).getByRole("textbox", { name: "Nombre de quien recoge" }),
    {
      target: { value: nombre },
    },
  );
  fireEvent.change(
    within(dialogo).getByRole("textbox", { name: "Número de documento" }),
    {
      target: { value: documento },
    },
  );
}

async function accionReal() {
  const actual = await vi.importActual<typeof EntregasActions>(
    "@/app/actions/entregas",
  );
  return actual.entregarPaquete;
}

const valores = (change: Partial<EntregaValues> = {}): EntregaValues => ({
  pickedUpByName: "Ana López",
  pickedUpByDocType: "DUI",
  pickedUpByDocNumber: "01234567-8",
  ...change,
});

describe("H21. Entrega de paquetes en portería", () => {
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
    entregarPaqueteMock.mockReset();
    entregarPaqueteMock.mockResolvedValue({});
    requireRole.mockResolvedValue({ id: "guard-1", role: "SEGURIDAD" });
    urlParams.current = new URLSearchParams();
    apiConPendientes();
  });

  it("AC1: busca pendientes por unidad, código o guía", async () => {
    await renderPage({ search: "A-101" });

    expect(apiFetch).toHaveBeenCalledWith(
      "seguridad/paquetes?status=PENDIENTE_ENTREGA&search=A-101&page=1&pageSize=20",
    );
  });

  it("AC1: escribir en Buscar actualiza la URL", async () => {
    await renderPage();

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar" }), {
      target: { value: "PQ-2026" },
    });

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        "/seguridad/paquetes?search=PQ-2026",
      ),
    );
  });

  it("AC1: cada paquete pendiente de la tabla tiene el botón Entregar", async () => {
    await renderPage();

    const fila = screen
      .getByRole("cell", { name: paquete.code })
      .closest("tr") as HTMLElement;
    expect(
      within(fila).getByRole("button", {
        name: `Entregar el paquete ${paquete.code}`,
      }),
    ).toBeTruthy();
  });

  it("AC2: el formulario muestra la unidad y los datos del paquete", async () => {
    const dialogo = await abrirEntrega();

    const datos = Array.from(dialogo.querySelectorAll("dd")).map(
      (dd) => dd.textContent,
    );
    expect(datos.slice(0, 4)).toEqual([
      "PQ-20261121-0003",
      "A-101",
      "DHL",
      "DHL-123456",
    ]);
    expect(datos[4]).toContain("10:42");
    expect(datos[5]).toBe("Caja mediana");
  });

  it("AC2: pide nombre, tipo de documento (DUI o Pasaporte) y número", async () => {
    const dialogo = await abrirEntrega();

    expect(
      within(dialogo).getByRole("textbox", { name: "Nombre de quien recoge" }),
    ).toBeTruthy();
    expect(
      (within(dialogo).getByRole("radio", { name: "DUI" }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(
      within(dialogo).getByRole("radio", { name: "Pasaporte" }),
    ).toBeTruthy();
    expect(
      within(dialogo).getByRole("textbox", { name: "Número de documento" }),
    ).toBeTruthy();
  });

  it("AC2: valida el nombre (3 a 80 letras) y el documento con el formato de H14", () => {
    expect(validateEntrega(valores())).toEqual({});
    expect(
      validateEntrega(
        valores({
          pickedUpByDocType: "PASAPORTE",
          pickedUpByDocNumber: "AB123456",
        }),
      ),
    ).toEqual({});
    expect(validateEntrega(valores({ pickedUpByName: "Al" }))).toEqual({
      pickedUpByName: ENTREGA_MESSAGES.name,
    });
    expect(validateEntrega(valores({ pickedUpByName: "Ana 123" }))).toEqual({
      pickedUpByName: ENTREGA_MESSAGES.name,
    });
    expect(validateEntrega(valores({ pickedUpByDocNumber: "1234" }))).toEqual({
      pickedUpByDocNumber: ENTREGA_MESSAGES.dui,
    });
    expect(
      validateEntrega(
        valores({ pickedUpByDocType: "PASAPORTE", pickedUpByDocNumber: "AB1" }),
      ),
    ).toEqual({ pickedUpByDocNumber: ENTREGA_MESSAGES.passport });
  });

  it("AC2: muestra el error del documento y no deja continuar", async () => {
    const dialogo = await abrirEntrega();

    llenar(dialogo, "Ana López", "1234");
    fireEvent.blur(
      within(dialogo).getByRole("textbox", { name: "Número de documento" }),
    );

    expect(within(dialogo).getByText(ENTREGA_MESSAGES.dui)).toBeTruthy();
    expect(
      (
        within(dialogo).getByRole("button", {
          name: "Confirmar entrega",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("AC3: pide confirmación con el código, la unidad y el nombre, y luego registra la entrega", async () => {
    const dialogo = await abrirEntrega();

    llenar(dialogo, "  Ana   López ", "01234567-8");
    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Confirmar entrega" }),
    );

    expect(
      within(dialogo).getByText(
        "¿Entregar el paquete PQ-20261121-0003 de la unidad A-101 a Ana López?",
      ),
    ).toBeTruthy();

    fireEvent.click(within(dialogo).getByRole("button", { name: "Entregar" }));

    await waitFor(() =>
      expect(entregarPaqueteMock).toHaveBeenCalledWith(
        {},
        {
          id: PKG_ID,
          pickedUpByName: "Ana López",
          pickedUpByDocType: "DUI",
          pickedUpByDocNumber: "01234567-8",
        },
      ),
    );
  });

  it('AC3: con éxito vuelve a la lista recargada con "Paquete entregado"', async () => {
    const entregarPaquete = await accionReal();
    apiFetch.mockResolvedValue(respuesta({ id: PKG_ID, status: "ENTREGADO" }));

    await expect(
      entregarPaquete({}, { id: PKG_ID, ...valores() }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(apiFetch).toHaveBeenCalledWith(
      `seguridad/paquetes/${PKG_ID}/entrega`,
      {
        method: "POST",
        body: JSON.stringify(valores()),
      },
    );
    expect(revalidatePath).toHaveBeenCalledWith("/seguridad/paquetes");
    expect(redirect).toHaveBeenCalledWith(
      `/seguridad/paquetes?aviso=${encodeURIComponent("Paquete entregado")}`,
    );
  });

  it('AC3: muestra el aviso "Paquete entregado"', async () => {
    await renderPage({ aviso: "Paquete entregado" });

    expect(screen.getByRole("status").textContent).toBe("Paquete entregado");
  });

  it("AC3: si otro agente ya lo entregó (409) vuelve a la lista con la alerta", async () => {
    const entregarPaquete = await accionReal();
    const mensaje =
      "Este paquete ya fue entregado el 21/11/2026 a Pedro Martínez.";
    apiFetch.mockResolvedValue(respuesta({ message: mensaje }, 409));

    await expect(
      entregarPaquete({}, { id: PKG_ID, ...valores() }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(revalidatePath).toHaveBeenCalledWith("/seguridad/paquetes");
    expect(redirect).toHaveBeenCalledWith(
      `/seguridad/paquetes?alerta=${encodeURIComponent(mensaje)}`,
    );
  });
});
