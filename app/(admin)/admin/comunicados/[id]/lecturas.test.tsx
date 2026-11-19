import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLecturas } from "@/lib/comunicados-api";
import type { AdminFiltro, LecturasPagina } from "@/lib/comunicados-admin";
import { FiltroLectura } from "./filtro-lectura";
import { TablaDestinatarios } from "./tabla-destinatarios";

const push = vi.hoisted(() => vi.fn());
const apiFetch = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));
vi.mock("@/lib/api", () => ({ apiFetch }));

const ID = "a1";
const lista: AdminFiltro = { status: "VIGENTE", category: null, page: 2 };

function lecturas(overrides: Partial<LecturasPagina> = {}): LecturasPagina {
  return {
    announcement: {
      id: ID,
      title: "Mantenimiento de ascensores",
      body: "El lunes no habrá ascensores.",
      category: "MANTENIMIENTO",
      audience: "TODOS",
      towers: [],
      publishedAt: "2026-11-16T15:00:00.000Z",
      expiresOn: "2026-11-28",
      status: "VIGENTE",
      readCount: 1,
      recipientCount: 2,
      readPct: 50,
    },
    data: [
      { fullName: "Roberto Díaz", unitCode: "B-101", readAt: null },
      {
        fullName: "Sofía Castillo",
        unitCode: "B-203",
        readAt: "2026-11-19T02:15:00.000Z",
      },
    ],
    total: 2,
    page: 1,
    pageSize: 50,
    ...overrides,
  };
}

function texts(row: HTMLElement): string[] {
  return within(row)
    .getAllByRole("cell")
    .map((cell) => (cell.textContent ?? "").replace(/\s+/g, " ").trim());
}

describe("H26. Comunicados publicados y control de lecturas", () => {
  beforeEach(() => {
    push.mockReset();
    apiFetch.mockReset();
  });

  it("AC2: la tabla muestra nombre, unidad, estado de lectura y fecha y hora en el orden recibido", () => {
    render(
      <TablaDestinatarios
        id={ID}
        lecturas={lecturas()}
        filtro={{ read: null, page: 1 }}
        lista={lista}
      />,
    );

    expect(
      screen.getAllByRole("columnheader").map((th) => th.textContent),
    ).toEqual(["Nombre", "Unidad", "Lectura", "Fecha y hora de lectura"]);
    const [, first, second] = screen.getAllByRole("row");
    expect(texts(first)).toEqual(["Roberto Díaz", "B-101", "No leído", "-"]);
    expect(texts(second)).toEqual([
      "Sofía Castillo",
      "B-203",
      "Leído",
      "18/11/2026 08:15 p. m.",
    ]);
  });

  it("AC2: pide 50 por página con el filtro y pagina de 50 en 50 sin perder los filtros de la lista", async () => {
    apiFetch.mockResolvedValue(new Response(JSON.stringify(lecturas())));
    await getLecturas(ID, { read: false, page: 2 });
    expect(apiFetch).toHaveBeenCalledWith(
      "admin/comunicados/a1/lecturas?page=2&pageSize=50&read=false",
    );

    render(
      <TablaDestinatarios
        id={ID}
        lecturas={lecturas({ total: 51 })}
        filtro={{ read: false, page: 1 }}
        lista={lista}
      />,
    );
    expect(screen.getByText("51 destinatarios, página 1 de 2")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Siguiente" })).toHaveProperty(
      "search",
      "?read=false&page=2&status=VIGENTE&listPage=2",
    );
  });

  it("AC2: el filtro de lectura ofrece Todos, Leído y No leído y cambia la URL", () => {
    render(<FiltroLectura id={ID} read={null} lista={lista} />);

    const filtro = screen.getByRole("combobox", { name: "Lectura" });
    expect(
      within(filtro)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Todos", "Leído", "No leído"]);
    fireEvent.change(filtro, { target: { value: "false" } });
    expect(push).toHaveBeenLastCalledWith(
      "/admin/comunicados/a1?read=false&status=VIGENTE&listPage=2",
    );
  });

  it('AC3: con No leído y sin resultados muestra "Todos los destinatarios ya leyeron este comunicado."', () => {
    render(
      <TablaDestinatarios
        id={ID}
        lecturas={lecturas({ data: [], total: 0 })}
        filtro={{ read: false, page: 1 }}
        lista={lista}
      />,
    );
    expect(
      screen.getByText("Todos los destinatarios ya leyeron este comunicado."),
    ).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it.each([
    [true, "Nadie ha leído este comunicado todavía."],
    [null, "Este comunicado no tuvo destinatarios."],
  ])(
    "con read=%s y sin resultados muestra su propio mensaje",
    (read, message) => {
      render(
        <TablaDestinatarios
          id={ID}
          lecturas={lecturas({ data: [], total: 0 })}
          filtro={{ read, page: 1 }}
          lista={lista}
        />,
      );
      expect(screen.getByText(message)).toBeTruthy();
    },
  );
});
