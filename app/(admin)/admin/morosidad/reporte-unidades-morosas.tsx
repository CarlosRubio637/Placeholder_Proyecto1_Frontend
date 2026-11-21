"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UNIDADES_MOROSAS_PAGE_SIZE,
  estadoDeCuentaHref,
  formatDia,
  formatMonto,
  formatPorcentaje,
  lastPageOf,
  unidadesMorosasHref,
  type FiltrosMorosas,
  type UnidadesMorosasReporte,
} from "@/lib/unidades-morosas";

const cardClass =
  "rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950";
const thClass = "px-4 py-3 text-xs font-semibold tracking-wide uppercase";
const tdClass = "px-4 py-3 text-sm";
const pageButtonClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-950";
const pageButtonDisabledClass =
  "rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-400 dark:border-zinc-800 dark:text-zinc-600";

export function ReporteUnidadesMorosas({
  reporte,
  filtros,
  page,
}: {
  reporte: UnidadesMorosasReporte;
  filtros: FiltrosMorosas;
  page: number;
}) {
  const router = useRouter();
  const { summary } = reporte;
  const totalPages = lastPageOf(reporte.total);

  return (
    <>
      <section aria-label="Resumen" className="grid gap-4 md:grid-cols-3">
        <div className={`${cardClass} border-l-4 border-l-red-700 dark:border-l-red-500`}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Unidades morosas</p>
          <p className="mt-1 text-3xl font-semibold">{summary.overdueUnits}</p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Monto moroso</p>
          <p className="mt-1 text-3xl font-semibold">{formatMonto(summary.overdueAmount)}</p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Porcentaje</p>
          <p className="mt-1 text-3xl font-semibold">{formatPorcentaje(summary.overduePercent)}</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {summary.overdueActiveUnits} de {summary.activeUnits}{" "}
            {summary.activeUnits === 1 ? "unidad activa" : "unidades activas"}
          </p>
        </div>
      </section>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {reporte.data.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
            No hay unidades morosas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th scope="col" className={`${thClass} text-left`}>Unidad</th>
                  <th scope="col" className={`${thClass} text-left`}>Residentes</th>
                  <th scope="col" className={`${thClass} text-right`}>Cuotas morosas</th>
                  <th scope="col" className={`${thClass} text-right`}>Monto moroso</th>
                  <th scope="col" className={`${thClass} text-left`}>Moroso desde</th>
                  <th scope="col" className={`${thClass} text-right`}>Días en mora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {reporte.data.map((unidad) => (
                  <tr
                    key={unidad.unitId}
                    onClick={() => router.push(estadoDeCuentaHref(unidad.unitId))}
                    className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <td className={tdClass}>
                      <Link
                        href={estadoDeCuentaHref(unidad.unitId)}
                        onClick={(event) => event.stopPropagation()}
                        className="font-medium tracking-wide underline-offset-2 hover:underline"
                      >
                        {unidad.unitCode}
                      </Link>
                      <span className="block text-xs text-zinc-500">{unidad.towerName}</span>
                    </td>
                    <td className={`${tdClass} wrap-anywhere`}>
                      {unidad.residents.length > 0 ? (
                        unidad.residents.join(", ")
                      ) : (
                        <span className="text-zinc-500">Sin residentes activos</span>
                      )}
                    </td>
                    <td className={`${tdClass} text-right tabular-nums`}>{unidad.overdueFees}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>
                      {formatMonto(unidad.overdueAmount)}
                    </td>
                    <td className={`${tdClass} tabular-nums`}>{formatDia(unidad.overdueSince)}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{unidad.daysOverdue}</td>
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
            {UNIDADES_MOROSAS_PAGE_SIZE} por página · más antiguas primero
            {reporte.total > 0 ? ` · página ${page} de ${totalPages}` : null}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={unidadesMorosasHref(filtros, page - 1)} className={pageButtonClass}>
                Anterior
              </Link>
            ) : (
              <span aria-disabled="true" className={pageButtonDisabledClass}>
                Anterior
              </span>
            )}
            {page < totalPages ? (
              <Link href={unidadesMorosasHref(filtros, page + 1)} className={pageButtonClass}>
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
  );
}
