import Link from "next/link";
import {
  FEE_STATUS_LABEL,
  formatDay,
  formatMoney,
  periodLabel,
  STATEMENT_MESSAGES,
  type AccountStatement,
  type FeeStatus,
} from "@/lib/estado-cuenta";
import { FeePayments } from "./fee-payments";
import { RefreshButton } from "./refresh-button";
import { StatementFilters } from "./statement-filters";

const STATUS_STYLE: Record<FeeStatus, string> = {
  PENDIENTE: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  PAGADO: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  MOROSO: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

type Props = {
  statement: AccountStatement;
  /** El Administrador lo ve en solo lectura, sin Pagar. */
  readOnly: boolean;
  filtered: boolean;
  /** Arma el enlace a otra página conservando los filtros. */
  pageHref: (page: number) => string;
};

// H2: resumen, filtros, tabla de cuotas con sus pagos y paginación.
export function StatementView({ statement, readOnly, filtered, pageHref }: Props) {
  const { summary, data, total, page, pageSize } = statement;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const columns = readOnly ? 6 : 7;

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid gap-4 rounded-lg border border-zinc-200 p-4 sm:grid-cols-4 dark:border-zinc-800">
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Unidad</dt>
          <dd className="text-lg font-semibold">{statement.unit.code}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Saldo pendiente</dt>
          <dd className="text-lg font-semibold tabular-nums">{formatMoney(summary.pendingBalance)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Cuotas morosas</dt>
          <dd className="text-lg font-semibold tabular-nums">{summary.overdueCount}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Próximo vencimiento</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {summary.nextDueDate ? formatDay(summary.nextDueDate) : "—"}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <StatementFilters years={statement.years} />
        <RefreshButton />
      </div>

      {data.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          {filtered
            ? STATEMENT_MESSAGES.emptyFilters
            : readOnly
              ? STATEMENT_MESSAGES.emptyAdminUnit
              : STATEMENT_MESSAGES.emptyUnit}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3">Periodo</th>
                  <th className="px-4 py-3">Concepto</th>
                  <th className="px-4 py-3">Monto</th>
                  <th className="px-4 py-3">Vencimiento</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Pagos</th>
                  {readOnly ? null : <th className="px-4 py-3"><span className="sr-only">Pagar</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {data.map((fee) => (
                  <tr key={fee.id} className="align-top">
                    <td className="px-4 py-3 whitespace-nowrap capitalize">{periodLabel(fee.period)}</td>
                    <td className="px-4 py-3">{fee.concept}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{formatMoney(fee.amount)}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{formatDay(fee.dueDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[fee.status]}`}>
                        {FEE_STATUS_LABEL[fee.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <FeePayments feeId={fee.id} colSpan={columns} />
                    </td>
                    {readOnly ? null : (
                      <td className="px-4 py-3">
                        {fee.status !== "PAGADO" ? (
                          <Link
                            href={`/cuotas/${fee.id}/pagar`}
                            className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
                          >
                            Pagar
                          </Link>
                        ) : null}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              {total} {total === 1 ? "cuota" : "cuotas"} · página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <PageLink href={pageHref(page - 1)} disabled={page <= 1}>Anterior</PageLink>
              <PageLink href={pageHref(page + 1)} disabled={page >= totalPages}>Siguiente</PageLink>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  const className = "rounded-md border border-zinc-300 px-3 py-1.5 dark:border-zinc-700";
  if (disabled) {
    return (
      <span aria-disabled className={`${className} cursor-not-allowed opacity-50`}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/** Lee ?anio=&estado=&page= de la URL de las pantallas de estado de cuenta. */
export function readStatementParams(query: Record<string, string | string[] | undefined>) {
  const year = Number(query.anio);
  const status = typeof query.estado === "string" ? query.estado : undefined;
  const page = Number(query.page);
  return {
    year: Number.isInteger(year) && year >= 2020 && year <= 2100 ? year : undefined,
    status: status === "PENDIENTE" || status === "PAGADO" || status === "MOROSO" ? status : undefined,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  } as const;
}

export function statementHref(base: string, filters: { year?: number; status?: string }, page: number) {
  const params = new URLSearchParams();
  if (filters.year) params.set("anio", String(filters.year));
  if (filters.status) params.set("estado", filters.status);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
