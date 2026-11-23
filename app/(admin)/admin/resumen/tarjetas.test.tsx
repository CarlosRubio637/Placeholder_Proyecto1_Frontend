import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatHora, type Resumen } from "@/lib/resumen";
import { Actualizar } from "./actualizar";
import ResumenPage from "./page";
import { Tarjetas } from "./tarjetas";

const apiFetch = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  apiFetch,
  requireRole: vi.fn().mockResolvedValue({ id: "admin-1", role: "ADMINISTRADOR" }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const RESUMEN: Resumen = {
  debt: { owedAmount: 1275.5, overduePct: 12.5 },
  areas: { avgOccupancyPct: 23.4, mostUsed: { areaId: "p", name: "Piscina" } },
  incidents: { openTotal: 9, staleCount: 3 },
  voting: { assemblyTitle: "Asamblea de noviembre", avgParticipationPct: 62.5 },
  generatedAt: "2026-11-20T16:05:00.000Z",
};

function tarjeta(name: string) {
  return within(screen.getByRole("region", { name }));
}

describe('H37. Resumen "de un vistazo" para la administración', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    refresh.mockReset();
  });

  it("AC1: muestra las cuatro tarjetas con sus cifras", () => {
    render(<Tarjetas resumen={RESUMEN} />);

    expect(tarjeta("Morosidad").getByText("$1,275.50")).toBeTruthy();
    expect(tarjeta("Morosidad").getByText("12.5 %")).toBeTruthy();
    expect(tarjeta("Áreas comunes").getByText("23.4 %")).toBeTruthy();
    expect(tarjeta("Áreas comunes").getByText("Piscina")).toBeTruthy();
    expect(tarjeta("Incidencias").getByText("9")).toBeTruthy();
    expect(tarjeta("Incidencias").getByText("3")).toBeTruthy();
    expect(tarjeta("Votaciones").getByText("62.5 %")).toBeTruthy();
    expect(tarjeta("Votaciones").getByText("Asamblea de noviembre")).toBeTruthy();
  });

  it("AC2: cada tarjeta enlaza a su reporte completo (H32 a H35)", () => {
    render(<Tarjetas resumen={RESUMEN} />);

    for (const [name, href] of [
      ["Morosidad", "/admin/reportes/morosidad"],
      ["Áreas comunes", "/admin/reportes/areas"],
      ["Incidencias", "/admin/reportes/incidencias"],
      ["Votaciones", "/admin/reportes/participacion"],
    ]) {
      expect(tarjeta(name).getByRole("link", { name: "Ver reporte" }).getAttribute("href")).toBe(
        href,
      );
    }
  });

  it('AC3: sin asambleas cerradas ni áreas, esas tarjetas dicen "Sin datos"', () => {
    render(
      <Tarjetas
        resumen={{
          ...RESUMEN,
          areas: { avgOccupancyPct: null, mostUsed: null },
          voting: null,
        }}
      />,
    );

    expect(tarjeta("Votaciones").getByText("Sin datos")).toBeTruthy();
    expect(tarjeta("Votaciones").queryByText("Participación promedio")).toBeNull();
    expect(tarjeta("Áreas comunes").getByText("Sin datos")).toBeTruthy();
    expect(tarjeta("Áreas comunes").queryByText("Ocupación promedio")).toBeNull();
  });

  it('AC3: con áreas pero sin reservas en el mes, la más usada dice "Sin datos"', () => {
    render(
      <Tarjetas resumen={{ ...RESUMEN, areas: { avgOccupancyPct: 0, mostUsed: null } }} />,
    );

    expect(tarjeta("Áreas comunes").getByText("0.0 %")).toBeTruthy();
    // Con el texto normal, no con el tamaño de una cifra.
    expect(tarjeta("Áreas comunes").getByText("Sin datos").className).not.toContain("text-3xl");
  });

  it("AC3: la hora de la última actualización va en la hora del condominio", () => {
    // 16:05 UTC = 10:05 en El Salvador.
    expect(formatHora(RESUMEN.generatedAt)).toBe("10:05");
  });

  it("AC3: al abrir la pantalla consulta el resumen y muestra la hora de la última actualización", async () => {
    apiFetch.mockResolvedValue(new Response(JSON.stringify(RESUMEN), { status: 200 }));

    render(await ResumenPage());

    expect(apiFetch).toHaveBeenCalledWith("admin/reportes/resumen");
    expect(screen.getByText("Última actualización: 10:05")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Ver reporte" })).toHaveLength(4);
  });

  it("AC3: Actualizar vuelve a consultar el resumen", () => {
    render(<Actualizar />);

    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));

    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
