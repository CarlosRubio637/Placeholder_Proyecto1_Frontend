import { apiFetch } from "@/lib/api";
import type { AsambleaResumen, AsambleaStatus } from "@/lib/asambleas";

// Reporte de participación en votaciones (H35). Solo para Server Components y
// Server Functions: usa apiFetch, que lee la cookie de sesión.

export const PAGE_SIZE = 10;

export type ParticipacionTema = {
  question: string;
  votedUnits: number;
  eligibleUnits: number;
  /** Con un decimal. */
  participationPct: number;
};

export type ParticipacionAsamblea = {
  assemblyId: string;
  title: string;
  status: Extract<AsambleaStatus, "ABIERTA" | "CERRADA">;
  openedAt: string;
  avgParticipationPct: number;
  topics: ParticipacionTema[];
};

// Respuesta de GET /admin/reportes/participacion
export type ReporteParticipacion = {
  /** La apertura más reciente primero. */
  data: ParticipacionAsamblea[];
  total: number;
  page: number;
  pageSize: number;
};

export type ReporteParticipacionResult =
  | { ok: true; report: ReporteParticipacion }
  | { ok: false; error: "validation"; message: string }
  | { ok: false; error: "forbidden" };

function firstMessage(body: unknown): string | undefined {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return undefined;
}

/**
 * GET /admin/reportes/participacion. Un 400 (filtro inválido) y un 403 se
 * devuelven para mostrarlos en la pantalla; cualquier otro error se lanza y
 * lo muestra error.tsx.
 */
export async function getReporteParticipacion(
  filtros: { asamblea: string | null; desde: string; hasta: string },
  page: number,
): Promise<ReporteParticipacionResult> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (filtros.asamblea) {
    params.set("assemblyId", filtros.asamblea);
  } else {
    params.set("from", filtros.desde);
    params.set("to", filtros.hasta);
  }
  const res = await apiFetch(`admin/reportes/participacion?${params}`);
  if (res.ok) return { ok: true, report: await res.json() };
  if (res.status === 400) {
    const body = await res.json().catch(() => null);
    return {
      ok: false,
      error: "validation",
      message: firstMessage(body) ?? "Revisa los filtros seleccionados.",
    };
  }
  if (res.status === 403) return { ok: false, error: "forbidden" };
  throw new Error(`GET admin/reportes/participacion respondió ${res.status}`);
}

/** Opción de la lista "Asamblea". */
export type OpcionAsamblea = { id: string; title: string; status: AsambleaStatus };

/** Asambleas por estado que trae la lista (el máximo de GET /admin/asambleas). */
const OPTIONS_PER_STATUS = 50;

/**
 * Asambleas Abiertas y Cerradas para la lista "Asamblea" (H22: GET
 * /admin/asambleas acepta un estado por consulta). Trae las 50 más recientes
 * de cada estado, de la más reciente a la más antigua. Si falla, la lista
 * queda solo con "Todas" y el reporte sigue funcionando.
 */
export async function getOpcionesAsamblea(): Promise<OpcionAsamblea[]> {
  const byStatus = await Promise.all(
    (["ABIERTA", "CERRADA"] as const).map(async (status) => {
      const res = await apiFetch(
        `admin/asambleas?status=${status}&page=1&pageSize=${OPTIONS_PER_STATUS}`,
      );
      if (!res.ok) return [];
      const body = (await res.json()) as { data: AsambleaResumen[] };
      return body.data;
    }),
  );
  return byStatus
    .flat()
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    .map(({ id, title, status }) => ({ id, title, status }));
}
