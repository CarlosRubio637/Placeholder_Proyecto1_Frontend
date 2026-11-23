import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDate, formatDateTime, type IncidentDetail } from "@/lib/incidencias";
import { RefreshButton } from "@/app/_components/incidencias/refresh-button";
import { StatusFilter } from "@/app/_components/incidencias/status-filter";
import DetalleIncidenciaPage from "@/app/(comun)/incidencias/[id]/page";
import MisIncidenciasPage from "./page";

const apiFetch = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());
const residente = { id: "u1", role: "RESIDENTE", unit: { code: "A-101" } };

vi.mock("@/lib/api", () => ({
  apiFetch,
  requireRole: vi.fn(async () => residente),
  requireAnyRole: vi.fn(async () => residente),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  usePathname: () => "/incidencias",
  useRouter: () => ({ push, refresh }),
}));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const fuga = {
  id: "inc-2",
  number: "INC-2026-00002",
  title: "Fuga de agua",
  location: "TORRE_A",
  status: "EN_PROCESO",
  priority: "ALTA",
  createdAt: "2026-11-06T18:00:00.000Z",
};
const luz = {
  id: "inc-1",
  number: "INC-2026-00001",
  title: "Lámpara fundida",
  location: "LOBBY",
  status: "PENDIENTE",
  priority: "MEDIA",
  createdAt: "2026-11-05T15:00:00.000Z",
};

const detail: IncidentDetail = {
  id: "inc-2",
  number: "INC-2026-00002",
  title: "Fuga de agua",
  description: "Gotea agua del techo del pasillo.",
  location: "TORRE_A",
  locationDetail: "Piso 3, pasillo norte",
  status: "EN_PROCESO",
  priority: "ALTA",
  resolvedAt: null,
  createdAt: "2026-11-06T18:00:00.000Z",
  updatedAt: "2026-11-06T19:00:00.000Z",
  unit: { code: "A-101" },
  assignee: { id: "s1", name: "Pedro Alvarado", specialty: "Fontanería" },
  photos: [
    { id: "f1", url: "incidencias/fotos/f1" },
    { id: "f2", url: "incidencias/fotos/f2" },
  ],
  events: [
    {
      id: "e1",
      type: "CREACION",
      fromStatus: null,
      toStatus: "PENDIENTE",
      fromValue: null,
      toValue: null,
      note: "Incidencia registrada",
      authorLabel: "Ana Gómez",
      createdAt: "2026-11-06T18:00:00.000Z",
    },
    {
      id: "e2",
      type: "ESTADO",
      fromStatus: "PENDIENTE",
      toStatus: "EN_PROCESO",
      fromValue: null,
      toValue: null,
      note: "Se revisa la tubería.",
      authorLabel: "Administración",
      createdAt: "2026-11-06T19:00:00.000Z",
    },
  ],
} as IncidentDetail;

async function renderList(searchParams: Record<string, string> = {}) {
  render(await MisIncidenciasPage({ searchParams: Promise.resolve(searchParams) } as never));
}

async function renderDetail(incident: IncidentDetail) {
  apiFetch.mockResolvedValue(json(incident));
  render(
    await DetalleIncidenciaPage({
      params: Promise.resolve({ id: incident.id }),
      searchParams: Promise.resolve({}),
    } as never),
  );
}

function rows() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent));
}

describe("H11. Mis incidencias y detalle con historial", () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
  });
  beforeEach(() => {
    apiFetch.mockReset();
    push.mockReset();
    refresh.mockReset();
  });

  it("AC1: la lista muestra número, título, ubicación, estado, prioridad y fecha de creación", async () => {
    apiFetch.mockResolvedValue(json({ data: [fuga, luz], total: 2, page: 1, pageSize: 10 }));
    await renderList();

    expect(screen.getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
      "Número",
      "Título",
      "Ubicación",
      "Estado",
      "Prioridad",
      "Creada",
    ]);
    expect(rows()).toEqual([
      ["INC-2026-00002", "Fuga de agua", "Torre A", "En proceso", "Alta", formatDate(fuga.createdAt)],
      ["INC-2026-00001", "Lámpara fundida", "Lobby", "Pendiente", "Media", formatDate(luz.createdAt)],
    ]);
  });

  it("AC1: pide 10 por página y pagina conservando el filtro", async () => {
    apiFetch.mockResolvedValue(json({ data: [fuga], total: 23, page: 2, pageSize: 10 }));
    await renderList({ status: "EN_PROCESO", page: "2" });

    expect(apiFetch).toHaveBeenCalledWith("incidencias/mias?page=2&pageSize=10&status=EN_PROCESO");
    expect(screen.getByText(/23 incidencias · página 2 de 3/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Anterior" }).getAttribute("href")).toBe(
      "/incidencias?status=EN_PROCESO",
    );
    expect(screen.getByRole("link", { name: "Siguiente" }).getAttribute("href")).toBe(
      "/incidencias?status=EN_PROCESO&page=3",
    );
  });

  it("AC2: el filtro ofrece Todos, Pendiente, En proceso y Resuelto, y al elegir vuelve a la página 1", () => {
    render(<StatusFilter />);

    const select = screen.getByRole("combobox", { name: "Estado" });
    expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Todos",
      "Pendiente",
      "En proceso",
      "Resuelto",
    ]);

    fireEvent.change(select, { target: { value: "RESUELTO" } });
    expect(push).toHaveBeenCalledWith("/incidencias?status=RESUELTO");
  });

  it("AC2: sin incidencias dice Tu unidad no ha reportado incidencias.", async () => {
    apiFetch.mockResolvedValue(json({ data: [], total: 0, page: 1, pageSize: 10 }));
    await renderList();

    expect(screen.getByText("Tu unidad no ha reportado incidencias.")).toBeTruthy();
  });

  it("AC2: con un filtro sin resultados dice No hay incidencias con ese estado.", async () => {
    apiFetch.mockResolvedValue(json({ data: [], total: 0, page: 1, pageSize: 10 }));
    await renderList({ status: "RESUELTO" });

    expect(screen.getByText("No hay incidencias con ese estado.")).toBeTruthy();
  });

  it("AC3: el detalle muestra los datos, el responsable con su especialidad y el historial", async () => {
    await renderDetail(detail);

    expect(screen.getByRole("heading", { name: "Fuga de agua" })).toBeTruthy();
    expect(screen.getByText("INC-2026-00002")).toBeTruthy();
    expect(screen.getByText("Gotea agua del techo del pasillo.")).toBeTruthy();
    expect(screen.getByText(/Pedro Alvarado/).textContent).toBe("Pedro Alvarado · Fontanería");

    const historial = screen.getByRole("heading", { name: "Historial" }).parentElement!;
    const eventos = within(historial)
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent));
    expect(eventos).toEqual([
      [formatDateTime("2026-11-06T18:00:00.000Z"), "Registrada · Pendiente", "Incidencia registrada", "Ana Gómez"],
      [formatDateTime("2026-11-06T19:00:00.000Z"), "Pendiente → En proceso", "Se revisa la tubería.", "Administración"],
    ]);
  });

  it("AC3: sin responsable muestra Sin asignar", async () => {
    await renderDetail({ ...detail, assignee: null });

    expect(screen.getByText("Sin asignar")).toBeTruthy();
  });

  it("AC3: las fotografías se amplían al hacer clic", async () => {
    await renderDetail(detail);

    fireEvent.click(screen.getByRole("button", { name: "Ampliar fotografía 2 de 2" }));

    const dialog = document.querySelector("dialog")!;
    expect(dialog.open).toBe(true);
    const ampliada = within(dialog).getByRole("img");
    expect(ampliada.getAttribute("src")).toBe("/archivos/incidencias/fotos/f2");
    expect(within(dialog).getByText("2 de 2")).toBeTruthy();
  });

  it("AC3: una incidencia que no existe muestra La incidencia no existe.", async () => {
    apiFetch.mockResolvedValue(json({ message: "La incidencia no existe." }, 404));
    render(
      await DetalleIncidenciaPage({
        params: Promise.resolve({ id: "otra" }),
        searchParams: Promise.resolve({}),
      } as never),
    );

    expect(screen.getByText("La incidencia no existe.")).toBeTruthy();
  });

  it("AC4: la lista y el detalle se consultan al abrirlos", async () => {
    apiFetch.mockResolvedValue(json({ data: [], total: 0, page: 1, pageSize: 10 }));
    await renderList();
    expect(apiFetch).toHaveBeenCalledWith("incidencias/mias?page=1&pageSize=10");

    apiFetch.mockReset();
    await renderDetail(detail);
    expect(apiFetch).toHaveBeenCalledWith("incidencias/inc-2");
  });

  it("AC4: Actualizar vuelve a consultar sin perder el filtro ni la página", async () => {
    apiFetch.mockResolvedValue(json({ data: [fuga], total: 1, page: 1, pageSize: 10 }));
    await renderList();
    expect(screen.getByRole("button", { name: "Actualizar" })).toBeTruthy();

    render(<RefreshButton />);
    fireEvent.click(screen.getAllByRole("button", { name: "Actualizar" })[1]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });
});
