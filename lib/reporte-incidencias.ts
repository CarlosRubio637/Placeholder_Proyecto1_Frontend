import { apiFetch } from "@/lib/api";
import { SV_TIME_ZONE } from "@/lib/fechas";
import type { IncidentPriority, IncidentStatus } from "@/lib/incidencias";

// Reporte de incidencias abiertas (H34). Solo para Server Components y Server
// Functions: usa apiFetch, que lee la cookie de sesión.

export const PAGE_SIZE = 20;

export type CeldaMatriz = {
  status: IncidentStatus;
  priority: IncidentPriority;
  count: number;
};

export type IncidenciaAntigua = {
  number: string;
  title: string;
  unitCode: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  /** Nombre del responsable de mantenimiento, o null si no tiene. */
  assignee: string | null;
  daysOpen: number;
};

// Respuesta de GET /admin/reportes/incidencias
export type ReporteIncidencias = {
  /** Las 9 combinaciones estado × prioridad de las creadas en el periodo. */
  matrix: CeldaMatriz[];
  openTotal: number;
  /** null = "Sin datos". */
  avgResolutionDays: number | null;
  /** Abiertas hoy con más de 7 días; no depende del periodo. */
  stale: {
    data: IncidenciaAntigua[];
    total: number;
    page: number;
    pageSize: number;
  };
};

export type ReporteIncidenciasResult =
  | { ok: true; report: ReporteIncidencias }
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

function firstMessage(body: unknown): string | undefined {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return undefined;
}

/**
 * GET /admin/reportes/incidencias. Un 400 (periodo inválido) y un 403 se
 * devuelven para mostrarlos en la pantalla; cualquier otro error se lanza y
 * lo muestra error.tsx.
 */
export async function getReporteIncidencias(
  desde: string,
  hasta: string,
  page: number,
): Promise<ReporteIncidenciasResult> {
  const params = new URLSearchParams({
    from: desde,
    to: hasta,
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });
  const res = await apiFetch(`admin/reportes/incidencias?${params}`);
  if (res.ok) return { ok: true, report: await res.json() };
  if (res.status === 400) {
    const body = await res.json().catch(() => null);
    return {
      ok: false,
      error: "validation",
      message: firstMessage(body) ?? "Revisa el periodo seleccionado.",
    };
  }
  if (res.status === 403) return { ok: false, error: "forbidden" };
  throw new Error(`GET admin/reportes/incidencias respondió ${res.status}`);
}

/** 3.4 → "3.4 días"; null → "Sin datos". */
export function formatPromedio(value: number | null): string {
  if (value === null) return "Sin datos";
  return `${value.toFixed(1)} ${value === 1 ? "día" : "días"}`;
}
