import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Perfil } from "@/lib/perfil";
import { PerfilForm } from "./perfil-form";

const guardarPerfil = vi.hoisted(() => vi.fn());

vi.mock("@/app/actions/perfil", () => ({ guardarPerfil }));

const perfil: Perfil = {
  fullName: "Ana Gómez",
  email: "residente1@condominio.test",
  unitCode: "A-101",
  phone: "7100-0001",
  directory: { visible: false, showName: false, showUnit: false, showPhone: false, showEmail: false },
};

function preview() {
  return within(screen.getByRole("complementary", { name: "Así te verán tus vecinos" }));
}

function option(name: string) {
  return screen.getByRole("checkbox", { name }) as HTMLInputElement;
}

function visibleSwitch() {
  return screen.getByRole("switch", { name: "Aparecer en el directorio" }) as HTMLInputElement;
}

describe("H28. Perfil y privacidad en el directorio", () => {
  beforeEach(() => {
    guardarPerfil.mockReset();
  });

  it("AC1: muestra nombre, correo y unidad en solo lectura y el teléfono editable con formato 0000-0000", () => {
    render(<PerfilForm perfil={perfil} />);

    for (const [name, value] of [
      ["Nombre completo", "Ana Gómez"],
      ["Correo", "residente1@condominio.test"],
      ["Unidad", "A-101"],
    ]) {
      const field = screen.getByRole("textbox", { name }) as HTMLInputElement;
      expect(field.value).toBe(value);
      expect(field.readOnly).toBe(true);
    }

    const phone = screen.getByRole("textbox", { name: "Teléfono" }) as HTMLInputElement;
    expect(phone.readOnly).toBe(false);
    expect(screen.getByText("Formato 0000-0000")).toBeTruthy();

    fireEvent.change(phone, { target: { value: "78451290" } });

    expect(screen.getByRole("alert").textContent).toBe("Ingresa el teléfono con el formato 0000-0000.");
    expect((screen.getByRole("button", { name: "Guardar" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("AC2: el interruptor empieza apagado con las casillas deshabilitadas y al encenderlo marca Nombre completo", () => {
    render(<PerfilForm perfil={perfil} />);

    expect(visibleSwitch().checked).toBe(false);
    for (const name of ["Nombre completo", "Unidad (torre y número)", "Teléfono", "Correo"]) {
      expect(option(name).disabled).toBe(true);
    }

    fireEvent.click(visibleSwitch());

    expect(visibleSwitch().checked).toBe(true);
    expect(option("Nombre completo").checked).toBe(true);
    for (const name of ["Unidad (torre y número)", "Teléfono", "Correo"]) {
      expect(option(name).disabled).toBe(false);
      expect(option(name).checked).toBe(false);
    }
  });

  it("AC3: la vista previa muestra la ficha y cambia al marcar o desmarcar antes de guardar", () => {
    render(<PerfilForm perfil={perfil} />);

    expect(preview().getByText("No apareces en el directorio.")).toBeTruthy();

    fireEvent.click(visibleSwitch());
    expect(preview().getByText("Ana Gómez")).toBeTruthy();
    expect(preview().queryByText("A-101")).toBeNull();

    fireEvent.click(option("Unidad (torre y número)"));
    expect(preview().getByText("A-101")).toBeTruthy();

    fireEvent.click(option("Unidad (torre y número)"));
    expect(preview().queryByText("A-101")).toBeNull();
    expect(guardarPerfil).not.toHaveBeenCalled();
  });

  it("AC4: al guardar muestra Preferencias guardadas y conserva lo elegido", async () => {
    const saved: Perfil = {
      ...perfil,
      directory: { visible: true, showName: true, showUnit: true, showPhone: false, showEmail: false },
    };
    guardarPerfil.mockResolvedValue({ saved });
    render(<PerfilForm perfil={perfil} />);

    fireEvent.click(visibleSwitch());
    fireEvent.click(option("Unidad (torre y número)"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Preferencias guardadas")).toBeTruthy();
    const sent = guardarPerfil.mock.calls[0][1] as FormData;
    expect(sent.get("visible")).toBe("on");
    expect(sent.get("showName")).toBe("on");
    expect(sent.get("showUnit")).toBe("on");
    expect(sent.get("showEmail")).toBe("");
    expect(visibleSwitch().checked).toBe(true);
    expect(option("Unidad (torre y número)").checked).toBe(true);
  });

  it("AC6: no permite guardar con el interruptor encendido si se oculta el nombre", () => {
    render(<PerfilForm perfil={perfil} />);

    fireEvent.click(visibleSwitch());
    fireEvent.click(option("Nombre completo"));

    expect(screen.getByRole("alert").textContent).toBe("Para aparecer en el directorio debes mostrar tu nombre.");
    expect((screen.getByRole("button", { name: "Guardar" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
