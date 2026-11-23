import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type * as VotacionesActions from "@/app/actions/votaciones";
import VotarPage from "./[id]/page";
import AsambleasActivasPage from "./page";

const apiFetch = vi.hoisted(() => vi.fn());
const requireRole = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());
const emitirVotoMock = vi.hoisted(() => vi.fn());
const router = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  useRouter: () => router,
  usePathname: () => "/asambleas",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/api", () => ({ apiFetch, requireRole }));
// El tema usa una versión simulada; la acción real se prueba aparte.
vi.mock("@/app/actions/votaciones", () => ({ emitirVoto: emitirVotoMock }));

const ASAMBLEA_ID = "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f";
const TEMA_1 = "4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a";
const TEMA_2 = "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b";
const TEMA_3 = "6f7a8b9c-0d1e-4f2a-9b3c-4d5e6f7a8b9c";
const OPCION_SI = "7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d";

const activa = {
  id: ASAMBLEA_ID,
  title: "Asamblea ordinaria noviembre",
  endsAt: "2026-11-22T20:00:00Z", // 14:00 en El Salvador
  topicCount: 3,
  votedTopics: 1,
};

const detalle = {
  id: ASAMBLEA_ID,
  title: "Asamblea ordinaria noviembre",
  description: null,
  status: "ABIERTA",
  endsAt: "2026-11-22T20:00:00Z",
  topics: [
    {
      id: TEMA_1,
      question: "¿Aprobar el presupuesto?",
      options: [
        { id: "o1", text: "A favor" },
        { id: "o2", text: "En contra" },
      ],
      myUnitVote: { votedAt: "2026-11-21T15:00:00Z", byMe: true },
    },
    {
      id: TEMA_2,
      question: "¿Cambiar el horario de la piscina?",
      options: [
        { id: "o3", text: "Mañana" },
        { id: "o4", text: "Tarde" },
      ],
      myUnitVote: { votedAt: "2026-11-21T16:00:00Z", byMe: false },
    },
    {
      id: TEMA_3,
      question: "¿Pintar la fachada?",
      options: [
        { id: OPCION_SI, text: "Sí" },
        { id: "o6", text: "No" },
      ],
      myUnitVote: null,
    },
  ],
};

function respuesta(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function apiCon(activas: unknown[]) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path === "asambleas/activas") return respuesta({ data: activas });
    if (path === `asambleas/${ASAMBLEA_ID}`) return respuesta(detalle);
    throw new Error(`Ruta inesperada: ${path}`);
  });
}

async function renderActivas() {
  return render(await AsambleasActivasPage());
}

async function renderDetalle() {
  const ui = await VotarPage({
    params: Promise.resolve({ id: ASAMBLEA_ID }),
    searchParams: Promise.resolve({}),
  } as never);
  return render(ui);
}

function seccionDelTema(pregunta: string, numero: number) {
  return screen.getByRole("region", { name: `Tema ${numero}. ${pregunta}` });
}

/** Botón Votar del tema (el primero; el segundo es el del diálogo de confirmación). */
function botonVotar(tema: HTMLElement) {
  return within(tema).getAllByRole("button", {
    name: "Votar",
  })[0] as HTMLButtonElement;
}

describe("H23. Emisión del voto por unidad", () => {
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
    revalidatePath.mockReset();
    router.refresh.mockReset();
    emitirVotoMock.mockReset();
    emitirVotoMock.mockResolvedValue({
      status: "ok",
      votedAt: "2026-11-21T17:00:00Z",
    });
    requireRole.mockResolvedValue({
      id: "res-1",
      role: "RESIDENTE",
      unitId: "unit-a101",
    });
    apiCon([activa]);
  });

  it("AC1: una tarjeta por asamblea abierta con título, cierre y progreso", async () => {
    await renderActivas();

    expect(apiFetch).toHaveBeenCalledWith("asambleas/activas");
    const tarjeta = screen.getByRole("link", {
      name: /Asamblea ordinaria noviembre/,
    });
    expect(tarjeta.getAttribute("href")).toBe(`/asambleas/${ASAMBLEA_ID}`);
    expect(
      within(tarjeta).getByRole("heading", { name: activa.title }),
    ).toBeTruthy();
    expect(tarjeta.textContent).toContain("22/11/2026");
    expect(
      within(tarjeta).getByText("Tu unidad votó 1 de 3 temas"),
    ).toBeTruthy();
  });

  it('AC1: sin asambleas abiertas muestra "No hay asambleas abiertas."', async () => {
    apiCon([]);

    await renderActivas();

    expect(screen.getByText("No hay asambleas abiertas.")).toBeTruthy();
  });

  it("AC2: cada tema muestra su pregunta y sus opciones", async () => {
    await renderDetalle();

    const tema = seccionDelTema("¿Pintar la fachada?", 3);
    expect(within(tema).getByRole("radio", { name: "Sí" })).toBeTruthy();
    expect(within(tema).getByRole("radio", { name: "No" })).toBeTruthy();
  });

  it('AC2: si votó el residente muestra "Ya votaste" con fecha y hora, sin la opción ni las opciones', async () => {
    await renderDetalle();

    const tema = seccionDelTema("¿Aprobar el presupuesto?", 1);
    const aviso = within(tema).getByRole("status");
    expect(aviso.textContent).toMatch(/^Ya votaste · 21\/11\/2026/);
    expect(aviso.textContent).not.toContain("A favor");
    expect(within(tema).queryByRole("radio")).toBeNull();
  });

  it('AC2: si votó otro residente de la unidad muestra "Tu unidad ya votó"', async () => {
    await renderDetalle();

    const tema = seccionDelTema("¿Cambiar el horario de la piscina?", 2);
    expect(within(tema).getByRole("status").textContent).toMatch(
      /^Tu unidad ya votó · /,
    );
    expect(within(tema).queryByRole("radio")).toBeNull();
  });

  it("AC3: Votar está deshabilitado hasta elegir una opción", async () => {
    await renderDetalle();

    const tema = seccionDelTema("¿Pintar la fachada?", 3);
    const votar = botonVotar(tema);
    expect(votar.disabled).toBe(true);

    fireEvent.click(within(tema).getByRole("radio", { name: "Sí" }));
    expect(votar.disabled).toBe(false);
  });

  it("AC3: pide confirmación y, al confirmar, envía el voto y muestra Ya votaste", async () => {
    await renderDetalle();
    const tema = seccionDelTema("¿Pintar la fachada?", 3);

    fireEvent.click(within(tema).getByRole("radio", { name: "Sí" }));
    fireEvent.click(botonVotar(tema));

    const dialogo = screen.getByRole("dialog", {
      name: "Tu voto es definitivo y secreto. ¿Votar “Sí” en el tema “¿Pintar la fachada?”?",
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Votar" }));

    await waitFor(() =>
      expect(emitirVotoMock).toHaveBeenCalledWith(null, {
        topicId: TEMA_3,
        optionId: OPCION_SI,
      }),
    );
    expect(within(tema).getByRole("status").textContent).toMatch(
      /^Ya votaste · /,
    );
  });

  it("AC3: Cancelar cierra la confirmación sin votar", async () => {
    await renderDetalle();
    const tema = seccionDelTema("¿Pintar la fachada?", 3);

    fireEvent.click(within(tema).getByRole("radio", { name: "Sí" }));
    fireEvent.click(botonVotar(tema));
    const dialogo = screen.getByRole("dialog", { name: /¿Votar “Sí”/ });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }));

    expect(dialogo.hasAttribute("open")).toBe(false);
    expect(emitirVotoMock).not.toHaveBeenCalled();
  });

  it("AC3: si el servidor rechaza el voto (409) muestra el mensaje y vuelve a permitir votar", async () => {
    emitirVotoMock.mockResolvedValue({
      status: "conflict",
      message: "Tu unidad ya votó este tema.",
    });
    await renderDetalle();
    const tema = seccionDelTema("¿Pintar la fachada?", 3);

    fireEvent.click(within(tema).getByRole("radio", { name: "Sí" }));
    fireEvent.click(botonVotar(tema));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: /¿Votar “Sí”/ })).getByRole(
        "button",
        {
          name: "Votar",
        },
      ),
    );

    expect(await within(tema).findByRole("alert")).toHaveProperty(
      "textContent",
      "Tu unidad ya votó este tema.",
    );
  });

  it("AC3: la acción envía el voto y traduce el 409 del servidor", async () => {
    const { emitirVoto } = await vi.importActual<typeof VotacionesActions>(
      "@/app/actions/votaciones",
    );
    apiFetch.mockResolvedValue(
      respuesta({ topicId: TEMA_3, votedAt: "2026-11-21T17:00:00Z" }, 201),
    );

    await expect(
      emitirVoto(null, { topicId: TEMA_3, optionId: OPCION_SI }),
    ).resolves.toEqual({
      status: "ok",
      votedAt: "2026-11-21T17:00:00Z",
    });
    expect(apiFetch).toHaveBeenCalledWith(`asambleas/temas/${TEMA_3}/votos`, {
      method: "POST",
      body: JSON.stringify({ optionId: OPCION_SI }),
    });

    apiFetch.mockResolvedValue(
      respuesta({ message: "Tu unidad ya votó este tema." }, 409),
    );
    await expect(
      emitirVoto(null, { topicId: TEMA_3, optionId: OPCION_SI }),
    ).resolves.toEqual({
      status: "conflict",
      message: "Tu unidad ya votó este tema.",
    });
  });

  it("AC4: se consulta al abrir y con el botón Actualizar", async () => {
    await renderDetalle();

    expect(apiFetch).toHaveBeenCalledWith(`asambleas/${ASAMBLEA_ID}`);
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));

    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("AC4: la lista de asambleas activas también tiene Actualizar", async () => {
    await renderActivas();

    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));

    expect(router.refresh).toHaveBeenCalledTimes(1);
  });
});
