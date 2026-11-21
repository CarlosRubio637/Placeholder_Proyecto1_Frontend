import { apiFetch } from "@/lib/api";
import {
  DIRECTORIO_PAGE_SIZE,
  busquedaParams,
  type Busqueda,
  type DirectorioPagina,
} from "@/lib/directorio";

export type DirectorioResult =
  | { ok: true; pagina: DirectorioPagina }
  | { ok: false; error: "validation"; message: string }
  | { ok: false; error: "forbidden" };

function firstMessage(body: unknown): string | undefined {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string")
    return message[0];
  return undefined;
}

export async function getDirectorio(
  busqueda: Busqueda,
  page: number,
): Promise<DirectorioResult> {
  const params = new URLSearchParams([
    ["page", String(page)],
    ["pageSize", String(DIRECTORIO_PAGE_SIZE)],
    ...busquedaParams(busqueda),
  ]);
  const res = await apiFetch(`directorio?${params}`);
  if (res.ok)
    return { ok: true, pagina: (await res.json()) as DirectorioPagina };
  if (res.status === 400) {
    const body = await res.json().catch(() => null);
    return {
      ok: false,
      error: "validation",
      message: firstMessage(body) ?? "Revisa los datos de la búsqueda.",
    };
  }
  if (res.status === 403) return { ok: false, error: "forbidden" };
  throw new Error(`GET directorio respondió ${res.status}`);
}
