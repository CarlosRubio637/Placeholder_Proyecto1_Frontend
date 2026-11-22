import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { formatHora, type Solicitud, type VisitaPorteria } from "@/lib/entradas";
import type { Torre } from "@/lib/paquetes";
import { Porteria } from "./porteria";

const apiFetch = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({ apiFetch }));
vi.mock("next/navigation", () => ({
  unstable_rethrow: vi.fn(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const HOUR = 3_600_000;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

const TORRES: Torre[] = [
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "Torre A", letter: "A" },
  { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "Torre B", letter: "B" },
];
const A101 = "c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1";

const autorizada: VisitaPorteria = {
  id: "11111111-1111-4111-8111-111111111111",
  code: "K7M2QX",
  origin: "PREAUTORIZADA",
  visitorName: "Rosa Martínez",
  documentType: "DUI",
  documentNumber: "01234567-8",
  unitCode: "A-101",
  reason: "Visita familiar",
  visitDate: "2026-11-21",
  status: "AUTORIZADA",
  validFrom: iso(-2 * HOUR),
  validUntil: iso(2 * HOUR),
};
const solicitud = (change: Partial<Solicitud> = {}): Solicitud => ({
  ...autorizada,
  id: "22222222-2222-4222-8222-222222222222",
  code: null,
  origin: "SIN_AUTORIZACION_PREVIA",
  visitorName: "Pedro Gómez",
  reason: "Entrega de muebles",
  status: "PENDIENTE_AUTORIZACION",
  rejectReason: null,
  createdAt: iso(0),
  expiresAt: iso(15 * 60_000 - 1000),
  ...change,
});

type Route = { method?: string; body?: unknown };
/** Backend simulado por ruta; `solicitudes` es la lista "Esperando respuesta". */
function backend(state: { buscar?: VisitaPorteria[]; solicitudes?: Solicitud[]; entryAt?: string } = {}) {
  apiFetch.mockImplementation(async (path: string, init: Route = {}) => {
    if (path.startsWith("seguridad/visitas/buscar")) return json({ data: state.buscar ?? [] });
    if (path === "seguridad/visitas/solicitudes" && init.method === "POST") {
      return json({ id: "nueva", status: "PENDIENTE_AUTORIZACION", unitCode: "A-101" }, 201);
    }
    if (path === "seguridad/visitas/solicitudes") return json({ data: state.solicitudes ?? [] });
    if (path.endsWith("/entrada")) return json({ status: "DENTRO", entryAt: state.entryAt });
    if (path.startsWith("unidades?")) {
      return json([
        { id: A101, code: "A-101", number: "101", residentCount: 2 },
        { id: "c2", code: "A-104", number: "104", residentCount: 0 },
      ]);
    }
    throw new Error(`ruta inesperada ${path}`);
  });
}

function renderPorteria(initialSolicitudes: Solicitud[] = []) {
  render(<Porteria torres={TORRES} initialSolicitudes={initialSolicitudes} />);
}

async function buscar(q: string) {
  fireEvent.change(screen.getByLabelText("Código o número de documento"), { target: { value: q } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
  });
}

const tabla = () => screen.getByRole("heading", { name: "Esperando respuesta" }).closest("section")!;
/** Primera fila de datos de la tabla "Esperando respuesta". */
const primeraFila = () => within(within(tabla()).getAllByRole("row")[1]);

describe("H16. Registro de entrada de visitantes", () => {
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
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC1: busca por código y muestra visitante, documento, unidad, motivo, fecha, vigencia y estado", async () => {
    backend({ buscar: [autorizada] });
    renderPorteria();

    await buscar(" k7m2qx ");

    expect(apiFetch).toHaveBeenCalledWith("seguridad/visitas/buscar?q=K7M2QX");
    const card = screen.getByRole("article", { name: "Autorización de Rosa Martínez" });
    for (const text of ["Rosa Martínez", "DUI 01234567-8", "A-101", "Visita familiar", "Autorizada"]) {
      expect(within(card).getByText(text)).toBeTruthy();
    }
    expect(within(card).getByText(/Fecha:/).nextSibling?.textContent).toMatch(/2026/);
    expect(within(card).getByText(`${formatHora(autorizada.validFrom)} a ${formatHora(autorizada.validUntil)}`)).toBeTruthy();
    expect(within(card).getByRole("button", { name: "Registrar entrada" })).toBeTruthy();
  });

  it("AC1: también busca por número de documento", async () => {
    backend({ buscar: [autorizada] });
    renderPorteria();

    await buscar("01234567-8");

    expect(apiFetch).toHaveBeenCalledWith("seguridad/visitas/buscar?q=01234567-8");
  });

  it.each<[string, Partial<VisitaPorteria>]>([
    ["fuera de su vigencia", { validFrom: iso(2 * HOUR), validUntil: iso(4 * HOUR) }],
    ["Cancelada", { status: "CANCELADA" }],
    ["Dentro", { status: "DENTRO" }],
  ])("AC1: una autorización %s no muestra Registrar entrada", async (_caso, change) => {
    backend({ buscar: [{ ...autorizada, ...change }] });
    renderPorteria();

    await buscar("K7M2QX");

    expect(screen.queryByRole("button", { name: "Registrar entrada" })).toBeNull();
  });

  it("AC1: sin resultados dice «No se encontró una autorización con ese código o documento.»", async () => {
    backend({ buscar: [] });
    renderPorteria();

    await buscar("ZZZZZZ");

    expect(screen.getByText("No se encontró una autorización con ese código o documento.")).toBeTruthy();
  });

  it("AC2: «Visitante sin autorización» pide nombre, documento, torre, unidad y motivo con las validaciones de H14", async () => {
    backend();
    renderPorteria();

    fireEvent.click(screen.getByRole("button", { name: "Visitante sin autorización" }));
    const dialog = document.querySelector("dialog")!;
    expect(dialog.open).toBe(true);
    const form = within(dialog);
    expect(form.getAllByRole("option", { hidden: true }).map((o) => o.textContent)).toEqual(
      expect.arrayContaining(["DUI", "Pasaporte", "Torre A", "Torre B"]),
    );

    fireEvent.change(form.getByLabelText("Nombre del visitante"), { target: { value: "P3" } });
    fireEvent.blur(form.getByLabelText("Nombre del visitante"));
    expect(form.getByText("El nombre debe tener entre 3 y 80 caracteres, solo letras y espacios.")).toBeTruthy();

    // Al elegir la torre trae sus unidades; una sin residentes no se puede elegir.
    await act(async () => {
      fireEvent.change(form.getByLabelText("Torre"), { target: { value: TORRES[0].id } });
    });
    expect(apiFetch).toHaveBeenCalledWith(`unidades?towerId=${TORRES[0].id}`);
    const sinResidentes = form.getByRole("option", { name: "A-104 (sin residentes)", hidden: true }) as HTMLOptionElement;
    expect(sinResidentes.disabled).toBe(true);
  });

  it("AC2: al enviar, la solicitud queda en «Esperando respuesta» con 15 minutos", async () => {
    backend({ solicitudes: [solicitud()] });
    renderPorteria();

    fireEvent.click(screen.getByRole("button", { name: "Visitante sin autorización" }));
    const form = within(document.querySelector("dialog")!);
    fireEvent.change(form.getByLabelText("Nombre del visitante"), { target: { value: "Pedro Gómez" } });
    fireEvent.change(form.getByLabelText("Documento"), { target: { value: "DUI" } });
    fireEvent.change(form.getByLabelText("Número"), { target: { value: "01234567-8" } });
    await act(async () => {
      fireEvent.change(form.getByLabelText("Torre"), { target: { value: TORRES[0].id } });
    });
    fireEvent.change(form.getByLabelText("Unidad"), { target: { value: A101 } });
    fireEvent.change(form.getByLabelText("Motivo"), { target: { value: "Entrega de muebles" } });
    await act(async () => {
      fireEvent.click(form.getByRole("button", { name: "Enviar solicitud", hidden: true }));
    });

    expect(apiFetch).toHaveBeenCalledWith("seguridad/visitas/solicitudes", {
      method: "POST",
      body: JSON.stringify({
        visitorName: "Pedro Gómez",
        documentType: "DUI",
        documentNumber: "01234567-8",
        unitId: A101,
        reason: "Entrega de muebles",
      }),
    });
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Solicitud enviada a la unidad A-101"));
    expect(primeraFila().getByText("Pedro Gómez")).toBeTruthy();
    expect(primeraFila().getByText("Esperando respuesta")).toBeTruthy();
    expect(primeraFila().getByText("Quedan 15 min")).toBeTruthy();
  });

  it("AC3: «Esperando respuesta» se actualiza cada 15 segundos", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    backend({ solicitudes: [solicitud({ status: "AUTORIZADA" })] });
    renderPorteria([solicitud()]);

    expect(primeraFila().getByText("Esperando respuesta")).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });

    expect(apiFetch).toHaveBeenCalledWith("seguridad/visitas/solicitudes");
    await waitFor(() => expect(primeraFila().getByText("Aprobada")).toBeTruthy());
  });

  it("AC3: el botón Actualizar vuelve a consultar la lista", async () => {
    backend({ solicitudes: [] });
    renderPorteria([solicitud()]);

    await act(async () => {
      fireEvent.click(within(tabla()).getByRole("button", { name: "Actualizar" }));
    });

    expect(apiFetch).toHaveBeenCalledWith("seguridad/visitas/solicitudes");
    expect(within(tabla()).getByText("No hay solicitudes esperando respuesta.")).toBeTruthy();
  });

  it("AC3: aprobada muestra «Aprobada» y Registrar entrada; rechazada muestra «Rechazada» y el motivo", () => {
    renderPorteria([
      solicitud({ status: "AUTORIZADA", expiresAt: null }),
      solicitud({
        id: "33333333-3333-4333-8333-333333333333",
        visitorName: "Luis Pérez",
        status: "RECHAZADA",
        rejectReason: "Sin respuesta del residente",
        expiresAt: null,
      }),
    ]);

    const [, aprobada, rechazada] = within(tabla()).getAllByRole("row");
    expect(within(aprobada).getByText("Aprobada")).toBeTruthy();
    expect(within(aprobada).getByRole("button", { name: "Registrar entrada" })).toBeTruthy();
    expect(within(rechazada).getByText("Rechazada")).toBeTruthy();
    expect(within(rechazada).getByText("Motivo: Sin respuesta del residente")).toBeTruthy();
    expect(within(rechazada).queryByRole("button", { name: "Registrar entrada" })).toBeNull();
  });

  it("AC4: al registrar la entrada muestra «Entrada registrada a las HH:mm»", async () => {
    const entryAt = "2026-11-21T21:35:00.000Z";
    backend({ buscar: [autorizada], entryAt });
    renderPorteria();

    await buscar("K7M2QX");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Registrar entrada" }));
    });

    expect(apiFetch).toHaveBeenCalledWith(`seguridad/visitas/${autorizada.id}/entrada`, { method: "POST" });
    expect(screen.getByRole("status").textContent).toBe(`Entrada registrada a las ${formatHora(entryAt)}`);
    expect(formatHora(entryAt)).toBe("15:35");
  });

  it("AC4: la visita queda Dentro (la lista de quién está dentro de H18 la toma de ahí)", async () => {
    backend({ solicitudes: [solicitud({ status: "DENTRO", expiresAt: null })], entryAt: iso(0) });
    renderPorteria([solicitud({ status: "AUTORIZADA", expiresAt: null })]);

    await act(async () => {
      fireEvent.click(within(tabla()).getByRole("button", { name: "Registrar entrada" }));
    });

    await waitFor(() => expect(within(tabla()).getByText("Dentro")).toBeTruthy());
    expect(within(tabla()).queryByRole("button", { name: "Registrar entrada" })).toBeNull();
  });

  it("AC4: un conflicto 409 muestra el mensaje del servidor", async () => {
    backend({ buscar: [autorizada] });
    renderPorteria();
    await buscar("K7M2QX");
    apiFetch.mockResolvedValueOnce(json({ message: "Este visitante ya está dentro. Registra su salida primero." }, 409));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Registrar entrada" }));
    });

    expect(screen.getByRole("alert").textContent).toBe("Este visitante ya está dentro. Registra su salida primero.");
  });
});
