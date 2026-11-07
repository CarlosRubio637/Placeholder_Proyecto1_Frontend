import Link from "next/link";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  periodLabel,
  type FeeGenerationsPage,
} from "@/lib/cuotas";

const PAGE_PATH = "/admin/cuotas/generar";

export function HistorialGeneraciones({ history }: { history: FeeGenerationsPage }) {
  const totalPages = Math.max(1, Math.ceil(history.total / history.pageSize));

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Historial de generaciones</h2>

      {history.total === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">Todavía no se han generado cuotas.</p>
      ) : history.data.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">
          Esta página no tiene generaciones.{" "}
          <Link href={PAGE_PATH} className="underline underline-offset-4">
            Ir a la primera página
          </Link>
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3">Periodo</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3">Vencimiento</th>
                  <th className="px-4 py-3 text-right">Cuotas creadas</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Autor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {history.data.map((generation) => (
                  <tr key={generation.id}>
                    <td className="px-4 py-3 font-medium">{periodLabel(generation.period)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(generation.amount)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatDate(generation.dueDate)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{generation.createdCount}</td>
                    <td className="px-4 py-3 tabular-nums">{formatDateTime(generation.createdAt)}</td>
                    <td className="px-4 py-3">{generation.createdBy.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav
            aria-label="Páginas del historial"
            className="flex items-center justify-between gap-4 text-sm"
          >
            <span className="text-zinc-600 dark:text-zinc-400">
              Página {history.page} de {totalPages}
            </span>
            <div className="flex gap-4">
              <PageLink page={history.page - 1} enabled={history.page > 1} label="Anterior" />
              <PageLink
                page={history.page + 1}
                enabled={history.page < totalPages}
                label="Siguiente"
              />
            </div>
          </nav>
        </>
      )}
    </section>
  );
}

function PageLink({ page, enabled, label }: { page: number; enabled: boolean; label: string }) {
  if (!enabled) {
    return <span className="text-zinc-400 dark:text-zinc-600">{label}</span>;
  }
  return (
    <Link href={`${PAGE_PATH}?page=${page}`} className="underline underline-offset-4">
      {label}
    </Link>
  );
}
