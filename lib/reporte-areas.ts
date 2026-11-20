import { apiFetch } from "@/lib/api";

// Reporte de uso de áreas comunes (H33). Solo para Server Components y Server
// Functions: usa apiFetch, que lee la cookie de sesión.

export const REPORTE_AREAS_PATH = "/admin/reportes/areas";

export type UsoArea = {
  areaId: string;
  name: string;
  /** Reservas Confirmadas con fecha en el periodo. */
  confirmed: number;
  /** Canceladas por el residente o la administración; solo informativo. */
  cancelled: number;
  reservedHours: number;
  enabledHours: number;
  /** Con un decimal; 0 si no hay horas habilitadas. */
  occupancyPct: number;
};

export type AreaDestacada = { areaId: string; name: string };

// Respuesta de GET /admin/reportes/areas
export type ReporteAreas = {
  /** Áreas habilitadas, de mayor a menor ocupación. */
  data: UsoArea[];
  /** null si no hay reservas Confirmadas en el periodo (estado vacío). */
  mostUsed: AreaDestacada | null;
  leastUsed: AreaDestacada | null;
};

export type ReporteAreasResult =
  | { ok: true; report: ReporteAreas }
  | { ok: false; error: "validation"; message: string }
  | { ok: false; error: "forbidden" };

function firstMessage(body: unknown): string | undefined {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return undefined;
}

/**
 * GET /admin/reportes/areas. Un 400 (periodo inválido) y un 403 se devuelven
 * para mostrarlos en la pantalla; cualquier otro error se lanza y lo muestra
 * error.tsx.
 */
export async function getReporteAreas(desde: string, hasta: string): Promise<ReporteAreasResult> {
  const params = new URLSearchParams({ from: desde, to: hasta });
  const res = await apiFetch(`admin/reportes/areas?${params}`);
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
  throw new Error(`GET admin/reportes/areas respondió ${res.status}`);
}

const numberFormat = new Intl.NumberFormat("es-SV", { maximumFractionDigits: 1 });

/** 3.6 → "3.6 %". */
export function formatPct(value: number): string {
  return `${numberFormat.format(value)} %`;
}

/** 14 → "14 h"; 1.5 → "1.5 h". */
export function formatHoras(value: number): string {
  return `${numberFormat.format(value)} h`;
}
