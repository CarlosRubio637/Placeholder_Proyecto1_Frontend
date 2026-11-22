import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type * as PaquetesActions from "@/app/actions/paquetes";
import {
  MESSAGES,
  validatePaquete,
  type PaqueteValues,
} from "@/lib/validation/paquete";
import PaquetesPage from "./page";
import { RegistrarPaquete } from "./registrar-paquete";

const apiFetch = vi.hoisted(() => vi.fn());
const requireRole = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());
const guardarPaqueteMock = vi.hoisted(() => vi.fn());
const listarUnidadesMock = vi.hoisted(() => vi.fn());
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
// El formulario usa versiones simuladas; la acción real se prueba aparte.
vi.mock("@/app/actions/paquetes", () => ({
  guardarPaquete: guardarPaqueteMock,
  listarUnidades: listarUnidadesMock,
}));
vi.mock("@/app/actions/entregas", () => ({ entregarPaquete: vi.fn() }));

const TORRE_A = "0b6a1f3e-2c4d-4e5f-8a9b-0c1d2e3f4a5b";
const TORRE_B = "1c7b2a4f-3d5e-4f60-9b0c-1d2e3f4a5b6c";
const UNIDAD_A101 = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

const TORRES = [
  { id: TORRE_A, name: "Torre A", letter: "A" },
  { id: TORRE_B, name: "Torre B", letter: "B" },
];

const reciente = {
  id: "pkg-2",
  code: "PQ-20261121-0002",
  unit: { id: UNIDAD_A101, code: "A-101" },
  courier: "DHL",
  trackingNumber: "DHL-123456",
  notes: "Caja mediana",
  status: "PENDIENTE_ENTREGA",
  receivedAt: "2026-11-21T16:42:00Z", // 10:42 en El Salvador
};
const anterior = {
  ...reciente,
  id: "pkg-1",
  code: "PQ-20261121-0001",
  unit: { id: "u-b101", code: "B-101" },
  courier: "Cargo Expreso",
  trackingNumber: null,
  notes: null,
  receivedAt: "2026-11-21T15:10:00Z",
};

function respuesta(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function apiCon(data: unknown[]) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path === "torres") return respuesta(TORRES);
    if (path.startsWith("seguridad/paquetes?")) {
      return respuesta({ data, total: data.length, page: 1, pageSize: 20 });
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

async function accionReal() {
  return vi.importActual<typeof PaquetesActions>("@/app/actions/paquetes");
}

function abrirFormulario() {
  render(<RegistrarPaquete torres={TORRES} />);
  fireEvent.click(screen.getByRole("button", { name: "Registrar paquete" }));
  return screen.getByRole("dialog");
}

const valores = (change: Partial<PaqueteValues> = {}): PaqueteValues => ({
  towerId: TORRE_A,
  unitId: UNIDAD_A101,
  courier: "DHL",
  trackingNumber: "",
  notes: "",
  ...change,
});

describe("H19. Registro de llegada de paquetes", () => {
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
    guardarPaqueteMock.mockReset();
    guardarPaqueteMock.mockResolvedValue({});
    listarUnidadesMock.mockReset();
    listarUnidadesMock.mockResolvedValue({
      data: [
        { id: UNIDAD_A101, code: "A-101", number: "101", residentCount: 2 },
        { id: "u-a102", code: "A-102", number: "102", residentCount: 1 },
      ],
    });
    requireRole.mockResolvedValue({ id: "guard-1", role: "SEGURIDAD" });
    urlParams.current = new URLSearchParams();
    apiCon([reciente, anterior]);
  });

  it("AC1: pide torre, unidad, empresa, guía y observaciones", () => {
    const dialogo = abrirFormulario();

    for (const nombre of ["Torre", "Unidad"]) {
      expect(
        within(dialogo).getByRole("combobox", { name: nombre }),
      ).toBeTruthy();
    }
    for (const nombre of [
      "Empresa de mensajería",
      "Número de guía",
      "Observaciones",
    ]) {
      expect(
        within(dialogo).getByRole("textbox", { name: nombre }),
      ).toBeTruthy();
    }
    const unidad = within(dialogo).getByRole("combobox", {
      name: "Unidad",
    }) as HTMLSelectElement;
    expect(unidad.disabled).toBe(true);
  });

  it("AC1: al elegir la torre carga sus unidades por código", async () => {
    const dialogo = abrirFormulario();

    fireEvent.change(within(dialogo).getByRole("combobox", { name: "Torre" }), {
      target: { value: TORRE_A },
    });

    expect(listarUnidadesMock).toHaveBeenCalledWith(TORRE_A);
    expect(
      await within(dialogo).findByRole("option", { name: "A-101" }),
    ).toBeTruthy();
    expect(within(dialogo).getByRole("option", { name: "A-102" })).toBeTruthy();
  });

  it("AC1: valida empresa (2 a 40), guía opcional (4 a 40, letras, números y guiones) y observaciones (200)", () => {
    expect(validatePaquete(valores())).toEqual({});
    expect(validatePaquete(valores({ trackingNumber: "DHL-123456" }))).toEqual(
      {},
    );
    expect(validatePaquete(valores({ unitId: "" }))).toEqual({
      unitId: MESSAGES.unit,
    });
    expect(validatePaquete(valores({ courier: "D" }))).toEqual({
      courier: MESSAGES.courier,
    });
    expect(validatePaquete(valores({ courier: "x".repeat(41) }))).toEqual({
      courier: MESSAGES.courier,
    });
    expect(validatePaquete(valores({ trackingNumber: "ab#1" }))).toEqual({
      trackingNumber: MESSAGES.tracking,
    });
    expect(validatePaquete(valores({ trackingNumber: "AB1" }))).toEqual({
      trackingNumber: MESSAGES.tracking,
    });
    expect(validatePaquete(valores({ notes: "x".repeat(201) }))).toEqual({
      notes: MESSAGES.notes,
    });
  });

  it("AC1: muestra el error de la empresa y no deja guardar", () => {
    const dialogo = abrirFormulario();
    const empresa = within(dialogo).getByRole("textbox", {
      name: "Empresa de mensajería",
    });

    fireEvent.change(empresa, { target: { value: "D" } });
    fireEvent.blur(empresa);

    expect(within(dialogo).getByText(MESSAGES.courier)).toBeTruthy();
    expect(
      (
        within(dialogo).getByRole("button", {
          name: "Guardar",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("AC2: con datos válidos envía el paquete sin espacios sobrantes", async () => {
    const dialogo = abrirFormulario();

    fireEvent.change(within(dialogo).getByRole("combobox", { name: "Torre" }), {
      target: { value: TORRE_A },
    });
    await within(dialogo).findByRole("option", { name: "A-101" });
    fireEvent.change(
      within(dialogo).getByRole("combobox", { name: "Unidad" }),
      {
        target: { value: UNIDAD_A101 },
      },
    );
    fireEvent.change(
      within(dialogo).getByRole("textbox", { name: "Empresa de mensajería" }),
      {
        target: { value: "  DHL " },
      },
    );
    fireEvent.change(
      within(dialogo).getByRole("textbox", { name: "Número de guía" }),
      {
        target: { value: "DHL-123456" },
      },
    );
    fireEvent.change(
      within(dialogo).getByRole("textbox", { name: "Observaciones" }),
      {
        target: { value: "Caja mediana" },
      },
    );
    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(guardarPaqueteMock).toHaveBeenCalledWith(
        {},
        {
          towerId: TORRE_A,
          unitId: UNIDAD_A101,
          courier: "DHL",
          trackingNumber: "DHL-123456",
          notes: "Caja mediana",
        },
      ),
    );
  });

  it('AC2: al guardar vuelve a la lista con "Paquete <código> registrado para <unidad>"', async () => {
    const { guardarPaquete } = await accionReal();
    apiFetch.mockResolvedValue(
      respuesta(
        { id: "pkg-3", code: "PQ-20261121-0003", unit: { code: "A-101" } },
        201,
      ),
    );

    await expect(
      guardarPaquete(
        {},
        valores({
          courier: "DHL",
          trackingNumber: "DHL-123456",
          notes: "Caja mediana",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(apiFetch).toHaveBeenCalledWith("seguridad/paquetes", {
      method: "POST",
      body: JSON.stringify({
        unitId: UNIDAD_A101,
        courier: "DHL",
        trackingNumber: "DHL-123456",
        notes: "Caja mediana",
      }),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/seguridad/paquetes");
    expect(redirect).toHaveBeenCalledWith(
      `/seguridad/paquetes?aviso=${encodeURIComponent("Paquete PQ-20261121-0003 registrado para A-101")}`,
    );
  });

  it("AC2: muestra el aviso de paquete registrado", async () => {
    await renderPage({
      aviso: "Paquete PQ-20261121-0003 registrado para A-101",
    });

    expect(screen.getByRole("status").textContent).toBe(
      "Paquete PQ-20261121-0003 registrado para A-101",
    );
  });

  it("AC2: el formulario se abre limpio cada vez", () => {
    const dialogo = abrirFormulario();
    const empresa = () =>
      within(dialogo).getByRole("textbox", {
        name: "Empresa de mensajería",
      }) as HTMLInputElement;

    fireEvent.change(empresa(), { target: { value: "DHL" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }));
    fireEvent.click(screen.getByRole("button", { name: "Registrar paquete" }));

    expect(empresa().value).toBe("");
  });

  it("AC2: si la unidad no tiene residentes (409) muestra el error en la unidad", async () => {
    const { guardarPaquete } = await accionReal();
    apiFetch.mockResolvedValue(
      respuesta({ message: "La unidad no tiene residentes registrados." }, 409),
    );

    await expect(guardarPaquete({}, valores())).resolves.toEqual({
      errors: { unitId: "La unidad no tiene residentes registrados." },
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("AC3: la tabla de pendientes muestra código, unidad, empresa, guía, recepción y observaciones", async () => {
    await renderPage();

    const encabezados = screen
      .getAllByRole("columnheader")
      .map((th) => th.textContent);
    expect(encabezados).toEqual([
      "Código",
      "Unidad",
      "Empresa",
      "Guía",
      "Recibido",
      "Observaciones",
      "Acciones",
    ]);

    const [primera, segunda] = screen.getAllByRole("row").slice(1);
    const celdas = Array.from(primera.querySelectorAll(":scope > td")).map(
      (td) => td.textContent,
    );
    expect(celdas.slice(0, 4)).toEqual([
      "PQ-20261121-0002",
      "A-101",
      "DHL",
      "DHL-123456",
    ]);
    expect(celdas[4]).toContain("21/11/2026");
    expect(celdas[4]).toContain("10:42");
    expect(celdas[5]).toBe("Caja mediana");

    const otras = Array.from(segunda.querySelectorAll(":scope > td")).map(
      (td) => td.textContent,
    );
    expect(otras[3]).toBe("—");
    expect(otras[5]).toBe("—");
  });

  it("AC3: pide solo pendientes, 20 por página, y respeta el orden del servidor (más reciente primero)", async () => {
    await renderPage();

    expect(apiFetch).toHaveBeenCalledWith(
      "seguridad/paquetes?status=PENDIENTE_ENTREGA&page=1&pageSize=20",
    );
    const codigos = screen
      .getAllByRole("row")
      .slice(1)
      .map((tr) => tr.querySelector("td")?.textContent);
    expect(codigos).toEqual(["PQ-20261121-0002", "PQ-20261121-0001"]);
    expect(screen.getByText(/20 por página/)).toBeTruthy();
  });

  it("AC3: sin pendientes muestra el mensaje de lista vacía", async () => {
    apiCon([]);

    await renderPage();

    expect(
      screen.getByText("No hay paquetes pendientes de entrega."),
    ).toBeTruthy();
  });
});
