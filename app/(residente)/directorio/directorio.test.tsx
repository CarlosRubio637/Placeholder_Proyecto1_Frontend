import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDirectorio } from "@/lib/directorio-api";
import type { DirectorioPagina, Vecino } from "@/lib/directorio";
import { BuscarVecinos } from "./buscar-vecinos";
import { ResultadosDirectorio } from "./resultados-directorio";

const push = vi.hoisted(() => vi.fn());
const apiFetch = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));
vi.mock("@/lib/api", () => ({ apiFetch }));

const TORRES = [
  { id: "ta", name: "Torre A", letter: "A" },
  { id: "tb", name: "Torre B", letter: "B" },
  { id: "tc", name: "Torre C", letter: "C" },
];

const ana: Vecino = {
  fullName: "Ana Gómez",
  unitCode: "A-101",
  phone: "7100-0001",
  email: "residente1@condominio.test",
};
const luis: Vecino = { fullName: "Luis Gómez", phone: "7100-0002" };

function pagina(data: Vecino[], total = data.length): DirectorioPagina {
  return { data, total, page: 1, pageSize: 20 };
}

function buscar() {
  return screen.getByRole("button", { name: "Buscar" }) as HTMLButtonElement;
}

describe("H29. Búsqueda de contacto de vecinos", () => {
  beforeEach(() => {
    push.mockReset();
    apiFetch.mockReset();
  });

  it("AC1: busca por nombre al presionar Buscar", () => {
    render(<BuscarVecinos torres={TORRES} busqueda={null} />);

    expect(
      screen.getByRole("radio", { name: "Nombre" }) as HTMLInputElement,
    ).toHaveProperty("checked", true);
    fireEvent.change(screen.getByRole("textbox", { name: "Nombre" }), {
      target: { value: "  Gómez " },
    });
    fireEvent.click(buscar());

    expect(push).toHaveBeenCalledWith("/directorio?name=G%C3%B3mez");
  });

  it("AC1: con menos de 3 caracteres avisa y deshabilita Buscar", () => {
    render(<BuscarVecinos torres={TORRES} busqueda={null} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Nombre" }), {
      target: { value: "go" },
    });

    expect(
      screen.getByText("Escribe al menos 3 caracteres del nombre."),
    ).toBeTruthy();
    expect(buscar().disabled).toBe(true);
  });

  it("AC1: busca por torre y número de unidad de 3 dígitos", () => {
    render(<BuscarVecinos torres={TORRES} busqueda={null} />);

    fireEvent.click(screen.getByRole("radio", { name: "Unidad" }));
    const torre = screen.getByRole("combobox", { name: "Torre" });
    expect(
      within(torre)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Selecciona", "Torre A", "Torre B", "Torre C"]);
    fireEvent.change(torre, { target: { value: "tb" } });
    const numero = screen.getByRole("textbox", { name: "Número de unidad" });
    fireEvent.change(numero, { target: { value: "1a" } });
    expect(
      screen.getByText("Ingresa el número de unidad de 3 dígitos."),
    ).toBeTruthy();
    expect(buscar().disabled).toBe(true);

    fireEvent.change(numero, { target: { value: "101" } });
    fireEvent.click(buscar());
    expect(push).toHaveBeenCalledWith("/directorio?towerId=tb&unitNumber=101");
  });

  it("AC1: pide 20 por página y pagina de 20 en 20 en el orden recibido", async () => {
    apiFetch.mockResolvedValue(new Response(JSON.stringify(pagina([]))));
    await getDirectorio({ mode: "nombre", name: "gomez" }, 2);
    expect(apiFetch).toHaveBeenCalledWith(
      "directorio?page=2&pageSize=20&name=gomez",
    );

    render(
      <ResultadosDirectorio
        pagina={pagina([ana, luis], 21)}
        busqueda={{ mode: "nombre", name: "gomez" }}
        page={1}
      />,
    );
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
    ).toEqual(["Ana Gómez", "Luis Gómez"]);
    expect(screen.getByText("21 residentes, página 1 de 2")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Siguiente" })).toHaveProperty(
      "search",
      "?name=gomez&page=2",
    );
  });

  it("AC2: cada tarjeta muestra solo los datos que el vecino comparte", () => {
    render(
      <ResultadosDirectorio
        pagina={pagina([ana, luis])}
        busqueda={{ mode: "nombre", name: "gomez" }}
        page={1}
      />,
    );

    const [anaCard, luisCard] = screen.getAllByRole("listitem");
    expect(within(anaCard).getByText("A-101")).toBeTruthy();
    expect(
      within(anaCard).getByRole("link", { name: "residente1@condominio.test" }),
    ).toHaveProperty("href", "mailto:residente1@condominio.test");
    expect(
      within(luisCard).getByRole("link", { name: "7100-0002" }),
    ).toHaveProperty("href", "tel:7100-0002");
    expect(luisCard.textContent).not.toMatch(/Unidad|Correo/);
  });

  it('AC3: sin coincidencias muestra "No se encontraron residentes que coincidan con la búsqueda."', () => {
    render(
      <ResultadosDirectorio
        pagina={pagina([])}
        busqueda={{ mode: "nombre", name: "zzz" }}
        page={1}
      />,
    );
    expect(
      screen.getByText(
        "No se encontraron residentes que coincidan con la búsqueda.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("antes de buscar invita a buscar por nombre o unidad", () => {
    render(<ResultadosDirectorio pagina={null} busqueda={null} page={1} />);
    expect(
      screen.getByText("Busca a un vecino por su nombre o su unidad."),
    ).toBeTruthy();
  });
});
