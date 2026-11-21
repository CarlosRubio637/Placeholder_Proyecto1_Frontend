import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/api";
import { STATUS_LABELS } from "@/lib/asambleas";
import { formatFecha } from "@/lib/fechas";
import {
  PAGE_SIZE,
  getOpcionesAsamblea,
  getReporteParticipacion,
  type ParticipacionAsamblea,
  type ReporteParticipacion,
} from "@/lib/reporte-participacion";
// El mismo formato que el resultado de la asamblea (H24): "80.0 %".
import { formatPct } from "@/lib/resultados";
import { todayIso } from "@/lib/reporte-incidencias";
import {
  reporteParticipacionHref,
  resolveFiltros,
} from "@/lib/validation/reporte-participacion";
import { validateRango } from "@/lib/validation/reporte-periodo";
import { FiltrosParticipacion } from "./filtros-participacion";

export const metadata: Metadata = {
  title: "Participación en votaciones",
};

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

/** Una asamblea: encabezado con su promedio y la tabla de sus temas. */
function Asamblea({ asamblea }: { asamblea: ParticipacionAsamblea }) {
  const abierta = asamblea.status === "ABIERTA";
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold">{asamblea.title}</h2>
          <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                abierta
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {STATUS_LABELS[asamblea.status]}
            </span>
            Abierta el {formatFecha(asamblea.openedAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Promedio de participación</p>
          <p className="text-2xl font-semibold tabular-nums">
            {formatPct(asamblea.avgParticipationPct)}
          </p>
        </div>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th scope="col" className={`${thClass} text-left`}>
                Tema
              </th>
              <th scope="col" className={`${thClass} text-right`}>
                Votaron
              </th>
              <th scope="col" className={`${thClass} text-right`}>
                Habilitadas
              </th>
              <th scope="col" className={`${thClass} text-right`}>
                Participación
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {asamblea.topics.map((topic, index) => (
              <tr key={index}>
                <th scope="row" className={`${tdClass} text-left font-normal`}>
                  {topic.question}
                </th>
                <td className={`${tdClass} text-right tabular-nums`}>{topic.votedUnits}</td>
                <td className={`${tdClass} text-right tabular-nums`}>{topic.eligibleUnits}</td>
                <td className={`${tdClass} text-right font-medium tabular-nums`}>
                  {formatPct(topic.participationPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {abierta ? (
        <p className="border-t border-zinc-200 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800">
          La votación sigue abierta: las cifras pueden cambiar hasta el cierre.
        </p>
      ) : null}
    </section>
  );
}

// H35: participación en votaciones del administrador. Los filtros viajan en
// la URL: ?asamblea=<id> o ?desde&hasta, y &page=N. Sin filtros, las
// asambleas abiertas en los últimos 12 meses.
export default async function ReporteParticipacionPage(
  props: PageProps<"/admin/reportes/participacion">,
) {
  const user = await requireRole("ADMINISTRADOR");
  if (!user) return null;

  const searchParams = await props.searchParams;
  const filtros = resolveFiltros(
    {
      asamblea: first(searchParams.asamblea),
      desde: first(searchParams.desde),
      hasta: first(searchParams.hasta),
    },
    todayIso(),
  );
  const page = parsePage(first(searchParams.page));

  // Rango inválido escrito a mano en la URL: no se consulta. El mensaje lo
  // muestra el formulario bajo "Hasta" (recibe las mismas fechas).
  const rangoError = filtros.asamblea ? null : validateRango(filtros.desde, filtros.hasta);
  const [result, opciones] = await Promise.all([
    rangoError ? null : getReporteParticipacion(filtros, page),
    getOpcionesAsamblea(),
  ]);

  let report: ReporteParticipacion | null = null;
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
    const totalPages = Math.max(1, Math.ceil(report.total / PAGE_SIZE));
    if (page > totalPages) redirect(reporteParticipacionHref(filtros, totalPages));
  }

  const totalPages = report ? Math.max(1, Math.ceil(report.total / PAGE_SIZE)) : 1;
  const href = (n: number) => reporteParticipacionHref(filtros, n);

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Participación en votaciones</h1>

      {/* key: al cambiar la URL (atrás, adelante) el formulario toma los filtros nuevos. */}
      <FiltrosParticipacion
        key={`${filtros.asamblea}|${filtros.desde}|${filtros.hasta}`}
        {...filtros}
        opciones={opciones.map((option) => ({
          id: option.id,
          label: `${option.title} · ${STATUS_LABELS[option.status]}`,
        }))}
      />

      {mensaje}

      {report ? (
        report.total === 0 ? (
          <Mensaje>No hay asambleas en el periodo seleccionado.</Mensaje>
        ) : (
          <>
            {report.data.map((asamblea) => (
              <Asamblea key={asamblea.assemblyId} asamblea={asamblea} />
            ))}

            <nav
              aria-label="Paginación"
              className="flex flex-wrap items-center justify-between gap-3 text-sm"
            >
              <span className="text-zinc-600 dark:text-zinc-400">
                {PAGE_SIZE} asambleas por página · la apertura más reciente primero · página{" "}
                {page} de {totalPages}
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
          </>
        )
      ) : null}
    </div>
  );
}
