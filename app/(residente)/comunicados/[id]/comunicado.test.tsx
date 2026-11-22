import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComunicadoDetalle } from "@/lib/comunicados";
import ComunicadoPage from "./page";

const apiFetch = vi.hoisted(() => vi.fn());
const requireRole = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({ apiFetch, requireRole }));

const ID = "3c2b1a09-8f7e-4d6c-9b5a-4e3d2c1b0a9f";

const corte: ComunicadoDetalle = {
  id: ID,
  title: "Corte de agua el 10 de noviembre",
  body: "No habrá agua de 08:00 a 16:00.\nLlena tus depósitos el día anterior.",
  category: "CORTE_SERVICIO",
  publishedAt: "2026-11-07T15:30:00.000Z",
  expiresOn: "2026-11-14",
  readAt: "2026-11-08T16:15:00.000Z",
};

async function abrir(searchParams: Record<string, string> = {}) {
  render(
    await ComunicadoPage({
      params: Promise.resolve({ id: ID }),
      searchParams: Promise.resolve(searchParams),
    }),
  );
}

describe("H27. Consulta de comunicados relevantes", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    requireRole.mockResolvedValue({ role: "RESIDENTE" });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-08T18:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('AC3: al abrir guarda la lectura y muestra el comunicado completo con "Leído el <fecha> a las <hora>"', async () => {
    apiFetch.mockResolvedValue(new Response(JSON.stringify(corte)));
    await abrir({ tab: "archivados" });

    expect(apiFetch).toHaveBeenCalledWith(`comunicados/${ID}/lectura`, {
      method: "POST",
    });
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Corte de agua el 10 de noviembre",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Corte de servicio")).toBeTruthy();
    expect(
      screen.getByText("Publicado el 07/11/2026. Vigente hasta el 14/11/2026."),
    ).toBeTruthy();
    expect(screen.getByText(/^No habrá agua/).textContent).toBe(corte.body);
    expect(
      screen.getByText("Leído el 08/11/2026 a las 10:15 a. m."),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Volver a comunicados" })
        .getAttribute("href"),
    ).toBe("/comunicados?tab=archivados");
  });

  it('AC7: un comunicado dirigido a otra torre muestra "El comunicado no existe."', async () => {
    apiFetch.mockResolvedValue(new Response("{}", { status: 404 }));
    await abrir();

    expect(screen.getByRole("alert").textContent).toBe(
      "El comunicado no existe.",
    );
    expect(screen.queryByRole("article")).toBeNull();
  });
});
