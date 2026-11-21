import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getComunicadosAdmin } from "@/lib/comunicados-api";
import type { AdminFiltro, ComunicadoAdmin } from "@/lib/comunicados-admin";
import { FiltrosAdmin } from "./filtros-admin";
import { TablaComunicados } from "./tabla-comunicados";

const push = vi.hoisted(() => vi.fn());
const apiFetch = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));
vi.mock("@/lib/api", () => ({ apiFetch }));

const ascensores: ComunicadoAdmin = {
  id: "a1",
  title: "Mantenimiento de ascensores",
  category: "MANTENIMIENTO",
  audience: "TODOS",
  towers: [],
  publishedAt: "2026-11-16T15:00:00.000Z",
  expiresOn: "2026-11-28",
  status: "VIGENTE",
  readCount: 3,
  recipientCount: 12,
  readPct: 25,
};

const fumigacion: ComunicadoAdmin = {
  id: "f1",
  title: "Fumigación de la Torre B",
  category: "AVISO_GENERAL",
  audience: "TORRES",
  towers: [{ id: "tb", name: "Torre B" }],
  publishedAt: "2026-10-29T15:00:00.000Z",
  expiresOn: "2026-11-13",
  status: "ARCHIVADO",
  readCount: 1,
  recipientCount: 1,
  readPct: 100,
};

const sinFiltros: AdminFiltro = { status: null, category: null, page: 1 };

function texts(row: HTMLElement): string[] {
  return within(row)
    .getAllByRole("cell")
    .map((cell) => (cell.textContent ?? "").replace(/\s+/g, " ").trim());
}

describe("H26. Comunicados publicados y control de lecturas", () => {
  beforeEach(() => {
    push.mockReset();
    apiFetch.mockReset();
  });

  it("AC1: cada fila muestra título, categoría, audiencia, publicación, fin de vigencia, estado y lecturas", () => {
    render(
      <TablaComunicados
        pagina={{
          data: [ascensores, fumigacion],
          total: 2,
          page: 1,
          pageSize: 20,
        }}
        filtro={sinFiltros}
      />,
    );

    const headers = screen
      .getAllByRole("columnheader")
      .map((th) => th.textContent);
    expect(headers).toEqual([
      "Título",
      "Categoría",
      "Audiencia",
      "Publicado",
      "Vigente hasta",
      "Estado",
      "Lecturas",
    ]);
    const [, first, second] = screen.getAllByRole("row");
    expect(texts(first)).toEqual([
      "Mantenimiento de ascensores",
      "Mantenimiento programado",
      "Todo el condominio",
      "16/11/2026",
      "28/11/2026",
      "Vigente",
      "3 de 12 residentes 25.0 %",
    ]);
    expect(texts(second)).toEqual([
      "Fumigación de la Torre B",
      "Aviso general",
      "Torre B",
      "29/10/2026",
      "13/11/2026",
      "Archivado",
      "1 de 1 residente 100.0 %",
    ]);
    expect(
      within(first).getByRole("link", { name: "Mantenimiento de ascensores" }),
    ).toHaveProperty("pathname", "/admin/comunicados/a1");
  });

  it("AC1: pide 20 por página con los filtros y pagina de 20 en 20", async () => {
    apiFetch.mockResolvedValue(
      new Response(
        JSON.stringify({ data: [], total: 0, page: 2, pageSize: 20 }),
      ),
    );
    await getComunicadosAdmin({
      status: "ARCHIVADO",
      category: "MANTENIMIENTO",
      page: 2,
    });
    expect(apiFetch).toHaveBeenCalledWith(
      "admin/comunicados?page=2&pageSize=20&status=ARCHIVADO&category=MANTENIMIENTO",
    );

    render(
      <TablaComunicados
        pagina={{ data: [ascensores], total: 21, page: 1, pageSize: 20 }}
        filtro={{ status: "VIGENTE", category: null, page: 1 }}
      />,
    );
    expect(screen.getByText("21 comunicados, página 1 de 2")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Siguiente" })).toHaveProperty(
      "search",
      "?status=VIGENTE&page=2",
    );
  });

  it("AC1: el filtro de estado y el de categoría cambian la URL y vuelven a la página 1", () => {
    const { rerender } = render(
      <FiltrosAdmin status={null} category="MANTENIMIENTO" />,
    );

    const estado = screen.getByRole("combobox", { name: "Estado" });
    expect(
      within(estado)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Todos", "Vigente", "Archivado"]);
    fireEvent.change(estado, { target: { value: "ARCHIVADO" } });
    expect(push).toHaveBeenLastCalledWith(
      "/admin/comunicados?status=ARCHIVADO&category=MANTENIMIENTO",
    );

    rerender(<FiltrosAdmin status="ARCHIVADO" category="MANTENIMIENTO" />);
    fireEvent.change(screen.getByRole("combobox", { name: "Categoría" }), {
      target: { value: "" },
    });
    expect(push).toHaveBeenLastCalledWith(
      "/admin/comunicados?status=ARCHIVADO",
    );
  });

  it('AC3: sin comunicados muestra "Todavía no hay comunicados publicados."', () => {
    render(
      <TablaComunicados
        pagina={{ data: [], total: 0, page: 1, pageSize: 20 }}
        filtro={sinFiltros}
      />,
    );
    expect(
      screen.getByText("Todavía no hay comunicados publicados."),
    ).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("AC3: con filtros y sin resultados dice que no hay comunicados con esos filtros", () => {
    render(
      <TablaComunicados
        pagina={{ data: [], total: 0, page: 1, pageSize: 20 }}
        filtro={{ status: "ARCHIVADO", category: null, page: 1 }}
      />,
    );
    expect(
      screen.getByText("No hay comunicados con estos filtros."),
    ).toBeTruthy();
  });
});
