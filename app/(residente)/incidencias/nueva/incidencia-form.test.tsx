import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { IncidentDetail } from "@/lib/incidencias";
import { IncidenciaForm } from "./incidencia-form";

const apiFetch = vi.hoisted(() => vi.fn());
// Solo registra a dónde redirige (el redirect real corta la acción lanzando un error).
const redirect = vi.hoisted(() => vi.fn());
const registrar = vi.hoisted(() => vi.fn());
const fetchIncident = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  apiFetch,
  requireAnyRole: vi.fn(async () => ({ id: "u1", role: "RESIDENTE", unit: { code: "A-101" } })),
}));
vi.mock("next/navigation", () => ({
  redirect,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/incidencias-api", () => ({ fetchIncident, fetchStaff: vi.fn(async () => []) }));
// El formulario usa la acción a través de este mock; la acción real se prueba abajo.
vi.mock("@/app/actions/incidencias", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/app/actions/incidencias")>();
  registrar.mockImplementation(real.registrarIncidencia);
  return { ...real, registrarIncidencia: (...args: Parameters<typeof real.registrarIncidencia>) => registrar(...args) };
});

const MB = 1024 * 1024;

function file(name: string, type: string, size = 1000) {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}
const png = (n = 1) => file(`foto${n}.png`, "image/png");

function fileInput() {
  return document.querySelector('input[type="file"]') as HTMLInputElement;
}
function choose(...files: File[]) {
  fireEvent.change(fileInput(), { target: { files } });
}
function field(label: string) {
  return screen.getByLabelText(label) as HTMLInputElement;
}
function registrarButton() {
  return screen.getByRole("button", { name: "Registrar" }) as HTMLButtonElement;
}
function fillValid() {
  fireEvent.change(field("Título"), { target: { value: "Fuga de agua" } });
  fireEvent.change(field("Descripción"), { target: { value: "Gotea agua del techo del pasillo." } });
  fireEvent.change(field("Ubicación"), { target: { value: "TORRE_A" } });
}

describe("H10. Registro de incidencia con evidencia", () => {
  beforeAll(() => {
    let n = 0;
    URL.createObjectURL = vi.fn(() => `blob:foto-${++n}`);
    URL.revokeObjectURL = vi.fn();
  });
  afterAll(() => {
    vi.restoreAllMocks();
  });
  beforeEach(() => {
    apiFetch.mockReset();
    redirect.mockClear();
    registrar.mockClear();
  });

  it("AC1: pide título, descripción, ubicación con las 11 opciones, referencia opcional y fotografías", () => {
    render(<IncidenciaForm />);

    expect(field("Título").maxLength).toBe(80);
    expect(field("Descripción").maxLength).toBe(1000);
    expect(screen.getByText(/0\/1,000/)).toBeTruthy();
    expect(field("Referencia de la ubicación (opcional)").maxLength).toBe(100);
    const options = within(field("Ubicación")).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual([
      "Selecciona la ubicación",
      "Torre A",
      "Torre B",
      "Torre C",
      "Estacionamiento",
      "Piscina",
      "Gimnasio",
      "Salón de eventos",
      "Asador",
      "Lobby",
      "Áreas verdes",
      "Otra",
    ]);
    expect(screen.getByRole("group", { name: "Fotografías" })).toBeTruthy();
    expect(screen.getByText("De 1 a 3 imágenes JPG o PNG, de hasta 5 MB cada una.")).toBeTruthy();
  });

  it("AC1: muestra el mensaje de cada campo fuera de rango y no deja registrar", () => {
    render(<IncidenciaForm />);

    fireEvent.change(field("Título"), { target: { value: "Fuga" } });
    fireEvent.blur(field("Título"));
    fireEvent.change(field("Descripción"), { target: { value: "Corta" } });
    fireEvent.blur(field("Descripción"));
    fireEvent.blur(field("Ubicación"));
    fireEvent.change(field("Referencia de la ubicación (opcional)"), { target: { value: "x".repeat(101) } });
    fireEvent.blur(field("Referencia de la ubicación (opcional)"));

    expect(screen.getByText("El título debe tener entre 5 y 80 caracteres.")).toBeTruthy();
    expect(screen.getByText("La descripción debe tener entre 10 y 1,000 caracteres.")).toBeTruthy();
    expect(screen.getByText("Selecciona una ubicación.")).toBeTruthy();
    expect(screen.getByText(/La referencia/)).toBeTruthy();
    expect(registrarButton().disabled).toBe(true);
  });

  it("AC1: sin fotografías pide al menos una y no deja registrar", () => {
    render(<IncidenciaForm />);
    fillValid();

    fireEvent.submit(registrarButton().closest("form")!);

    expect(screen.getByText("Agrega al menos una fotografía.")).toBeTruthy();
    expect(registrar).not.toHaveBeenCalled();
  });

  it("AC2: cada fotografía muestra su vista previa y Quitar la elimina", () => {
    render(<IncidenciaForm />);

    choose(png(1), png(2));

    const previews = screen.getAllByRole("img");
    expect(previews.map((img) => img.getAttribute("alt"))).toEqual([
      "Fotografía 1: foto1.png",
      "Fotografía 2: foto2.png",
    ]);
    expect(previews[0].getAttribute("src")).toMatch(/^blob:/);

    fireEvent.click(screen.getAllByRole("button", { name: "Quitar" })[0]);

    expect(screen.getAllByRole("img").map((img) => img.getAttribute("alt"))).toEqual([
      "Fotografía 1: foto2.png",
    ]);
  });

  it.each([
    ["un archivo que no es JPG ni PNG", file("documento.pdf", "application/pdf")],
    ["una imagen de más de 5 MB", file("grande.png", "image/png", 5 * MB + 1)],
  ])("AC2: rechaza %s con su mensaje", (_caso, rejected) => {
    render(<IncidenciaForm />);

    choose(rejected);

    expect(screen.getByText("Solo se permiten imágenes JPG o PNG de hasta 5 MB.")).toBeTruthy();
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("AC2: no permite agregar una cuarta fotografía", () => {
    render(<IncidenciaForm />);

    choose(png(1), png(2), png(3), png(4));

    expect(screen.getAllByRole("img")).toHaveLength(3);
    expect(screen.getByText("Puedes adjuntar como máximo 3 fotografías.")).toBeTruthy();
    expect((screen.getByRole("button", { name: /Agregar otra/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("AC3: al registrar con éxito redirige al detalle con el número de la incidencia", async () => {
    apiFetch.mockResolvedValue(
      new Response(JSON.stringify({ id: "inc-7", number: "INC-2026-00007" }), { status: 201 }),
    );
    render(<IncidenciaForm />);
    fillValid();
    choose(png(1));

    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    await act(async () => {
      fireEvent.submit(registrarButton().closest("form")!);
    });
    quiet.mockRestore();

    const [path, init] = apiFetch.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("incidencias");
    expect(init.method).toBe("POST");
    const sent = init.body as FormData;
    expect(sent.get("title")).toBe("Fuga de agua");
    expect(sent.get("location")).toBe("TORRE_A");
    expect(sent.getAll("photos")).toHaveLength(1);
    expect(redirect).toHaveBeenCalledWith("/incidencias/inc-7?registrada=INC-2026-00007");
  });

  it("AC3: el detalle muestra el aviso Incidencia INC-AAAA-NNNNN registrada y el estado Pendiente", async () => {
    const { default: DetalleIncidenciaPage } = await import("@/app/(comun)/incidencias/[id]/page");
    const incident: IncidentDetail = {
      id: "inc-7",
      number: "INC-2026-00007",
      title: "Fuga de agua",
      description: "Gotea agua del techo del pasillo.",
      location: "TORRE_A",
      locationDetail: null,
      status: "PENDIENTE",
      priority: "MEDIA",
      createdAt: "2026-11-06T18:00:00.000Z",
      resolvedAt: null,
      unit: { code: "A-101" },
      assignee: null,
      photos: [],
      events: [
        {
          type: "CREACION",
          fromStatus: null,
          toStatus: "PENDIENTE",
          fromValue: null,
          toValue: null,
          note: "Incidencia registrada",
          authorLabel: "Ana Gómez",
          createdAt: "2026-11-06T18:00:00.000Z",
        },
      ],
    } as unknown as IncidentDetail;
    fetchIncident.mockResolvedValue(incident);

    render(
      await DetalleIncidenciaPage({
        params: Promise.resolve({ id: "inc-7" }),
        searchParams: Promise.resolve({ registrada: "INC-2026-00007" }),
      } as never),
    );

    expect(screen.getByRole("status").textContent).toBe("Incidencia INC-2026-00007 registrada");
    expect(screen.getAllByText("Pendiente").length).toBeGreaterThan(0);
  });
});
