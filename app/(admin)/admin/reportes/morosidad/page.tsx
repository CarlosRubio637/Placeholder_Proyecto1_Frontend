import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/api";
import {
  PAGE_SIZE,
  defaultRange,
  formatMonto,
  formatPorcentaje,
  getMorosidad,
  morosidadHref,
  todayIso,
  type MorosidadReporte,
} from "@/lib/morosidad";
import { isIsoDate, validateRango } from "@/lib/validation/morosidad";
import { FiltrosMorosidad } from "./filtros-morosidad";

export const metadata: Metadata = {
  title: "Reporte de morosidad",
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

// H32: panel de morosidad del administrador. El rango (por fecha de
// vencimiento) y la página viajan en la URL: ?desde=AAAA-MM-DD&hasta=AAAA-MM-DD&page=N.
export default async function MorosidadPage(props: PageProps<"/admin/reportes/morosidad">) {
  const user = await requireRole("ADMINISTRADOR");
  if (!user) return null;

  const searchParams = await props.searchParams;
  const defaults = defaultRange(todayIso());
  const desdeParam = first(searchParams.desde);
  const hastaParam = first(searchParams.hasta);
  const desde = isIsoDate(desdeParam) ? desdeParam : defaults.desde;
  const hasta = isIsoDate(hastaParam) ? hastaParam : defaults.hasta;
  const page = parsePage(first(searchParams.page));

  // Rango inválido escrito a mano en la URL: se avisa sin consultar.
  const rangoError = validateRango(desde, hasta);
  const result = rangoError ? null : await getMorosidad(desde, hasta, page);

  let report: MorosidadReporte | null = null;
  let mensaje: React.ReactNode = null;
  if (rangoError) {
    mensaje = <Mensaje alert>{rangoError.message}</Mensaje>;
  } else if (result && !result.ok) {
    mensaje =
      result.error === "forbidden" ? (
        <Mensaje alert>No tienes permiso para ver esta página.</Mensaje>
      ) : (
        <Mensaje alert>{result.message}</Mensaje>
      );
  } else if (result?.ok) {
    report = result.report;
    const totalPages = Math.max(1, Math.ceil(report.total / PAGE_SIZE));
    if (page > totalPages) {
      redirect(morosidadHref(desde, hasta, totalPages));
    }
  }

  const totalPages = report ? Math.max(1, Math.ceil(report.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Reporte de morosidad</h1>

      {/* key: al cambiar la URL (Actualizar, atrás) el formulario toma el rango nuevo. */}
      <FiltrosMorosidad key={`${desde}|${hasta}`} desde={desde} hasta={hasta} />

      {mensaje}

      {report ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className={`${cardClass} border-l-4 border-l-red-700 dark:border-l-red-500`}>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Monto adeudado</p>
              <p className="mt-1 text-3xl font-semibold">
                {formatMonto(report.summary.owedAmount)}
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Pendiente + Moroso</p>
            </div>
            <div className={cardClass}>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Unidades morosas</p>
              <p className="mt-1 text-3xl font-semibold">{report.summary.overdueUnits}</p>
            </div>
            <div className={cardClass}>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Porcentaje</p>
              <p className="mt-1 text-3xl font-semibold">
                {formatPorcentaje(report.summary.overduePct)}
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {report.summary.overdueActiveUnits} de {report.summary.activeUnits}{" "}
                {report.summary.activeUnits === 1 ? "unidad activa" : "unidades activas"}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            {report.data.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
                No hay unidades morosas en el rango seleccionado.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                    <tr>
                      <th scope="col" className={`${thClass} text-left`}>
                        Unidad
                      </th>
                      <th scope="col" className={`${thClass} text-right`}>
                        Monto adeudado
                      </th>
                      <th scope="col" className={`${thClass} text-right`}>
                        Días de antigüedad
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {report.data.map((row) => (
                      <tr key={row.unitCode}>
                        <td className="px-4 py-3 text-sm tracking-wide">{row.unitCode}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums">
                          {formatMonto(row.owedAmount)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums">
                          {row.ageDays}
                        </td>
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
                {PAGE_SIZE} por página · mayor antigüedad primero
                {report.total > 0 ? ` · página ${page} de ${totalPages}` : null}
              </span>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link href={morosidadHref(desde, hasta, page - 1)} className={pageButtonClass}>
                    Anterior
                  </Link>
                ) : (
                  <span aria-disabled="true" className={pageButtonDisabledClass}>
                    Anterior
                  </span>
                )}
                {page < totalPages ? (
                  <Link href={morosidadHref(desde, hasta, page + 1)} className={pageButtonClass}>
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
        </>
      ) : null}
    </div>
  );
}
