import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type * as AsambleasActions from "@/app/actions/asambleas";
import { isoToLocal, localToMs } from "@/lib/fechas";
import {
  MESSAGES,
  validateAsamblea,
  type AsambleaValues,
} from "@/lib/validation/asamblea";
import AsambleaPage from "./[id]/page";
import { AsambleaForm } from "./asamblea-form";
import AsambleasPage from "./page";

const apiFetch = vi.hoisted(() => vi.fn());
const requireRole = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());
const guardarAsambleaMock = vi.hoisted(() => vi.fn());
const eliminarAsambleaMock = vi.hoisted(() => vi.fn());
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

vi.mock("next/navigation", () => ({
  redirect,
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  unstable_rethrow: vi.fn(),
  useRouter: () => router,
  usePathname: () => "/admin/asambleas",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/api", () => ({ apiFetch, requireRole }));
// Los formularios usan versiones simuladas; la acción real se prueba aparte.
vi.mock("@/app/actions/asambleas", () => ({
  guardarAsamblea: guardarAsambleaMock,
  eliminarAsamblea: eliminarAsambleaMock,
}));

const ID_PROGRAMADA = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const ID_ABIERTA = "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e";

const programada = {
  id: ID_PROGRAMADA,
  title: "Asamblea ordinaria diciembre",
  startsAt: "2026-12-01T14:00:00Z",
  endsAt: "2026-12-03T14:00:00Z",
  status: "PROGRAMADA",
  topicCount: 2,
  votedUnits: 0,
};
const abierta = {
  id: ID_ABIERTA,
  title: "Elección de mesa directiva",
  startsAt: "2026-11-20T14:00:00Z",
  endsAt: "2026-11-22T14:00:00Z",
  status: "ABIERTA",
  topicCount: 1,
  votedUnits: 5,
};

const TEMA = {
  question: "¿Aprobar el presupuesto?",
  options: ["A favor", "En contra"],
};

function respuesta(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function apiCon(data: unknown[]) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith("admin/asambleas?")) {
      return respuesta({ data, total: data.length, page: 1, pageSize: 10 });
    }
    if (path === `admin/asambleas/${ID_ABIERTA}`) {
      return respuesta({
        ...abierta,
        description: "Elección anual",
        topics: [
          {
            id: "t1",
            question: TEMA.question,
            options: [
              { id: "o1", text: "A favor" },
              { id: "o2", text: "En contra" },
            ],
          },
        ],
        eligibleUnits: 40,
      });
    }
    throw new Error(`Ruta inesperada: ${path}`);
  });
}

async function renderLista(searchParams: Record<string, string> = {}) {
  const ui = await AsambleasPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(searchParams),
  } as never);
  return render(ui);
}

/** Inicio dentro de 2 horas y cierre 1 día después, en hora de El Salvador. */
function horario() {
  const inicio = Date.now() + 2 * 60 * 60 * 1000;
  return {
    startsAt: isoToLocal(new Date(inicio).toISOString()),
    endsAt: isoToLocal(new Date(inicio + 24 * 60 * 60 * 1000).toISOString()),
  };
}

function formulario(change: Partial<AsambleaValues> = {}) {
  const initial: AsambleaValues = {
    title: "Asamblea ordinaria",
    description: "",
    ...horario(),
    topics: [TEMA],
    ...change,
  };
  return render(<AsambleaForm initial={initial} />);
}

const NOW = localToMs("2026-12-01T10:00") as number;

const valores = (change: Partial<AsambleaValues> = {}): AsambleaValues => ({
  title: "Asamblea ordinaria",
  description: "",
  startsAt: "2026-12-01T11:00",
  endsAt: "2026-12-02T11:00",
  topics: [TEMA],
  ...change,
});

async function accionesReales() {
  return vi.importActual<typeof AsambleasActions>("@/app/actions/asambleas");
}

describe("H22. Convocatoria de asambleas con temas a votar", () => {
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
    guardarAsambleaMock.mockReset();
    guardarAsambleaMock.mockResolvedValue({});
    eliminarAsambleaMock.mockReset();
    eliminarAsambleaMock.mockResolvedValue({});
    requireRole.mockResolvedValue({ id: "admin-1", role: "ADMINISTRADOR" });
    apiCon([programada, abierta]);
  });

  it("AC1: pide título, descripción, inicio y cierre", () => {
    formulario();

    for (const nombre of ["Título", "Descripción", "Inicio", "Cierre"]) {
      expect(screen.getByLabelText(nombre)).toBeTruthy();
    }
  });

  it("AC1: valida título (5 a 100) y descripción (máximo 1,000)", () => {
    expect(validateAsamblea(valores(), NOW)).toEqual({});
    expect(validateAsamblea(valores({ title: "Hola" }), NOW)).toEqual({
      title: MESSAGES.title,
    });
    expect(validateAsamblea(valores({ title: "x".repeat(101) }), NOW)).toEqual({
      title: MESSAGES.title,
    });
    expect(
      validateAsamblea(valores({ description: "x".repeat(1001) }), NOW),
    ).toEqual({
      description: MESSAGES.description,
    });
  });

  it("AC1: el inicio debe ser al menos 1 hora después de ahora", () => {
    expect(
      validateAsamblea(valores({ startsAt: "2026-12-01T10:59" }), NOW),
    ).toMatchObject({
      startsAt: MESSAGES.startsAt,
    });
    expect(
      validateAsamblea(valores({ startsAt: "2026-11-30T10:00" }), NOW),
    ).toMatchObject({
      startsAt: MESSAGES.startsAt,
    });
  });

  it("AC1: el cierre debe estar entre 1 hora y 14 días después del inicio", () => {
    expect(
      validateAsamblea(valores({ endsAt: "2026-12-01T11:30" }), NOW),
    ).toEqual({
      endsAt: MESSAGES.endsAt,
    });
    expect(
      validateAsamblea(valores({ endsAt: "2026-12-15T11:01" }), NOW),
    ).toEqual({
      endsAt: MESSAGES.endsAt,
    });
    expect(
      validateAsamblea(valores({ endsAt: "2026-12-15T11:00" }), NOW),
    ).toEqual({});
  });

  it("AC2: valida de 1 a 10 temas, pregunta de 5 a 200 y de 2 a 6 opciones sin repetirse", () => {
    expect(validateAsamblea(valores({ topics: [] }), NOW)).toEqual({
      topics: MESSAGES.topics,
    });
    expect(
      validateAsamblea(
        valores({ topics: Array.from({ length: 11 }, () => TEMA) }),
        NOW,
      ),
    ).toEqual({ topics: MESSAGES.topics });
    expect(
      validateAsamblea(
        valores({ topics: [{ ...TEMA, question: "¿Sí?" }] }),
        NOW,
      ),
    ).toEqual({ "topics.0.question": MESSAGES.question });
    expect(
      validateAsamblea(
        valores({ topics: [{ ...TEMA, options: ["A favor"] }] }),
        NOW,
      ),
    ).toEqual({ "topics.0.options": MESSAGES.options });
    expect(
      validateAsamblea(
        valores({
          topics: [{ ...TEMA, options: ["1", "2", "3", "4", "5", "6", "7"] }],
        }),
        NOW,
      ),
    ).toEqual({ "topics.0.options": MESSAGES.options });
    expect(
      validateAsamblea(
        valores({ topics: [{ ...TEMA, options: ["Sí", "sí"] }] }),
        NOW,
      ),
    ).toEqual({
      "topics.0.options": MESSAGES.options,
      "topics.0.options.1": MESSAGES.optionRepeated,
    });
  });

  it("AC2: Agregar opción se deshabilita al llegar a 6 opciones", () => {
    formulario();
    const agregar = () =>
      screen.getByRole("button", {
        name: "Agregar opción (máx. 6)",
      }) as HTMLButtonElement;

    for (let i = 0; i < 4; i += 1) fireEvent.click(agregar());

    expect(screen.getByLabelText("Opción 6 del tema 1")).toBeTruthy();
    expect(agregar().disabled).toBe(true);
  });

  it("AC2: Agregar tema se deshabilita al llegar a 10 temas", () => {
    formulario();
    const agregar = () =>
      screen.getByRole("button", { name: "Agregar tema" }) as HTMLButtonElement;

    for (let i = 0; i < 9; i += 1) fireEvent.click(agregar());

    expect(
      screen.getByRole("heading", { name: "Agenda (10 de 10 temas)" }),
    ).toBeTruthy();
    expect(agregar().disabled).toBe(true);
    expect(screen.getByText("Llegaste al máximo de 10 temas.")).toBeTruthy();
  });

  it("AC2: con datos válidos envía la asamblea", async () => {
    const { startsAt, endsAt } = horario();
    formulario({ startsAt, endsAt, description: "  Presupuesto 2027 " });

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(guardarAsambleaMock).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          title: "Asamblea ordinaria",
          description: "Presupuesto 2027",
          startsAt,
          endsAt,
          topics: [TEMA],
        }),
      ),
    );
  });

  it("AC2: al guardar crea la asamblea y vuelve a la lista con el aviso", async () => {
    const { guardarAsamblea } = await accionesReales();
    const { startsAt, endsAt } = horario();
    apiFetch.mockResolvedValue(
      respuesta({ id: ID_PROGRAMADA, status: "PROGRAMADA" }, 201),
    );

    await expect(
      guardarAsamblea({}, { ...valores({ startsAt, endsAt }), topics: [TEMA] }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(apiFetch).toHaveBeenCalledWith("admin/asambleas", {
      method: "POST",
      body: JSON.stringify({
        title: "Asamblea ordinaria",
        startsAt: new Date(localToMs(startsAt) as number).toISOString(),
        endsAt: new Date(localToMs(endsAt) as number).toISOString(),
        topics: [TEMA],
      }),
    });
    expect(redirect).toHaveBeenCalledWith("/admin/asambleas?aviso=programada");
  });

  it("AC3: la lista muestra título, inicio, cierre, estado, temas y unidades que votaron", async () => {
    await renderLista();

    const encabezados = screen
      .getAllByRole("columnheader")
      .map((th) => th.textContent);
    expect(encabezados).toEqual([
      "Título",
      "Inicio",
      "Cierre",
      "Estado",
      "Temas",
      "Unidades que votaron",
      "Acciones",
    ]);
    const [, primera, segunda] = screen.getAllByRole("row");
    const celdas = (tr: HTMLElement) =>
      Array.from(tr.querySelectorAll(":scope > td")).map(
        (td) => td.textContent,
      );
    expect(celdas(primera)[0]).toBe("Asamblea ordinaria diciembre");
    expect(celdas(primera)[1]).toContain("01/12/2026");
    expect(celdas(primera)[2]).toContain("03/12/2026");
    expect(celdas(primera).slice(3, 6)).toEqual(["Programada", "2", "0"]);
    expect(celdas(segunda).slice(3, 6)).toEqual(["Abierta", "1", "5"]);
  });

  it("AC3: pide 10 por página y respeta el orden del servidor (más reciente primero)", async () => {
    await renderLista();

    expect(apiFetch).toHaveBeenCalledWith("admin/asambleas?page=1&pageSize=10");
    expect(screen.getByText(/10 por página/)).toBeTruthy();
  });

  it("AC3: sin asambleas muestra el mensaje de lista vacía", async () => {
    apiCon([]);

    await renderLista();

    expect(screen.getByText("Todavía no hay asambleas.")).toBeTruthy();
  });

  it("AC4: una Programada se puede editar o eliminar; una Abierta solo se ve", async () => {
    await renderLista();

    expect(
      screen.getByRole("link", {
        name: `Editar la asamblea ${programada.title}`,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: `Eliminar la asamblea ${programada.title}`,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: `Ver la asamblea ${abierta.title}` }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("link", {
        name: `Editar la asamblea ${abierta.title}`,
      }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: `Eliminar la asamblea ${abierta.title}`,
      }),
    ).toBeNull();
  });

  it('AC4: eliminar pide confirmación "¿Eliminar la asamblea <título>?"', async () => {
    await renderLista();

    fireEvent.click(
      screen.getByRole("button", {
        name: `Eliminar la asamblea ${programada.title}`,
      }),
    );
    const dialogo = screen.getByRole("dialog", {
      name: `¿Eliminar la asamblea ${programada.title}?`,
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Eliminar" }));

    await waitFor(() =>
      expect(eliminarAsambleaMock).toHaveBeenCalledWith({}, ID_PROGRAMADA),
    );
  });

  it("AC4: una Abierta se muestra solo en lectura", async () => {
    const ui = await AsambleaPage({
      params: Promise.resolve({ id: ID_ABIERTA }),
      searchParams: Promise.resolve({}),
    } as never);
    render(ui);

    expect(screen.getByRole("status").textContent).toBe(MESSAGES.started);
    expect((screen.getByLabelText("Título") as HTMLInputElement).readOnly).toBe(
      true,
    );
    expect(screen.queryByRole("button", { name: "Guardar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Agregar tema" })).toBeNull();
  });

  it("AC4: si la asamblea ya inició, eliminar responde con el aviso (409)", async () => {
    const { eliminarAsamblea } = await accionesReales();
    apiFetch.mockResolvedValue(respuesta({ message: MESSAGES.started }, 409));

    await expect(eliminarAsamblea({}, ID_PROGRAMADA)).resolves.toEqual({
      error: MESSAGES.started,
      stale: true,
    });
  });
});
