import { apiFetch } from "@/lib/api";

// Resumen "de un vistazo" de la administración (H37). Solo para Server
// Components y Server Functions: usa apiFetch, que lee la cookie de sesión.

export const RESUMEN_PATH = "/admin/resumen";

// Respuesta de GET /admin/reportes/resumen
export type Resumen = {
  /** Últimos 12 meses (H32). */
  debt: { owedAmount: number; overduePct: number };
  /** Mes actual (H33). null = sin áreas habilitadas o sin reservas. */
  areas: {
    avgOccupancyPct: number | null;
    mostUsed: { areaId: string; name: string } | null;
  };
  /** Abiertas hoy y, de ellas, las de más de 7 días (H34). */
  incidents: { openTotal: number; staleCount: number };
  /** Última asamblea Cerrada (H35); null si no hay ninguna. */
  voting: { assemblyTitle: string; avgParticipationPct: number } | null;
  generatedAt: string;
};

export type ResumenResult = { ok: true; resumen: Resumen } | { ok: false; error: "forbidden" };

/**
 * GET /admin/reportes/resumen. Un 403 se devuelve para mostrarlo en la
 * pantalla; cualquier otro error se lanza y lo muestra error.tsx.
 */
export async function getResumen(): Promise<ResumenResult> {
  const res = await apiFetch("admin/reportes/resumen");
  if (res.ok) return { ok: true, resumen: await res.json() };
  if (res.status === 403) return { ok: false, error: "forbidden" };
  throw new Error(`GET admin/reportes/resumen respondió ${res.status}`);
}

const hourFormat = new Intl.DateTimeFormat("es-SV", {
  timeZone: "America/El_Salvador",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Instante ISO → "HH:mm" en la hora del condominio. */
export function formatHora(iso: string): string {
  return hourFormat.format(new Date(iso));
}
