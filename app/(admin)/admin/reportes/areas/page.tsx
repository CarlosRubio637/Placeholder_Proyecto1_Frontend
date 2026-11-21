import type { Metadata } from "next";
import { requireRole } from "@/lib/api";
import {
  REPORTE_AREAS_PATH,
  formatHoras,
  formatPct,
  getReporteAreas,
  type AreaDestacada,
  type ReporteAreas,
} from "@/lib/reporte-areas";
import { todayIso } from "@/lib/reporte-incidencias";
import { resolvePeriodo, validateRango } from "@/lib/validation/reporte-periodo";
import { FiltrosPeriodo } from "../_components/filtros-periodo";

export const metadata: Metadata = {
  title: "Uso de áreas comunes",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const cardClass =
  "rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950";
const thClass = "px-4 py-3 text-xs font-semibold tracking-wide uppercase";
const tdClass = "px-4 py-3 text-sm";

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

/** Tarjeta "Más usada" / "Menos usada": nombre y ocupación. */
function Destacada({
  titulo,
  area,
  report,
  accent,
}: {
  titulo: string;
  area: AreaDestacada;
  report: ReporteAreas;
  accent: string;
}) {
  const occupancy = report.data.find((row) => row.areaId === area.areaId)?.occupancyPct ?? 0;
  return (
    <div className={`${cardClass} border-l-4 ${accent}`}>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{titulo}</p>
      <p className="mt-1 text-xl font-semibold">{area.name}</p>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
          {formatPct(occupancy)}
        </span>{" "}
        de ocupación
      </p>
    </div>
  );
}

// H33: uso de áreas comunes del administrador. El periodo viaja en la URL:
// ?periodo=mes|3meses|personalizado&desde&hasta. Sin periodo es el mes actual.
// Las fechas solo se leen en Personalizado.
export default async function ReporteAreasPage(props: PageProps<"/admin/reportes/areas">) {
  const user = await requireRole("ADMINISTRADOR");
  if (!user) return null;

  const searchParams = await props.searchParams;
  const { periodo, desde, hasta } = resolvePeriodo(
    {
      periodo: first(searchParams.periodo),
      desde: first(searchParams.desde),
      hasta: first(searchParams.hasta),
    },
    todayIso(),
  );

  // Rango inválido escrito a mano en la URL: no se consulta. El mensaje lo
  // muestra el formulario bajo "Hasta" (recibe las mismas fechas).
  const rangoError = validateRango(desde, hasta);
  const result = rangoError ? null : await getReporteAreas(desde, hasta);

  let report: ReporteAreas | null = null;
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
  }

  // Sin reservas Confirmadas el backend no marca más ni menos usada.
  const vacio = report !== null && report.mostUsed === null;

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Uso de áreas comunes</h1>

      {/* key: al cambiar la URL (atrás, adelante) el formulario toma el periodo nuevo. */}
      <FiltrosPeriodo
        key={`${periodo}|${desde}|${hasta}`}
        path={REPORTE_AREAS_PATH}
        ayuda="por fecha de la reserva"
        periodo={periodo}
        desde={desde}
        hasta={hasta}
      />

      {mensaje}

      {report ? (
        vacio ? (
          <Mensaje>No hay reservas en el periodo seleccionado.</Mensaje>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {report.mostUsed ? (
                <Destacada
                  titulo="Más usada"
                  area={report.mostUsed}
                  report={report}
                  accent="border-l-emerald-600 dark:border-l-emerald-500"
                />
              ) : null}
              {report.leastUsed ? (
                <Destacada
                  titulo="Menos usada"
                  area={report.leastUsed}
                  report={report}
                  accent="border-l-amber-600 dark:border-l-amber-500"
                />
              ) : null}
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              <table className="w-full">
                <caption className="px-4 pt-4 text-left text-sm font-medium">
                  Por área · de mayor a menor ocupación
                </caption>
                <thead className="text-zinc-600 dark:text-zinc-400">
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th scope="col" className={`${thClass} text-left`}>
                      Área
                    </th>
                    <th scope="col" className={`${thClass} text-right`}>
                      Confirmadas
                    </th>
                    <th scope="col" className={`${thClass} text-right`}>
                      Canceladas
                    </th>
                    <th scope="col" className={`${thClass} text-right`}>
                      Horas reservadas
                    </th>
                    <th scope="col" className={`${thClass} text-right`}>
                      Horas habilitadas
                    </th>
                    <th scope="col" className={`${thClass} text-right`}>
                      Ocupación
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {report.data.map((row) => (
                    <tr key={row.areaId}>
                      <th scope="row" className={`${tdClass} text-left font-normal`}>
                        {row.name}
                      </th>
                      <td className={`${tdClass} text-right tabular-nums`}>{row.confirmed}</td>
                      <td className={`${tdClass} text-right tabular-nums text-zinc-500`}>
                        {row.cancelled}
                      </td>
                      <td className={`${tdClass} text-right tabular-nums`}>
                        {formatHoras(row.reservedHours)}
                      </td>
                      <td className={`${tdClass} text-right tabular-nums`}>
                        {formatHoras(row.enabledHours)}
                      </td>
                      <td className={`${tdClass} text-right font-medium tabular-nums`}>
                        {formatPct(row.occupancyPct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                Las canceladas son solo informativas: no suman horas reservadas. Las horas
                habilitadas no cuentan los días con bloqueo.
              </p>
            </div>
          </>
        )
      ) : null}
    </div>
  );
}
