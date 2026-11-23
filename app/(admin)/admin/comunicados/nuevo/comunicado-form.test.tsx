import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ComunicadosPage from "../page";
import { ComunicadoForm } from "./comunicado-form";

const contarAudiencia = vi.hoisted(() => vi.fn());
const publicarComunicado = vi.hoisted(() => vi.fn());
const apiFetch = vi.hoisted(() => vi.fn());
const requireRole = vi.hoisted(() => vi.fn());

vi.mock("@/app/actions/comunicados", () => ({ contarAudiencia, publicarComunicado }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn(),
  unstable_rethrow: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ apiFetch, requireRole }));

const TODAY = "2026-11-22";
const TORRES = [
  { id: "ta", name: "Torre A", letter: "A" },
  { id: "tb", name: "Torre B", letter: "B" },
  { id: "tc", name: "Torre C", letter: "C" },
];

function field(name: string) {
  return screen.getByRole("textbox", { name }) as HTMLInputElement;
}

function expiry() {
  return screen.getByLabelText("Fin de vigencia") as HTMLInputElement;
}

function allTowers() {
  return screen.getByRole("switch", { name: "Todo el condominio" }) as HTMLInputElement;
}

function tower(name: string) {
  return screen.getByRole("checkbox", { name }) as HTMLInputElement;
}

function publicar() {
  return screen.getByRole("button", { name: "Publicar" }) as HTMLButtonElement;
}

function type(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

function fillValid() {
  type(field("Título"), "Corte de agua el 4 de diciembre");
  type(field("Contenido"), "No habrá agua de 08:00 a 16:00 en la Torre A.");
}

describe("H25. Publicación de comunicados segmentados", () => {
  beforeEach(() => {
    contarAudiencia.mockReset();
    publicarComunicado.mockReset();
    apiFetch.mockReset();
    requireRole.mockReset();
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.removeAttribute("open");
    };
  });

  it("AC1: pide título, contenido con contador, categoría, audiencia y fin de vigencia de mañana a 90 días", () => {
    render(<ComunicadoForm today={TODAY} towers={TORRES} />);

    expect(field("Título").maxLength).toBe(100);
    expect(screen.getByText("5 a 100 caracteres")).toBeTruthy();
    expect(field("Contenido").maxLength).toBe(2000);
    expect(screen.getByText("10 a 2,000 caracteres")).toBeTruthy();
    expect(screen.getByText("0/2000")).toBeTruthy();
    fireEvent.change(field("Contenido"), { target: { value: "Sin agua" } });
    expect(screen.getByText("8/2000")).toBeTruthy();

    expect(
      within(screen.getByRole("combobox", { name: "Categoría" }))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Corte de servicio", "Mantenimiento programado", "Aviso general"]);

    expect(allTowers().checked).toBe(true);
    for (const torre of TORRES) {
      expect(tower(torre.name).disabled).toBe(true);
    }

    expect(expiry().type).toBe("date");
    expect(expiry().min).toBe("2026-11-23");
    expect(expiry().max).toBe("2027-02-20");
  });

  it("AC1: con título o contenido fuera de rango muestra el error y no deja publicar", () => {
    render(<ComunicadoForm today={TODAY} towers={TORRES} />);

    type(field("Título"), "abcd");
    type(field("Contenido"), "x".repeat(9));

    expect(screen.getByText("El título debe tener entre 5 y 100 caracteres.")).toBeTruthy();
    expect(screen.getByText("El contenido debe tener entre 10 y 2,000 caracteres.")).toBeTruthy();
    expect(publicar().disabled).toBe(true);
  });

  it("AC1: al apagar Todo el condominio pide marcar una o más torres", () => {
    render(<ComunicadoForm today={TODAY} towers={TORRES} />);
    fillValid();

    fireEvent.click(allTowers());

    expect(tower("Torre A").disabled).toBe(false);
    expect(screen.getByRole("alert").textContent).toBe('Elige al menos una torre o "Todo el condominio".');
    expect(publicar().disabled).toBe(true);

    fireEvent.click(tower("Torre A"));
    fireEvent.click(tower("Torre C"));

    expect(screen.queryByRole("alert")).toBeNull();
    expect(publicar().disabled).toBe(false);
  });

  it.each([
    ["vacía", ""],
    ["de hoy", "2026-11-22"],
    ["a 91 días", "2027-02-21"],
  ])("AC1: rechaza la fecha de fin %s", (_case, expiresOn) => {
    render(<ComunicadoForm today={TODAY} towers={TORRES} />);
    fillValid();

    type(expiry(), expiresOn);

    expect(screen.getByRole("alert").textContent).toBe(
      "La vigencia debe terminar entre mañana y 20/02/2027.",
    );
    expect(publicar().disabled).toBe(true);
  });

  it("AC2: antes de publicar confirma con el número de residentes de las torres marcadas", async () => {
    contarAudiencia.mockResolvedValue({ recipientCount: 7 });
    render(<ComunicadoForm today={TODAY} towers={TORRES} />);
    fillValid();
    fireEvent.click(allTowers());
    fireEvent.click(tower("Torre A"));
    fireEvent.click(tower("Torre C"));

    fireEvent.click(publicar());

    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain(
      "Se publicará para 7 residentes de Torre A y Torre C. Un comunicado publicado no se puede editar ni eliminar. ¿Publicar?",
    );
    expect(contarAudiencia).toHaveBeenCalledWith(["ta", "tc"]);
    expect(publicarComunicado).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(publicarComunicado).not.toHaveBeenCalled();
  });

  it("AC2: con Todo el condominio cuenta a todos los residentes y publica al confirmar", async () => {
    contarAudiencia.mockResolvedValue({ recipientCount: 48 });
    publicarComunicado.mockResolvedValue({});
    render(<ComunicadoForm today={TODAY} towers={TORRES} />);
    fillValid();

    fireEvent.click(publicar());

    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain(
      "Se publicará para 48 residentes de todo el condominio. Un comunicado publicado no se puede editar ni eliminar. ¿Publicar?",
    );
    expect(contarAudiencia).toHaveBeenCalledWith([]);

    fireEvent.click(within(dialog).getByRole("button", { name: "Publicar" }));

    await vi.waitFor(() => expect(publicarComunicado).toHaveBeenCalledOnce());
    const sent = publicarComunicado.mock.calls[0][1] as FormData;
    expect(Object.fromEntries(sent)).toEqual({
      title: "Corte de agua el 4 de diciembre",
      body: "No habrá agua de 08:00 a 16:00 en la Torre A.",
      category: "AVISO_GENERAL",
      expiresOn: "2026-11-29",
      allTowers: "on",
    });
  });

  it('AC3: la lista de comunicados muestra el aviso "Comunicado publicado" al volver de publicar', async () => {
    requireRole.mockResolvedValue({ role: "ADMINISTRADOR" });
    apiFetch.mockResolvedValue(
      new Response(JSON.stringify({ data: [], total: 0, page: 1, pageSize: 20 }), { status: 200 }),
    );

    render(
      await ComunicadosPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({ aviso: "comunicado-publicado" }),
      }),
    );

    expect(screen.getByRole("status").textContent).toBe("Comunicado publicado");
  });
});
