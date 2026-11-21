import { apiFetch } from "@/lib/api";
import { SV_TIME_ZONE } from "@/lib/fechas";

// Panel de morosidad (H32). Solo para Server Components y Server Functions:
// usa apiFetch, que lee la cookie de sesión.

export { MOROSIDAD_PATH, morosidadHref } from "@/lib/validation/morosidad";
export const PAGE_SIZE = 20;

export type MorosidadResumen = {
  owedAmount: number;
  /** Todas las morosas, tengan o no residente activo. */
  overdueUnits: number;
  /** Morosas con residente activo: numerador del porcentaje. */
  overdueActiveUnits: number;
  activeUnits: number;
  overduePct: number;
};

export type UnidadMorosa = {
  unitCode: string;
  owedAmount: number;
  ageDays: number;
};

// Respuesta de GET /admin/reportes/morosidad
export type MorosidadReporte = {
  summary: MorosidadResumen;
  data: UnidadMorosa[];
  total: number;
  page: number;
  pageSize: number;
};

export type MorosidadResult =
  | { ok: true; report: MorosidadReporte }
  | { ok: false; error: "validation"; message: string }
  | { ok: false; error: "forbidden" };

/** Fecha de hoy en El Salvador, "AAAA-MM-DD". */
export function todayIso(now: Date = new Date()): string {
  // en-CA formatea como AAAA-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SV_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Rango por defecto: últimos 12 meses hasta hoy (el 29 de febrero pasa al 28). */
export function defaultRange(today: string): { desde: string; hasta: string } {
  const [year, month, day] = today.split("-");
  const safeDay = month === "02" && day === "29" ? "28" : day;
  return { desde: `${Number(year) - 1}-${month}-${safeDay}`, hasta: today };
}

function firstMessage(body: unknown): string | undefined {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return undefined;
}

/**
 * GET /admin/reportes/morosidad. Un 400 (rango inválido) y un 403 se
 * devuelven para mostrarlos en la pantalla; cualquier otro error se lanza y
 * lo muestra error.tsx.
 */
export async function getMorosidad(
  desde: string,
  hasta: string,
  page: number,
): Promise<MorosidadResult> {
  const params = new URLSearchParams({
    from: desde,
    to: hasta,
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });
  const res = await apiFetch(`admin/reportes/morosidad?${params}`);
  if (res.ok) return { ok: true, report: await res.json() };
  if (res.status === 400) {
    const body = await res.json().catch(() => null);
    return {
      ok: false,
      error: "validation",
      message: firstMessage(body) ?? "Revisa el rango de fechas.",
    };
  }
  if (res.status === 403) return { ok: false, error: "forbidden" };
  throw new Error(`GET admin/reportes/morosidad respondió ${res.status}`);
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** 2340 → "$2,340.00" */
export function formatMonto(value: number): string {
  return money.format(value);
}

/** 14.6 → "14.6 %" */
export function formatPorcentaje(value: number): string {
  return `${value.toFixed(1)} %`;
}
