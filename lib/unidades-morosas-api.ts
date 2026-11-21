import { apiFetch } from "@/lib/api";
import {
  UNIDADES_MOROSAS_PAGE_SIZE,
  type FiltrosMorosas,
  type UnidadesMorosasReporte,
} from "@/lib/unidades-morosas";

export type UnidadesMorosasResult =
  | { ok: true; reporte: UnidadesMorosasReporte }
  | { ok: false; error: "validation"; message: string }
  | { ok: false; error: "forbidden" };

function firstMessage(body: unknown): string | undefined {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return undefined;
}

export async function getUnidadesMorosas(
  filtros: FiltrosMorosas,
  page: number,
): Promise<UnidadesMorosasResult> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(UNIDADES_MOROSAS_PAGE_SIZE),
  });
  if (filtros.towerId) params.set("towerId", filtros.towerId);
  if (filtros.search) params.set("search", filtros.search);

  const res = await apiFetch(`morosidad?${params}`);
  if (res.ok) return { ok: true, reporte: (await res.json()) as UnidadesMorosasReporte };
  if (res.status === 400) {
    const body = await res.json().catch(() => null);
    return {
      ok: false,
      error: "validation",
      message: firstMessage(body) ?? "Revisa los filtros del reporte.",
    };
  }
  if (res.status === 403) return { ok: false, error: "forbidden" };
  throw new Error(`GET morosidad respondió ${res.status}`);
}
