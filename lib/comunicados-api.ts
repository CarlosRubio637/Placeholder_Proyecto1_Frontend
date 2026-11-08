import { apiFetch } from "@/lib/api";
import {
  RESIDENT_PAGE_SIZE,
  type ComunicadoDetalle,
  type ComunicadosFiltro,
  type ComunicadosPagina,
} from "@/lib/comunicados";

export type ComunicadosResult =
  | { ok: true; pagina: ComunicadosPagina }
  | { ok: false; error: "validation"; message: string }
  | { ok: false; error: "forbidden" };

export type AbrirResult =
  | { ok: true; comunicado: ComunicadoDetalle }
  | { ok: false; error: "not-found" | "forbidden" };

function firstMessage(body: unknown): string | undefined {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string")
    return message[0];
  return undefined;
}

export async function getComunicados({
  tab,
  category,
  page,
}: ComunicadosFiltro): Promise<ComunicadosResult> {
  const params = new URLSearchParams({
    tab,
    page: String(page),
    pageSize: String(RESIDENT_PAGE_SIZE),
  });
  if (category) params.set("category", category);
  const res = await apiFetch(`comunicados?${params}`);
  if (res.ok)
    return { ok: true, pagina: (await res.json()) as ComunicadosPagina };
  if (res.status === 400) {
    const body = await res.json().catch(() => null);
    return {
      ok: false,
      error: "validation",
      message: firstMessage(body) ?? "Revisa los filtros.",
    };
  }
  if (res.status === 403) return { ok: false, error: "forbidden" };
  throw new Error(`GET comunicados respondió ${res.status}`);
}

export async function abrirComunicado(id: string): Promise<AbrirResult> {
  const res = await apiFetch(`comunicados/${encodeURIComponent(id)}/lectura`, {
    method: "POST",
  });
  if (res.ok)
    return { ok: true, comunicado: (await res.json()) as ComunicadoDetalle };
  if (res.status === 400 || res.status === 404)
    return { ok: false, error: "not-found" };
  if (res.status === 403) return { ok: false, error: "forbidden" };
  throw new Error(`POST comunicados/${id}/lectura respondió ${res.status}`);
}
