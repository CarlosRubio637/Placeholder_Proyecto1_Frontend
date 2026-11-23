import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { publicarComunicado } from "./comunicados";

const apiFetch = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
);
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({ apiFetch }));
vi.mock("next/navigation", () => ({ redirect, unstable_rethrow: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));

function formulario(entries: [string, string][]) {
  const formData = new FormData();
  for (const [name, value] of entries) formData.append(name, value);
  return formData;
}

describe("H25. Publicación de comunicados segmentados", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    redirect.mockClear();
    revalidatePath.mockReset();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-22T15:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('AC3: al publicar con éxito redirige a la lista de comunicados con el aviso "Comunicado publicado"', async () => {
    apiFetch.mockResolvedValue(new Response(JSON.stringify({ id: "a1" }), { status: 201 }));

    await expect(
      publicarComunicado(
        {},
        formulario([
          ["title", "Corte de agua el 4 de diciembre"],
          ["body", "No habrá agua de 08:00 a 16:00 en la Torre A."],
          ["category", "CORTE_SERVICIO"],
          ["towerIds", "ta"],
          ["expiresOn", "2026-11-29"],
        ]),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(apiFetch).toHaveBeenCalledWith("admin/comunicados", {
      method: "POST",
      body: JSON.stringify({
        title: "Corte de agua el 4 de diciembre",
        body: "No habrá agua de 08:00 a 16:00 en la Torre A.",
        category: "CORTE_SERVICIO",
        audience: "TORRES",
        towerIds: ["ta"],
        expiresOn: "2026-11-29",
      }),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/comunicados");
    expect(redirect).toHaveBeenCalledWith("/admin/comunicados?aviso=comunicado-publicado");
  });
});
