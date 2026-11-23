import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComunicadoResumen, ComunicadosPagina } from "@/lib/comunicados";
import ComunicadosPage from "./page";

const push = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() => vi.fn());
const apiFetch = vi.hoisted(() => vi.fn());
const requireRole = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  redirect,
}));
vi.mock("@/lib/api", () => ({ apiFetch, requireRole }));

const corte: ComunicadoResumen = {
  id: "c-corte",
  title: "Corte de agua el 10 de noviembre",
  category: "CORTE_SERVICIO",
  publishedAt: "2026-11-07T15:30:00.000Z",
  expiresOn: "2026-11-14",
  readAt: null,
};
const ascensores: ComunicadoResumen = {
  id: "c-ascensores",
  title: "Mantenimiento de ascensores",
  category: "MANTENIMIENTO",
  publishedAt: "2026-11-05T14:00:00.000Z",
  expiresOn: "2026-11-20",
  readAt: "2026-11-06T02:15:00.000Z",
};

function pagina(
  data: ComunicadoResumen[],
  total = data.length,
  page = 1,
): ComunicadosPagina {
  return { data, total, page, pageSize: 10 };
}

function respondeCon(body: ComunicadosPagina) {
  apiFetch.mockImplementation(() =>
    Promise.resolve(new Response(JSON.stringify(body))),
  );
}

async function abrirLista(searchParams: Record<string, string> = {}) {
  return render(
    await ComunicadosPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve(searchParams),
    }),
  );
}

function urlPedida(): Record<string, string> {
  const [href] = push.mock.lastCall as [string];
  return Object.fromEntries(new URL(href, "http://localhost").searchParams);
}

function texts(row: HTMLElement): string[] {
  return within(row)
    .getAllByRole("cell")
    .map((cell) => cell.textContent ?? "");
}

describe("H27. Consulta de comunicados relevantes", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    redirect.mockReset();
    apiFetch.mockReset();
    requireRole.mockResolvedValue({ role: "RESIDENTE" });
  });

  it("AC1: Vigentes muestra título, categoría, fecha de publicación y estado en el orden recibido y resalta los No leídos", async () => {
    respondeCon(pagina([corte, ascensores]));
    await abrirLista();

    expect(screen.getByRole("radio", { name: "Vigentes" })).toHaveProperty(
      "checked",
      true,
    );
    expect(
      screen.getAllByRole("columnheader").map((th) => th.textContent),
    ).toEqual(["Título", "Categoría", "Publicado", "Estado"]);
    const [, noLeido, leido] = screen.getAllByRole("row");
    expect(texts(noLeido)).toEqual([
      "Corte de agua el 10 de noviembre",
      "Corte de servicio",
      "07/11/2026",
      "No leído",
    ]);
    expect(texts(leido)).toEqual([
      "Mantenimiento de ascensores",
      "Mantenimiento programado",
      "05/11/2026",
      "Leído",
    ]);
    expect(noLeido.className).toContain("bg-sky-50");
    expect(within(noLeido).getByRole("link").className).toContain(
      "font-semibold",
    );
    expect(leido.className).toBe("");
    expect(within(leido).getByRole("link").className).not.toContain(
      "font-semibold",
    );
  });

  it("AC1: pide 10 por página y pagina de 10 en 10", async () => {
    const diez = Array.from({ length: 10 }, (_, i) => ({
      ...corte,
      id: `c-${i}`,
    }));
    respondeCon(pagina(diez, 21, 2));
    await abrirLista({ page: "2" });

    expect(apiFetch).toHaveBeenCalledWith(
      "comunicados?tab=vigentes&page=2&pageSize=10",
    );
    expect(screen.getAllByRole("row")).toHaveLength(11);
    expect(screen.getByText("21 comunicados, página 2 de 3")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Anterior" }).getAttribute("href"),
    ).toBe("/comunicados");
    expect(
      screen.getByRole("link", { name: "Siguiente" }).getAttribute("href"),
    ).toBe("/comunicados?page=3");
  });

  it("AC1: la pestaña Archivados pide los que ya pasaron su vigencia", async () => {
    respondeCon(pagina([ascensores]));
    await abrirLista({ tab: "archivados" });

    expect(apiFetch).toHaveBeenCalledWith(
      "comunicados?tab=archivados&page=1&pageSize=10",
    );
    expect(screen.getByRole("radio", { name: "Archivados" })).toHaveProperty(
      "checked",
      true,
    );
    expect(
      screen
        .getByRole("link", { name: "Mantenimiento de ascensores" })
        .getAttribute("href"),
    ).toBe("/comunicados/c-ascensores?tab=archivados");
  });

  it("AC2: filtra por categoría y la lista pide solo la categoría elegida", async () => {
    respondeCon(pagina([corte]));
    const { unmount } = await abrirLista();

    const categoria = screen.getByRole("combobox", { name: "Categoría" });
    expect(
      within(categoria)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual([
      "Todas",
      "Corte de servicio",
      "Mantenimiento programado",
      "Aviso general",
    ]);
    fireEvent.change(categoria, { target: { value: "MANTENIMIENTO" } });
    expect(push).toHaveBeenCalledWith("/comunicados?category=MANTENIMIENTO");

    unmount();
    respondeCon(pagina([ascensores]));
    await abrirLista(urlPedida());
    expect(apiFetch).toHaveBeenLastCalledWith(
      "comunicados?tab=vigentes&page=1&pageSize=10&category=MANTENIMIENTO",
    );
    expect(
      (screen.getByRole("combobox", { name: "Categoría" }) as HTMLSelectElement)
        .value,
    ).toBe("MANTENIMIENTO");
  });

  it.each([
    ["vigentes", "No tienes comunicados vigentes."],
    ["archivados", "No hay comunicados archivados."],
  ])('AC2: sin comunicados en %s muestra "%s"', async (tab, mensaje) => {
    respondeCon(pagina([]));
    await abrirLista({ tab });

    expect(screen.getByText(mensaje)).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("AC4: consulta la lista al abrir la página", async () => {
    respondeCon(pagina([corte]));
    await abrirLista();

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith(
      "comunicados?tab=vigentes&page=1&pageSize=10",
    );
  });

  it("AC4: al cambiar de pestaña vuelve a consultar desde la página 1 con la misma categoría", async () => {
    respondeCon(pagina([corte], 21, 2));
    const { unmount } = await abrirLista({
      category: "CORTE_SERVICIO",
      page: "2",
    });

    fireEvent.click(screen.getByRole("radio", { name: "Archivados" }));
    expect(push).toHaveBeenCalledWith(
      "/comunicados?tab=archivados&category=CORTE_SERVICIO",
    );

    unmount();
    await abrirLista(urlPedida());
    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(apiFetch).toHaveBeenLastCalledWith(
      "comunicados?tab=archivados&page=1&pageSize=10&category=CORTE_SERVICIO",
    );
  });

  it("AC4: al cambiar de categoría vuelve a consultar desde la página 1 en la misma pestaña", async () => {
    respondeCon(pagina([ascensores], 21, 2));
    const { unmount } = await abrirLista({ tab: "archivados", page: "2" });

    fireEvent.change(screen.getByRole("combobox", { name: "Categoría" }), {
      target: { value: "AVISO_GENERAL" },
    });
    expect(push).toHaveBeenCalledWith(
      "/comunicados?tab=archivados&category=AVISO_GENERAL",
    );

    unmount();
    await abrirLista(urlPedida());
    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(apiFetch).toHaveBeenLastCalledWith(
      "comunicados?tab=archivados&page=1&pageSize=10&category=AVISO_GENERAL",
    );
  });

  it("AC4: Actualizar vuelve a consultar con los mismos filtros", async () => {
    respondeCon(pagina([corte]));
    await abrirLista({ category: "CORTE_SERVICIO" });

    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });
});
