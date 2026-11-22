import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { describeEvent, type IncidentDetail, type MaintenanceStaff } from "@/lib/incidencias";
import { GestionPanel } from "@/app/(comun)/incidencias/[id]/gestion-panel";
import DetalleIncidenciaPage from "@/app/(comun)/incidencias/[id]/page";
import { FiltrosIncidencias } from "./filtros";
import IncidenciasAdminPage from "./page";

const apiFetch = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());
const admin = { id: "a1", role: "ADMINISTRADOR", unit: null };

vi.mock("@/lib/api", () => ({
  apiFetch,
  requireRole: vi.fn(async () => admin),
  requireAnyRole: vi.fn(async () => admin),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  unstable_rethrow: vi.fn(),
  usePathname: () => "/admin/incidencias",
  useRouter: () => ({ push, refresh }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const INC = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const STAFF: MaintenanceStaff[] = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Pedro Alvarado", specialty: "Fontanería", phone: "7200-0001" },
  { id: "22222222-2222-4222-8222-222222222222", name: "Miguel Torres", specialty: "Electricidad", phone: "7200-0002" },
];
const alta = {
  id: "inc-3",
  number: "INC-2026-00003",
  title: "Corto en el lobby",
  unitCode: "B-101",
  location: "LOBBY",
  status: "PENDIENTE",
  priority: "ALTA",
  assignee: null,
  daysOpen: 0,
};
const media = {
  id: "inc-1",
  number: "INC-2026-00001",
  title: "Fuga de agua",
  unitCode: "A-101",
  location: "TORRE_A",
  status: "EN_PROCESO",
  priority: "MEDIA",
  assignee: { id: STAFF[0].id, name: "Pedro Alvarado" },
  daysOpen: 5,
};

/** Responde según la ruta: bandeja y catálogo de responsables. */
function backend(list: unknown) {
  apiFetch.mockImplementation(async (path: string) =>
    path.startsWith("admin/responsables") ? json({ data: STAFF }) : json(list),
  );
}

async function renderInbox(searchParams: Record<string, string> = {}) {
  render(await IncidenciasAdminPage({ searchParams: Promise.resolve(searchParams) } as never));
}

function rows() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent));
}

describe("H12. Bandeja de incidencias del administrador: priorizar y asignar", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    push.mockReset();
    refresh.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC1: la lista muestra número, título, unidad, ubicación, estado, prioridad, responsable y días", async () => {
    backend({ data: [alta, media], total: 2, page: 1, pageSize: 20 });
    await renderInbox();

    expect(screen.getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
      "Número",
      "Título",
      "Unidad",
      "Ubicación",
      "Estado",
      "Prioridad",
      "Responsable",
      "Antigüedad",
    ]);
    // En el orden del backend: prioridad y, dentro de cada una, la más antigua.
    expect(rows()).toEqual([
      ["INC-2026-00003", "Corto en el lobby", "B-101", "Lobby", "Pendiente", "Alta", "Sin asignar", "Hoy"],
      ["INC-2026-00001", "Fuga de agua", "A-101", "Torre A", "En proceso", "Media", "Pedro Alvarado", "5 días"],
    ]);
  });

  it("AC1: pide 20 por página y pagina conservando los filtros", async () => {
    backend({ data: [alta], total: 45, page: 2, pageSize: 20 });
    await renderInbox({ priority: "ALTA", page: "2" });

    expect(apiFetch).toHaveBeenCalledWith("admin/incidencias?page=2&pageSize=20&priority=ALTA");
    expect(screen.getByText(/45 incidencias · página 2 de 3/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Siguiente" }).getAttribute("href")).toBe(
      "/admin/incidencias?priority=ALTA&page=3",
    );
  });

  it("AC2: filtra por estado, prioridad, ubicación y responsable, y vuelve a la página 1", () => {
    render(<FiltrosIncidencias filters={{}} staff={STAFF} />);

    const options = (name: string) =>
      within(screen.getByRole("combobox", { name })).getAllByRole("option").map((o) => o.textContent);
    expect(options("Estado")).toEqual(["Todos", "Pendiente", "En proceso", "Resuelto"]);
    expect(options("Prioridad")).toEqual(["Todas", "Alta", "Media", "Baja"]);
    expect(options("Ubicación")).toHaveLength(12);
    expect(options("Responsable")).toEqual(["Todos", "Sin asignar", "Pedro Alvarado", "Miguel Torres"]);

    fireEvent.change(screen.getByRole("combobox", { name: "Responsable" }), { target: { value: "none" } });
    expect(push).toHaveBeenLastCalledWith("/admin/incidencias?assignee=none");
  });

  it("AC2: busca por número o título, máximo 80 caracteres", () => {
    render(<FiltrosIncidencias filters={{ status: "PENDIENTE" }} staff={STAFF} />);

    const search = screen.getByRole("searchbox", { name: "Buscar" }) as HTMLInputElement;
    expect(search.maxLength).toBe(80);
    expect(search.placeholder).toBe("Número o título");
    fireEvent.change(search, { target: { value: "  Fuga  " } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    expect(push).toHaveBeenLastCalledWith("/admin/incidencias?status=PENDIENTE&search=Fuga");
  });

  it("AC2: sin resultados dice No hay incidencias que coincidan con los filtros.", async () => {
    backend({ data: [], total: 0, page: 1, pageSize: 20 });
    await renderInbox({ search: "zz" });

    expect(screen.getByText("No hay incidencias que coincidan con los filtros.")).toBeTruthy();
  });

  it("AC3: el panel Gestión cambia prioridad y responsable con los activos, y al guardar muestra Cambios guardados", async () => {
    apiFetch.mockResolvedValue(json({ id: INC }));
    render(
      <GestionPanel incidentId={INC} priority="MEDIA" assigneeId={null} resolved={false} staff={STAFF} />,
    );

    expect(screen.getAllByRole("radio").map((r) => r.parentElement!.textContent)).toEqual(["Baja", "Media", "Alta"]);
    expect(
      within(screen.getByRole("combobox", { name: "Responsable" }))
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Sin asignar", "Pedro Alvarado · Fontanería", "Miguel Torres · Electricidad"]);
    const guardar = screen.getByRole("button", { name: "Guardar" }) as HTMLButtonElement;
    expect(guardar.disabled).toBe(true);

    fireEvent.click(screen.getByRole("radio", { name: "Alta" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Responsable" }), { target: { value: STAFF[1].id } });
    expect(guardar.disabled).toBe(false);
    await act(async () => {
      fireEvent.click(guardar);
    });

    expect(apiFetch).toHaveBeenCalledWith(`admin/incidencias/${INC}`, {
      method: "PATCH",
      body: JSON.stringify({ priority: "ALTA", assigneeId: STAFF[1].id }),
    });
    expect(screen.getByRole("status").textContent).toBe("Cambios guardados");
    // Vuelve a pedir el detalle para que el historial muestre el evento.
    expect(refresh).toHaveBeenCalled();
  });

  it("AC3: el historial del detalle muestra el cambio de prioridad y de responsable", async () => {
    const detail = {
      id: "inc-1",
      number: "INC-2026-00001",
      title: "Fuga de agua",
      description: "Gotea agua del techo del pasillo.",
      location: "TORRE_A",
      locationDetail: null,
      status: "PENDIENTE",
      priority: "ALTA",
      resolvedAt: null,
      createdAt: "2026-11-06T18:00:00.000Z",
      updatedAt: "2026-11-06T19:00:00.000Z",
      unit: { code: "A-101" },
      assignee: { id: STAFF[1].id, name: "Miguel Torres", specialty: "Electricidad" },
      photos: [],
      events: [
        { id: "e1", type: "PRIORIDAD", fromStatus: null, toStatus: null, fromValue: "MEDIA", toValue: "ALTA", note: null, authorLabel: "Administración", createdAt: "2026-11-06T19:00:00.000Z" },
        { id: "e2", type: "ASIGNACION", fromStatus: null, toStatus: null, fromValue: null, toValue: "Miguel Torres", note: null, authorLabel: "Administración", createdAt: "2026-11-06T19:00:00.000Z" },
      ],
    } as unknown as IncidentDetail;
    apiFetch.mockImplementation(async (path: string) =>
      path.startsWith("admin/responsables") ? json({ data: STAFF }) : json(detail),
    );

    render(await DetalleIncidenciaPage({ params: Promise.resolve({ id: "inc-1" }), searchParams: Promise.resolve({}) } as never));

    const historial = screen.getByRole("heading", { name: "Historial" }).parentElement!;
    for (const event of detail.events) {
      expect(within(historial).getByText(describeEvent(event))).toBeTruthy();
    }
    expect(screen.getByRole("heading", { name: "Gestión" })).toBeTruthy();
  });

  it("AC3: un conflicto 409 muestra el mensaje del servidor", async () => {
    apiFetch.mockResolvedValue(json({ message: "La incidencia está resuelta. Reábrela para modificarla." }, 409));
    render(<GestionPanel incidentId={INC} priority="MEDIA" assigneeId={null} resolved={false} staff={STAFF} />);

    fireEvent.click(screen.getByRole("radio", { name: "Baja" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    });

    expect(screen.getByRole("alert").textContent).toBe("La incidencia está resuelta. Reábrela para modificarla.");
  });

  it("AC4: la bandeja se vuelve a consultar cada 60 segundos mientras está abierta", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    backend({ data: [alta], total: 1, page: 1, pageSize: 20 });
    await renderInbox();

    vi.advanceTimersByTime(59_999);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("AC4: el botón Actualizar vuelve a consultar", async () => {
    backend({ data: [alta], total: 1, page: 1, pageSize: 20 });
    await renderInbox();

    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));

    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
