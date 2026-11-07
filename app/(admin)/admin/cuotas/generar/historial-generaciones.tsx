import Link from "next/link";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  periodLabel,
  type FeeGenerationsPage,
} from "@/lib/cuotas";

const PAGE_PATH = "/admin/cuotas/generar";

const pageButtonClass = "rounded-md border px-3 py-1.5 font-medium";

export function HistorialGeneraciones({ history }: { history: FeeGenerationsPage }) {
  const totalPages = Math.max(1, Math.ceil(history.total / history.pageSize));

  return (
    <section
      aria-labelledby="historial-generaciones"
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800"
    >
      <h2 id="historial-generaciones" className="text-lg font-semibold">
        Historial de generaciones
      </h2>

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
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
                <tr>
                  <th className="whitespace-nowrap px-3 py-3">Periodo</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right">Monto</th>
                  <th className="whitespace-nowrap px-3 py-3">Vence</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right">Creadas</th>
                  <th className="whitespace-nowrap px-3 py-3">Fecha</th>
                  <th className="whitespace-nowrap px-3 py-3">Autor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {history.data.map((generation) => (
                  <tr key={generation.id}>
                    <td className="whitespace-nowrap px-3 py-3 font-medium">
                      {periodLabel(generation.period)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                      {formatMoney(generation.amount)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                      {formatDate(generation.dueDate)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{generation.createdCount}</td>
                    <td className="min-w-28 px-3 py-3 tabular-nums">
                      {formatDateTime(generation.createdAt)}
                    </td>
                    <td className="px-3 py-3 break-words">{generation.createdBy.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav
            aria-label="Páginas del historial"
            className="flex items-center justify-between gap-4 border-t border-zinc-200 px-3 py-3 text-sm dark:border-zinc-800"
          >
            <span className="text-zinc-600 dark:text-zinc-400">
              Página {history.page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <PageLink page={history.page - 1} enabled={history.page > 1} label="Anterior" />
              <PageLink
                page={history.page + 1}
                enabled={history.page < totalPages}
                label="Siguiente"
              />
            </div>
          </nav>
        </div>
      )}
    </section>
  );
}

function PageLink({ page, enabled, label }: { page: number; enabled: boolean; label: string }) {
  if (!enabled) {
    return (
      <span
        aria-disabled="true"
        className={`${pageButtonClass} border-zinc-200 text-zinc-400 dark:border-zinc-800 dark:text-zinc-600`}
      >
        {label}
      </span>
    );
  }
  return (
    <Link
      href={`${PAGE_PATH}?page=${page}`}
      className={`${pageButtonClass} border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900`}
    >
      {label}
    </Link>
  );
}
