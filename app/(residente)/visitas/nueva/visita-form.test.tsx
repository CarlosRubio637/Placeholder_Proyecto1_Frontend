import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VisitaForm } from "./visita-form";

const autorizarVisita = vi.hoisted(() => vi.fn());
vi.mock("@/app/actions/visitas", () => ({ autorizarVisita }));

// Domingo 22 de noviembre de 2026, 10:07 en El Salvador.
const NOW = new Date("2026-11-22T16:07:00Z");
const DEFAULTS = { visitDate: "2026-11-23", expectedTime: "10:00" };

const VISIT = {
  id: "visit-1",
  code: "XU2CEY",
  status: "AUTORIZADA" as const,
  visitorName: "Roberto Díaz",
  visitDate: "2026-11-23",
  expectedTime: "10:00",
  validFrom: "2026-11-23T12:00:00.000Z",
  validUntil: "2026-11-24T04:00:00.000Z",
};

function field(id: string) {
  return document.getElementById(id) as HTMLInputElement & HTMLSelectElement;
}

function fill(id: string, value: string) {
  fireEvent.change(field(id), { target: { value } });
  fireEvent.blur(field(id));
}

function fillValid() {
  fill("visitorName", "Roberto Díaz");
  fill("documentNumber", "09876543-2");
  fill("reason", "Visita familiar");
}

function autorizar() {
  return screen.getByRole("button", { name: "Autorizar" }) as HTMLButtonElement;
}

describe("H14. Preautorización de visitantes", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    autorizarVisita.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC1: pide nombre, tipo y número de documento, fecha, hora estimada y motivo", () => {
    render(<VisitaForm nowMs={NOW.getTime()} defaults={DEFAULTS} />);

    expect(screen.getByLabelText("Nombre completo del visitante")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "DUI" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Pasaporte" })).toBeTruthy();
    expect(screen.getByLabelText("Número de documento")).toBeTruthy();
    expect(screen.getByLabelText("Fecha de la visita")).toBeTruthy();
    expect(screen.getByLabelText("Hora estimada de llegada")).toBeTruthy();
    expect(screen.getByLabelText("Motivo de la visita")).toBeTruthy();
  });

  it("AC1: la fecha va de hoy a 30 días adelante", () => {
    render(<VisitaForm nowMs={NOW.getTime()} defaults={DEFAULTS} />);

    expect(field("visitDate").min).toBe("2026-11-22");
    expect(field("visitDate").max).toBe("2026-12-22");
  });

  it("AC1: la hora va de 06:00 a 22:00 en pasos de 15 minutos", () => {
    render(<VisitaForm nowMs={NOW.getTime()} defaults={DEFAULTS} />);

    const times = [...field("expectedTime").options].map((option) => option.value);
    expect(times[0]).toBe("06:00");
    expect(times.at(-1)).toBe("22:00");
    expect(times.every((time) => Number(time.slice(3)) % 15 === 0)).toBe(true);
  });

  it("AC1: si la visita es hoy, no ofrece horas anteriores a la hora actual", () => {
    render(<VisitaForm nowMs={NOW.getTime()} defaults={{ visitDate: "2026-11-22", expectedTime: "10:15" }} />);

    const times = [...field("expectedTime").options].map((option) => option.value);
    expect(times[0]).toBe("10:15");
    expect(times).not.toContain("10:00");
  });

  it("AC2: al autorizar muestra el código grande, el visitante, la fecha y la vigencia con Copiar código", async () => {
    autorizarVisita.mockResolvedValue({ visit: VISIT });
    render(<VisitaForm nowMs={NOW.getTime()} defaults={DEFAULTS} />);
    fillValid();

    await act(async () => fireEvent.click(autorizar()));

    expect(screen.getByRole("status").textContent).toBe("Visita autorizada");
    expect(screen.getByLabelText("Código X U 2 C E Y").textContent).toBe("XU2CEY");
    expect(screen.getByText("Roberto Díaz")).toBeTruthy();
    expect(screen.getByText("23/11/2026, hora estimada 10:00")).toBeTruthy();
    expect(screen.getByText("Válido el 23/11/2026 de 06:00 a 22:00")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copiar código" })).toBeTruthy();
  });

  it("AC2: envía los datos del formulario a la acción del servidor", async () => {
    autorizarVisita.mockResolvedValue({ visit: VISIT });
    render(<VisitaForm nowMs={NOW.getTime()} defaults={DEFAULTS} />);
    fillValid();

    await act(async () => fireEvent.click(autorizar()));

    const formData = autorizarVisita.mock.calls[0][1] as FormData;
    expect(Object.fromEntries(formData)).toEqual({
      visitorName: "Roberto Díaz",
      documentType: "DUI",
      documentNumber: "09876543-2",
      visitDate: "2026-11-23",
      expectedTime: "10:00",
      reason: "Visita familiar",
    });
  });

  it("AC3: cada campo inválido muestra su mensaje debajo", () => {
    render(<VisitaForm nowMs={NOW.getTime()} defaults={DEFAULTS} />);

    fill("visitorName", "Ro");
    fill("documentNumber", "123");
    fill("reason", "Hola");

    expect(screen.getByText("El nombre debe tener entre 3 y 80 caracteres, solo letras y espacios.")).toBeTruthy();
    expect(screen.getByText("Ingresa el DUI con el formato 00000000-0.")).toBeTruthy();
    expect(screen.getByText("El motivo debe tener entre 5 y 100 caracteres.")).toBeTruthy();
  });

  it("AC3: con un pasaporte inválido muestra su mensaje", () => {
    render(<VisitaForm nowMs={NOW.getTime()} defaults={DEFAULTS} />);

    fireEvent.click(screen.getByRole("radio", { name: "Pasaporte" }));
    fill("documentNumber", "AB-1");

    expect(screen.getByText("El pasaporte debe tener de 6 a 12 letras o números.")).toBeTruthy();
  });

  it("AC3: Autorizar queda deshabilitado mientras haya errores y se habilita al corregirlos", () => {
    render(<VisitaForm nowMs={NOW.getTime()} defaults={DEFAULTS} />);

    expect(autorizar().disabled).toBe(true);
    fillValid();
    expect(autorizar().disabled).toBe(false);
    fill("documentNumber", "123");
    expect(autorizar().disabled).toBe(true);
    expect(autorizarVisita).not.toHaveBeenCalled();
  });
});
