import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDateTime, type FeeGeneration } from "@/lib/cuotas";
import { fetchGeneraciones } from "@/lib/cuotas-api";
import { GenerarCuotasForm } from "./generar-cuotas-form";
import { HistorialGeneraciones } from "./historial-generaciones";

const apiFetch = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({ apiFetch }));
vi.mock("next/cache", () => ({ revalidatePath }));

const TODAY = "2026-11-22";
const NOW_IN_EL_SALVADOR = new Date("2026-11-22T18:00:00.000Z");

const AMOUNT_ERROR = "El monto debe estar entre $1.00 y $5,000.00.";
const DUE_DATE_ERROR =
  "La fecha de vencimiento debe estar dentro del periodo y no puede ser anterior a hoy.";
const CONCEPT_ERROR = "El concepto no puede superar los 60 caracteres.";

const diciembre: FeeGeneration = {
  id: "gen-dic",
  period: "2026-12",
  amount: 35.5,
  dueDate: "2026-12-10",
  concept: "Cuota de mantenimiento diciembre 2026",
  createdCount: 5,
  skippedCount: 1,
  createdAt: "2026-11-22T18:30:00.000Z",
  createdBy: { id: "admin-1", name: "Ana Paz" },
};

const noviembre: FeeGeneration = {
  id: "gen-nov",
  period: "2026-11",
  amount: 30,
  dueDate: "2026-11-10",
  concept: "Cuota de mantenimiento noviembre 2026",
  createdCount: 6,
  skippedCount: 0,
  createdAt: "2026-11-02T15:00:00.000Z",
  createdBy: { id: "admin-2", name: "Luis Pérez" },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function periodo() {
  return screen.getByRole("combobox", { name: "Periodo" }) as HTMLSelectElement;
}

function monto() {
  return screen.getByRole("spinbutton", { name: "Monto por unidad" }) as HTMLInputElement;
}

function vencimiento() {
  return screen.getByLabelText("Fecha de vencimiento") as HTMLInputElement;
}

function concepto() {
  return screen.getByRole("textbox", { name: "Concepto" }) as HTMLInputElement;
}

function generar() {
  return screen.getByRole("button", { name: "Generar" }) as HTMLButtonElement;
}

function escribir(campo: HTMLInputElement, value: string) {
  fireEvent.change(campo, { target: { value } });
  fireEvent.blur(campo);
}

function texts(row: HTMLElement): string[] {
  return within(row)
    .getAllByRole("cell")
    .map((cell) => (cell.textContent ?? "").replace(/\s+/g, " ").trim());
}

describe("H3. Generación mensual de cuotas", () => {
  beforeAll(() => {
    Object.assign(HTMLDialogElement.prototype, {
      showModal(this: HTMLDialogElement) {
        this.setAttribute("open", "");
      },
      close(this: HTMLDialogElement) {
        this.removeAttribute("open");
      },
    });
  });

  beforeEach(() => {
    apiFetch.mockReset();
    revalidatePath.mockReset();
    vi.useFakeTimers({ toFake: ["Date"], now: NOW_IN_EL_SALVADOR });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC1: ofrece del mes actual a 3 meses adelante y propone el día 10 y el concepto del periodo", () => {
    render(<GenerarCuotasForm today={TODAY} />);

    expect(
      within(periodo())
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["noviembre 2026", "diciembre 2026", "enero 2027", "febrero 2027"]);
    expect(periodo().value).toBe("2026-12");
    expect(vencimiento().value).toBe("2026-12-10");
    expect(concepto().value).toBe("Cuota de mantenimiento diciembre 2026");

    fireEvent.change(periodo(), { target: { value: "2027-01" } });

    expect(vencimiento().value).toBe("2027-01-10");
    expect(concepto().value).toBe("Cuota de mantenimiento enero 2027");
  });

  it("AC1: el monto va de $1.00 a $5,000.00 con 2 decimales como máximo", () => {
    render(<GenerarCuotasForm today={TODAY} />);

    for (const invalid of ["0.99", "5000.01", "35.555"]) {
      escribir(monto(), invalid);
      expect(screen.getByText(AMOUNT_ERROR)).toBeTruthy();
      expect(generar().disabled).toBe(true);
    }

    escribir(monto(), "5000");

    expect(screen.queryByText(AMOUNT_ERROR)).toBeNull();
    expect(generar().disabled).toBe(false);
  });

  it("AC1: el vencimiento cae dentro del periodo y no antes de hoy", () => {
    render(<GenerarCuotasForm today={TODAY} />);

    expect(vencimiento().min).toBe("2026-12-01");
    expect(vencimiento().max).toBe("2026-12-31");
    escribir(vencimiento(), "2027-01-10");
    expect(screen.getByText(DUE_DATE_ERROR)).toBeTruthy();

    fireEvent.change(periodo(), { target: { value: "2026-11" } });

    expect(vencimiento().min).toBe(TODAY);
    expect(vencimiento().value).toBe(TODAY);
    expect(screen.queryByText(DUE_DATE_ERROR)).toBeNull();

    escribir(vencimiento(), "2026-11-21");
    expect(screen.getByText(DUE_DATE_ERROR)).toBeTruthy();
  });

  it("AC1: el concepto es opcional y admite hasta 60 caracteres", () => {
    render(<GenerarCuotasForm today={TODAY} />);
    escribir(monto(), "35.50");

    expect(concepto().maxLength).toBe(60);
    expect(screen.getByText("37/60")).toBeTruthy();

    escribir(concepto(), "x".repeat(61));
    expect(screen.getByText(CONCEPT_ERROR)).toBeTruthy();
    expect(generar().disabled).toBe(true);

    escribir(concepto(), "");
    expect(screen.queryByText(CONCEPT_ERROR)).toBeNull();
    expect(screen.getByText("0/60")).toBeTruthy();
    expect(generar().disabled).toBe(false);
  });

  it("AC2: antes de generar pide confirmación con el monto, las unidades sin cuota y el periodo", async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse({ activeUnits: 6, alreadyGenerated: 1, toCreate: 5 }));
    render(<GenerarCuotasForm today={TODAY} />);
    escribir(monto(), "35.5");

    fireEvent.click(generar());

    const confirmacion = await screen.findByRole("dialog", {
      name: "Se generarán cuotas de $35.50 para 5 unidades del periodo diciembre 2026. ¿Continuar?",
    });
    expect(apiFetch.mock.calls[0][0]).toBe("cuotas/generaciones/vista-previa?period=2026-12");

    fireEvent.click(within(confirmacion).getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it("AC2: si todas las unidades activas ya tienen cuota avisa sin pedir confirmación", async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse({ activeUnits: 6, alreadyGenerated: 6, toCreate: 0 }));
    render(<GenerarCuotasForm today={TODAY} />);
    escribir(monto(), "35.5");

    fireEvent.click(generar());

    expect(
      await screen.findByText(
        "Las cuotas del periodo diciembre 2026 ya fueron generadas para todas las unidades.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("AC3: al confirmar genera las cuotas y muestra cuántas se crearon y cuántas unidades se omitieron", async () => {
    apiFetch
      .mockResolvedValueOnce(jsonResponse({ activeUnits: 6, alreadyGenerated: 1, toCreate: 5 }))
      .mockResolvedValueOnce(jsonResponse(diciembre, 201));
    render(<GenerarCuotasForm today={TODAY} />);
    escribir(monto(), "35.50");
    fireEvent.click(generar());
    const confirmacion = await screen.findByRole("dialog");

    fireEvent.click(within(confirmacion).getByRole("button", { name: "Continuar" }));

    expect((await screen.findByRole("status")).textContent).toBe(
      "Se generaron 5 cuotas. 1 unidades ya tenían cuota de este periodo.",
    );
    expect(apiFetch).toHaveBeenLastCalledWith("cuotas/generaciones", {
      method: "POST",
      body: JSON.stringify({
        period: "2026-12",
        amount: 35.5,
        dueDate: "2026-12-10",
        concept: "Cuota de mantenimiento diciembre 2026",
      }),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/cuotas/generar");
  });

  it("AC3: el historial muestra periodo, monto, vencimiento, creadas, fecha y autor del más reciente al más antiguo", async () => {
    const pagina = { data: [diciembre, noviembre], total: 2, page: 1, pageSize: 10 };
    apiFetch.mockResolvedValueOnce(jsonResponse(pagina));

    await expect(fetchGeneraciones(1)).resolves.toEqual(pagina);
    expect(apiFetch).toHaveBeenCalledWith("cuotas/generaciones?page=1&pageSize=10");

    render(<HistorialGeneraciones history={pagina} />);

    const historial = within(screen.getByRole("region", { name: "Historial de generaciones" }));
    expect(
      historial.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual(["Periodo", "Monto", "Vence", "Creadas", "Fecha", "Autor"]);
    const [, first, second] = historial.getAllByRole("row");
    expect(texts(first)).toEqual([
      "diciembre 2026",
      "$35.50",
      "10/12/2026",
      "5",
      formatDateTime(diciembre.createdAt).replace(/\s+/g, " "),
      "Ana Paz",
    ]);
    expect(texts(second)).toEqual([
      "noviembre 2026",
      "$30.00",
      "10/11/2026",
      "6",
      formatDateTime(noviembre.createdAt).replace(/\s+/g, " "),
      "Luis Pérez",
    ]);
  });
});
