import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AsambleasCerradasPage from "@/app/(residente)/asambleas/cerradas/page";
import { getResultado, type Resultado } from "@/lib/resultados";
import { ResultadoAsamblea } from "./resultado-asamblea";

const apiFetch = vi.hoisted(() => vi.fn());
const requireRole = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
  notFound: vi.fn(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/api", () => ({ apiFetch, requireRole }));

const ASAMBLEA_ID = "8b9c0d1e-2f3a-4b4c-9d5e-6f7a8b9c0d1e";
const T1 = "9c0d1e2f-3a4b-4c5d-8e6f-7a8b9c0d1e2f";
const BASE = `/admin/asambleas/${ASAMBLEA_ID}/resultado`;

const temaCerrado = {
  id: T1,
  question: "¿Aprobar el presupuesto?",
  eligibleUnits: 4,
  votedUnits: 3,
  participationPct: 75,
  totalVotes: 3,
  options: [
    { id: "o1", text: "A favor", votes: 2, pct: 66.7 },
    { id: "o2", text: "En contra", votes: 1, pct: 33.3 },
    { id: "o3", text: "Abstención", votes: 0, pct: 0 },
  ],
  winnerOptionId: "o1",
  isTie: false,
};

const cerrada: Resultado = {
  id: ASAMBLEA_ID,
  title: "Asamblea ordinaria noviembre",
  status: "CERRADA",
  closedAt: "2026-11-18T16:10:00Z",
  topics: [temaCerrado],
};

const abierta: Resultado = {
  ...cerrada,
  status: "ABIERTA",
  closedAt: null,
  topics: [
    {
      ...temaCerrado,
      eligibleUnits: 5,
      votedUnits: 3,
      participationPct: 60,
      totalVotes: null,
      options: temaCerrado.options.map((o) => ({
        ...o,
        votes: null,
        pct: null,
      })),
      winnerOptionId: null,
    },
  ],
};

function respuesta(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function apiConRegistro() {
  apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith(`asambleas/temas/${T1}/participacion`)) {
      const page = Number(new URL(`http://x/${path}`).searchParams.get("page"));
      return respuesta({
        data: [
          { unitCode: "A-101", votedAt: "2026-11-18T15:01:00Z" },
          { unitCode: "B-203", votedAt: "2026-11-18T15:30:00Z" },
        ],
        total: 52,
        page,
        pageSize: 50,
      });
    }
    if (path.startsWith("asambleas/cerradas?")) {
      return respuesta({
        data: [
          {
            id: ASAMBLEA_ID,
            title: cerrada.title,
            closedAt: cerrada.closedAt,
            topicCount: 1,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      });
    }
    if (path === `asambleas/${ASAMBLEA_ID}/resultado`)
      return respuesta(cerrada);
    if (path.endsWith("/resultado"))
      return respuesta({ message: "La asamblea no existe." }, 404);
    throw new Error(`Ruta inesperada: ${path}`);
  });
}

async function renderResultado(
  resultado: Resultado,
  temaActivo?: string,
  pagina = 1,
) {
  return render(
    await ResultadoAsamblea({ resultado, basePath: BASE, temaActivo, pagina }),
  );
}

function tarjeta(titulo: string) {
  return screen.getByText(titulo).parentElement as HTMLElement;
}

describe("H24. Resultado auditable de la asamblea", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    requireRole.mockResolvedValue({ id: "u-1", role: "RESIDENTE" });
    apiConRegistro();
  });

  it("AC1: muestra votos y porcentaje por opción y el total de votos", async () => {
    await renderResultado(cerrada);

    const tabla = screen.getByRole("table", {
      name: "Votos por opción del tema 1",
    });
    const filas = within(tabla)
      .getAllByRole("row")
      .slice(1, 4)
      .map((tr) =>
        Array.from(tr.querySelectorAll("td")).map((td) => td.textContent),
      );
    expect(filas.map((f) => [f[0], f[2], f[3]])).toEqual([
      ["A favor", "2", "66.7 %"],
      ["En contra", "1", "33.3 %"],
      ["Abstención", "0", "0.0 %"],
    ]);
    expect(
      within(tabla).getByRole("rowheader", { name: "Total de votos" })
        .parentElement?.textContent,
    ).toContain("3");
  });

  it("AC1: muestra habilitadas, votantes, participación y la opción ganadora", async () => {
    await renderResultado(cerrada);

    expect(tarjeta("Unidades habilitadas").textContent).toContain("4");
    expect(tarjeta("Unidades que votaron").textContent).toContain(
      "3 de 4 unidades · 75.0 % de participación",
    );
    expect(tarjeta("Opción ganadora").textContent).toContain("A favor");
    expect(tarjeta("Opción ganadora").textContent).toContain("2 de 3 votos");
  });

  it("AC1: el gráfico de barras usa el porcentaje de cada opción", async () => {
    const { container } = await renderResultado(cerrada);

    const barras = Array.from(
      container.querySelectorAll<HTMLElement>("td[aria-hidden] div > div"),
    );
    expect(barras.map((b) => b.style.width)).toEqual(["66.7%", "33.3%", "0%"]);
  });

  it('AC1: con empate muestra "Empate"', async () => {
    await renderResultado({
      ...cerrada,
      topics: [{ ...temaCerrado, winnerOptionId: null, isTie: true }],
    });

    expect(tarjeta("Opción ganadora").textContent).toContain("Empate");
  });

  it("AC2: el registro lista las unidades que votaron con fecha y hora, sin la opción elegida", async () => {
    await renderResultado(cerrada);

    expect(apiFetch).toHaveBeenCalledWith(
      `asambleas/temas/${T1}/participacion?page=1&pageSize=50`,
    );
    const registro = screen.getByRole("table", {
      name: "Unidades que votaron el tema 1",
    });
    const encabezados = within(registro)
      .getAllByRole("columnheader")
      .map((th) => th.textContent);
    expect(encabezados).toEqual(["Unidad", "Votó"]);
    const primera = Array.from(
      within(registro).getAllByRole("row")[1].querySelectorAll("td"),
    ).map((td) => td.textContent);
    expect(primera[0]).toBe("A-101");
    expect(primera[1]).toContain("18/11/2026");
    expect(registro.textContent).not.toMatch(/A favor|En contra|Abstención/);
  });

  it("AC2: el registro va de 50 en 50 y pagina por tema", async () => {
    await renderResultado(cerrada, T1, 2);

    expect(apiFetch).toHaveBeenCalledWith(
      `asambleas/temas/${T1}/participacion?page=2&pageSize=50`,
    );
    expect(screen.getByText(/50 por página · página 2 de 2/)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Anterior" }).getAttribute("href"),
    ).toBe(`${BASE}?tema=${T1}&pagina=1#tema-${T1}`);
  });

  it('AC3: mientras está Abierta muestra "<N> de <M> unidades han votado" y "Los resultados se publican al cierre"', async () => {
    await renderResultado(abierta);

    expect(screen.getByRole("status").textContent).toBe(
      "Los resultados se publican al cierre.",
    );
    expect(screen.getByText("3 de 5 unidades han votado")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('AC3: el residente ve las asambleas cerradas con "Ver resultado"', async () => {
    const ui = await AsambleasCerradasPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({}),
    } as never);
    render(ui);

    expect(apiFetch).toHaveBeenCalledWith(
      "asambleas/cerradas?page=1&pageSize=10",
    );
    const enlace = screen.getByRole("link", {
      name: `Ver el resultado de la asamblea ${cerrada.title}`,
    });
    expect(enlace.getAttribute("href")).toBe(
      `/asambleas/${ASAMBLEA_ID}/resultado`,
    );
  });

  it("AC3: el resultado se consulta por id y una asamblea inexistente no se muestra", async () => {
    await expect(getResultado(ASAMBLEA_ID)).resolves.toMatchObject({
      status: "CERRADA",
    });
    expect(apiFetch).toHaveBeenCalledWith(`asambleas/${ASAMBLEA_ID}/resultado`);

    await expect(
      getResultado("1f2e3d4c-5b6a-4978-8a9b-0c1d2e3f4a5b"),
    ).resolves.toBeNull();
    await expect(getResultado("no-es-uuid")).resolves.toBeNull();
  });
});
