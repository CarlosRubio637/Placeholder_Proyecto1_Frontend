import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUnidadesMorosas } from "@/lib/unidades-morosas-api";
import {
  parseUnidadesMorosasParams,
  type UnidadMorosa,
  type UnidadesMorosasReporte,
} from "@/lib/unidades-morosas";
import { FiltrosUnidadesMorosas } from "./filtros-unidades-morosas";
import { ReporteUnidadesMorosas } from "./reporte-unidades-morosas";

const push = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());
const apiFetch = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));
vi.mock("@/lib/api", () => ({ apiFetch }));

const TORRES = [
  { id: "ta", name: "Torre A", letter: "A" },
  { id: "tb", name: "Torre B", letter: "B" },
  { id: "tc", name: "Torre C", letter: "C" },
];

const b203: UnidadMorosa = {
  unitId: "u-b203",
  unitCode: "B-203",
  towerName: "Torre B",
  residents: ["Ana Gómez", "Luis Pérez"],
  overdueFees: 2,
  overdueAmount: 150,
  overdueSince: "2026-09-05",
  daysOverdue: 76,
};
const a101: UnidadMorosa = {
  unitId: "u-a101",
  unitCode: "A-101",
  towerName: "Torre A",
  residents: [],
  overdueFees: 1,
  overdueAmount: 75,
  overdueSince: "2026-10-11",
  daysOverdue: 40,
};

function reporte(data: UnidadMorosa[], total = data.length): UnidadesMorosasReporte {
  return {
    summary: {
      overdueUnits: 3,
      overdueActiveUnits: 2,
      overdueAmount: 2340.5,
      activeUnits: 48,
      overduePercent: 4.2,
    },
    data,
    total,
    page: 1,
    pageSize: 20,
  };
}

const SIN_FILTROS = { towerId: undefined, search: undefined };

describe("H4. Reporte de unidades morosas", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    apiFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC1: el resumen muestra unidades morosas, monto total y porcentaje sobre las activas", () => {
    render(<ReporteUnidadesMorosas reporte={reporte([b203])} filtros={SIN_FILTROS} page={1} />);

    const resumen = screen.getByRole("region", { name: "Resumen" });
    expect(within(resumen).getByText("Unidades morosas")).toBeTruthy();
    expect(within(resumen).getByText("3")).toBeTruthy();
    expect(within(resumen).getByText("$2,340.50")).toBeTruthy();
    expect(within(resumen).getByText("4.2 %")).toBeTruthy();
    expect(within(resumen).getByText("2 de 48 unidades activas")).toBeTruthy();
  });

  it("AC2: cada fila muestra unidad, residentes, cuotas, monto, Moroso desde y días en mora", () => {
    render(
      <ReporteUnidadesMorosas reporte={reporte([b203, a101])} filtros={SIN_FILTROS} page={1} />,
    );

    const headers = screen.getAllByRole("columnheader").map((th) => th.textContent);
    expect(headers).toEqual([
      "Unidad",
      "Residentes",
      "Cuotas morosas",
      "Monto moroso",
      "Moroso desde",
      "Días en mora",
    ]);
    const [, primera, segunda] = screen.getAllByRole("row");
    expect(within(primera).getAllByRole("cell").map((td) => td.textContent)).toEqual([
      "B-203Torre B",
      "Ana Gómez, Luis Pérez",
      "2",
      "$150.00",
      "05/09/2026",
      "76",
    ]);
    expect(within(segunda).getByText("Sin residentes activos")).toBeTruthy();
  });

  it("AC2: pagina de 20 en 20 y conserva los filtros al cambiar de página", () => {
    const filas = Array.from({ length: 20 }, (_, i) => ({ ...b203, unitId: `u${i}`, unitCode: `B-${i}` }));
    render(
      <ReporteUnidadesMorosas
        reporte={reporte(filas, 45)}
        filtros={{ towerId: "tb", search: "b-2" }}
        page={2}
      />,
    );

    expect(screen.getAllByRole("row")).toHaveLength(21);
    expect(screen.getByText(/página 2 de 3/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Anterior" }).getAttribute("href")).toBe(
      "/admin/morosidad?torre=tb&buscar=b-2",
    );
    expect(screen.getByRole("link", { name: "Siguiente" }).getAttribute("href")).toBe(
      "/admin/morosidad?torre=tb&buscar=b-2&page=3",
    );
  });

  it("AC3: al elegir una torre consulta desde la página 1 con ese filtro", () => {
    render(<FiltrosUnidadesMorosas torres={TORRES} towerId={undefined} search="b-2" />);

    fireEvent.change(screen.getByRole("combobox", { name: "Torre o sección" }), {
      target: { value: "tb" },
    });

    expect(push).toHaveBeenCalledWith("/admin/morosidad?torre=tb&buscar=b-2");
  });

  it("AC3: busca 500 ms después de dejar de escribir", () => {
    vi.useFakeTimers();
    render(<FiltrosUnidadesMorosas torres={TORRES} towerId={undefined} search={undefined} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar unidad" }), {
      target: { value: " B-2 " },
    });
    act(() => vi.advanceTimersByTime(499));
    expect(push).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));

    expect(push).toHaveBeenCalledWith("/admin/morosidad?buscar=B-2");
  });

  it("AC3: Enter busca sin esperar y la búsqueda admite hasta 20 caracteres", () => {
    render(<FiltrosUnidadesMorosas torres={TORRES} towerId="ta" search={undefined} />);

    const campo = screen.getByRole("searchbox", { name: "Buscar unidad" }) as HTMLInputElement;
    expect(campo.maxLength).toBe(20);
    fireEvent.change(campo, { target: { value: "101" } });
    fireEvent.keyDown(campo, { key: "Enter" });

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/admin/morosidad?torre=ta&buscar=101");
  });

  it("AC3: al hacer clic en una fila abre el estado de cuenta de la unidad", () => {
    render(<ReporteUnidadesMorosas reporte={reporte([b203])} filtros={SIN_FILTROS} page={1} />);

    fireEvent.click(screen.getByText("Ana Gómez, Luis Pérez"));

    expect(push).toHaveBeenCalledWith("/admin/unidades/u-b203");
    expect(screen.getByRole("link", { name: /B-203/ }).getAttribute("href")).toBe(
      "/admin/unidades/u-b203",
    );
  });

  it('AC4: sin unidades morosas muestra "No hay unidades morosas."', () => {
    render(<ReporteUnidadesMorosas reporte={reporte([], 0)} filtros={SIN_FILTROS} page={1} />);

    expect(screen.getByText("No hay unidades morosas.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("AC7: consulta el reporte con la torre, la búsqueda y la página", async () => {
    apiFetch.mockResolvedValue(new Response(JSON.stringify(reporte([b203])), { status: 200 }));

    const result = await getUnidadesMorosas({ towerId: "tb", search: "b-2" }, 3);

    expect(apiFetch).toHaveBeenCalledWith("morosidad?page=3&pageSize=20&towerId=tb&search=b-2");
    expect(result).toEqual({ ok: true, reporte: reporte([b203]) });
  });

  it("AC7: Actualizar vuelve a consultar con los mismos filtros", () => {
    render(<FiltrosUnidadesMorosas torres={TORRES} towerId="tb" search="b-2" />);

    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("responde con el mensaje del backend ante un 400 y marca el 403 como sin permiso", async () => {
    apiFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: ["La torre debe ser un identificador válido."] }), {
        status: 400,
      }),
    );
    apiFetch.mockResolvedValueOnce(new Response("{}", { status: 403 }));

    expect(await getUnidadesMorosas(SIN_FILTROS, 1)).toEqual({
      ok: false,
      error: "validation",
      message: "La torre debe ser un identificador válido.",
    });
    expect(await getUnidadesMorosas(SIN_FILTROS, 1)).toEqual({ ok: false, error: "forbidden" });
  });

  it("lee torre, búsqueda y página de la URL e ignora valores inválidos", () => {
    expect(parseUnidadesMorosasParams({ torre: "tb", buscar: "  b-2 ", page: "3" })).toEqual({
      filtros: { towerId: "tb", search: "b-2" },
      page: 3,
    });
    expect(
      parseUnidadesMorosasParams({ buscar: "x".repeat(21), page: "-1" }),
    ).toEqual({ filtros: { towerId: undefined, search: "x".repeat(20) }, page: 1 });
  });
});
