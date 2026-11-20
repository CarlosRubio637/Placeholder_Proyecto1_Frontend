import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { formatHora, type Resumen } from "@/lib/resumen";
import { Tarjetas } from "./tarjetas";

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

describe("H37. Resumen del condominio", () => {
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
    expect(tarjeta("Áreas comunes").getByText("Sin datos")).toBeTruthy();
  });

  it("la hora de la última actualización va en la hora del condominio", () => {
    // 16:05 UTC = 10:05 en El Salvador.
    expect(formatHora(RESUMEN.generatedAt)).toBe("10:05");
  });
});
