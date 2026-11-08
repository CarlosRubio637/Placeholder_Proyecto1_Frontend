import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/api";
import {
  PRIORITY_LABELS,
  STATUSES,
  STATUS_LABELS,
  type IncidentPriority,
} from "@/lib/incidencias";
import {
  PAGE_SIZE,
  formatPromedio,
  getReporteIncidencias,
  todayIso,
  type ReporteIncidencias,
} from "@/lib/reporte-incidencias";
import {
  isIsoDate,
  isPeriodo,
  presetRange,
  reporteIncidenciasHref,
  validateRango,
  type Periodo,
} from "@/lib/validation/reporte-incidencias";
import { FiltrosIncidencias } from "./filtros-incidencias";

export const metadata: Metadata = {
  title: "Incidencias abiertas",
};

/** Columnas de la tabla cruzada, de la prioridad más alta a la más baja. */
const PRIORITIES: IncidentPriority[] = ["ALTA", "MEDIA", "BAJA"];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined) {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

const cardClass =
  "rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950";
const thClass = "px-4 py-3 text-xs font-semibold tracking-wide uppercase";
const tdClass = "px-4 py-3 text-sm";
const pageButtonClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-950";
const pageButtonDisabledClass =
  "rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-400 dark:border-zinc-800 dark:text-zinc-600";

function Mensaje({ children, alert = false }: { children: React.ReactNode; alert?: boolean }) {
  return (
    <p
      role={alert ? "alert" : undefined}
      className={`${cardClass} text-sm ${alert ? "text-red-800 dark:text-red-300" : "text-zinc-600 dark:text-zinc-400"}`}
    >
      {children}
    </p>
  );
}

/** Tabla cruzada estado × prioridad con totales por fila y por columna. */
function Matriz({ report }: { report: ReporteIncidencias }) {
  const count = (status: string, priority: string) =>
    report.matrix.find((c) => c.status === status && c.priority === priority)?.count ?? 0;
  const rowTotal = (status: string) =>
    PRIORITIES.reduce((sum, priority) => sum + count(status, priority), 0);
  const colTotal = (priority: string) =>
    STATUSES.reduce((sum, status) => sum + count(status, priority), 0);
  const total = STATUSES.reduce((sum, status) => sum + rowTotal(status), 0);

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <table className="w-full">
        <caption className="px-4 pt-4 text-left text-sm font-medium">
          Por estado y prioridad · creadas en el periodo
        </caption>
        <thead className="text-zinc-600 dark:text-zinc-400">
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th scope="col" className={`${thClass} text-left`}>
              Estado
            </th>
            {PRIORITIES.map((priority) => (
              <th key={priority} scope="col" className={`${thClass} text-right`}>
                {PRIORITY_LABELS[priority]}
              </th>
            ))}
            <th scope="col" className={`${thClass} text-right`}>
              Total
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {STATUSES.map((status) => (
            <tr key={status}>
              <th scope="row" className={`${tdClass} text-left font-normal`}>
                {STATUS_LABELS[status]}
              </th>
              {PRIORITIES.map((priority) => (
                <td key={priority} className={`${tdClass} text-right tabular-nums`}>
                  {count(status, priority)}
                </td>
              ))}
              <td className={`${tdClass} text-right font-medium tabular-nums`}>
                {rowTotal(status)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
          <tr>
            <th scope="row" className={`${tdClass} text-left font-medium`}>
              Total
            </th>
            {PRIORITIES.map((priority) => (
              <td key={priority} className={`${tdClass} text-right font-medium tabular-nums`}>
                {colTotal(priority)}
              </td>
            ))}
            <td className={`${tdClass} text-right font-semibold tabular-nums`}>{total}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// H34: reporte de incidencias abiertas del administrador. El periodo y la
// página viajan en la URL: ?periodo=mes|3meses|personalizado&desde&hasta&page=N.
// Sin periodo es el mes actual. Las fechas solo se leen en Personalizado.
export default async function ReporteIncidenciasPage(
  props: PageProps<"/admin/reportes/incidencias">,
) {
  const user = await requireRole("ADMINISTRADOR");
  if (!user) return null;

  const searchParams = await props.searchParams;
  const today = todayIso();
  const periodoParam = first(searchParams.periodo);
  const periodo: Periodo = isPeriodo(periodoParam) ? periodoParam : "mes";

  let desde: string;
  let hasta: string;
  if (periodo === "personalizado") {
    const fallback = presetRange("mes", today);
    const desdeParam = first(searchParams.desde);
    const hastaParam = first(searchParams.hasta);
    desde = isIsoDate(desdeParam) ? desdeParam : fallback.desde;
    hasta = isIsoDate(hastaParam) ? hastaParam : fallback.hasta;
  } else {
    ({ desde, hasta } = presetRange(periodo, today));
  }
  const page = parsePage(first(searchParams.page));

  // Rango inválido escrito a mano en la URL: no se consulta. El mensaje lo
  // muestra el formulario bajo "Hasta" (recibe las mismas fechas).
  const rangoError = validateRango(desde, hasta);
  const result = rangoError ? null : await getReporteIncidencias(desde, hasta, page);

  let report: ReporteIncidencias | null = null;
  let mensaje: React.ReactNode = null;
  if (result && !result.ok) {
    mensaje =
      result.error === "forbidden" ? (
        <Mensaje alert>No tienes permiso para ver esta página.</Mensaje>
      ) : (
        <Mensaje alert>{result.message}</Mensaje>
      );
  } else if (result?.ok) {
    report = result.report;
    const totalPages = Math.max(1, Math.ceil(report.stale.total / PAGE_SIZE));
    if (page > totalPages) {
      redirect(reporteIncidenciasHref(periodo, desde, hasta, totalPages));
    }
  }

  const totalPages = report ? Math.max(1, Math.ceil(report.stale.total / PAGE_SIZE)) : 1;
  const href = (n: number) => reporteIncidenciasHref(periodo, desde, hasta, n);

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Incidencias abiertas</h1>

      {/* key: al cambiar la URL (atrás, adelante) el formulario toma el periodo nuevo. */}
      <FiltrosIncidencias
        key={`${periodo}|${desde}|${hasta}`}
        periodo={periodo}
        desde={desde}
        hasta={hasta}
      />

      {mensaje}

      {report ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className={`${cardClass} border-l-4 border-l-amber-600 dark:border-l-amber-500`}>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Abiertas</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{report.openTotal}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Pendiente + En proceso · creadas en el periodo
              </p>
            </div>
            <div className={cardClass}>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Tiempo promedio de resolución
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {formatPromedio(report.avgResolutionDays)}
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Resueltas en el periodo
              </p>
            </div>
          </div>

          <Matriz report={report} />

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Abiertas con más de 7 días</h2>
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              {report.stale.data.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
                  No hay incidencias abiertas con más de 7 días.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                      <tr>
                        <th scope="col" className={`${thClass} text-left`}>
                          Número
                        </th>
                        <th scope="col" className={`${thClass} text-left`}>
                          Título
                        </th>
                        <th scope="col" className={`${thClass} text-left`}>
                          Unidad
                        </th>
                        <th scope="col" className={`${thClass} text-left`}>
                          Estado
                        </th>
                        <th scope="col" className={`${thClass} text-left`}>
                          Prioridad
                        </th>
                        <th scope="col" className={`${thClass} text-left`}>
                          Responsable
                        </th>
                        <th scope="col" className={`${thClass} text-right`}>
                          Días abierta
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {report.stale.data.map((row) => (
                        <tr key={row.number}>
                          <td className={`${tdClass} whitespace-nowrap tracking-wide`}>
                            {row.number}
                          </td>
                          <td className={tdClass}>{row.title}</td>
                          <td className={`${tdClass} whitespace-nowrap`}>{row.unitCode}</td>
                          <td className={`${tdClass} whitespace-nowrap`}>
                            {STATUS_LABELS[row.status]}
                          </td>
                          <td className={tdClass}>{PRIORITY_LABELS[row.priority]}</td>
                          <td className={tdClass}>
                            {row.assignee ?? (
                              <span className="text-zinc-500">Sin asignar</span>
                            )}
                          </td>
                          <td className={`${tdClass} text-right tabular-nums`}>{row.daysOpen}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <nav
                aria-label="Paginación"
                className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
              >
                <span className="text-zinc-600 dark:text-zinc-400">
                  {PAGE_SIZE} por página · más antigua primero · no depende del periodo
                  {report.stale.total > 0 ? ` · página ${page} de ${totalPages}` : null}
                </span>
                <div className="flex gap-2">
                  {page > 1 ? (
                    <Link href={href(page - 1)} className={pageButtonClass}>
                      Anterior
                    </Link>
                  ) : (
                    <span aria-disabled="true" className={pageButtonDisabledClass}>
                      Anterior
                    </span>
                  )}
                  {page < totalPages ? (
                    <Link href={href(page + 1)} className={pageButtonClass}>
                      Siguiente
                    </Link>
                  ) : (
                    <span aria-disabled="true" className={pageButtonDisabledClass}>
                      Siguiente
                    </span>
                  )}
                </div>
              </nav>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
