import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/api";
import { CERRADAS_PAGE_SIZE, formatFechaHora, getCerradas } from "@/lib/resultados";

export const metadata: Metadata = { title: "Asambleas cerradas" };

const CERRADAS_PATH = "/asambleas/cerradas";
const thClass = "px-4 py-3 text-left text-sm font-medium";
const tdClass = "px-4 py-3 align-top text-sm";
const linkButtonClass =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined) {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

// H24: historial de asambleas cerradas del residente (la más reciente primero, 10 por página).
export default async function AsambleasCerradasPage(props: PageProps<"/asambleas/cerradas">) {
  const user = await requireRole("RESIDENTE");
  if (!user) return null;

  const searchParams = await props.searchParams;
  const requestedPage = parsePage(first(searchParams.page));
  const list = await getCerradas(requestedPage);
  const totalPages = Math.max(1, Math.ceil(list.total / CERRADAS_PAGE_SIZE));
  if (requestedPage > totalPages) {
    redirect(`${CERRADAS_PATH}?page=${totalPages}`);
  }
  const page = requestedPage;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/asambleas" className="text-sm underline underline-offset-4">
          Volver a asambleas activas
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Asambleas cerradas</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Consulta el resultado de cada asamblea y qué unidades participaron. El voto de cada unidad es secreto.
        </p>
      </div>

      {list.data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
          <p className="font-medium">Todavía no hay asambleas cerradas.</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Cuando cierre la primera, su resultado aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <caption className="sr-only">Asambleas cerradas, de la más reciente a la más antigua</caption>
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th scope="col" className={thClass}>Título</th>
                <th scope="col" className={thClass}>Cerrada</th>
                <th scope="col" className={`${thClass} text-right`}>Temas</th>
                <th scope="col" className={thClass}>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {list.data.map((asamblea) => (
                <tr key={asamblea.id}>
                  <td className={`${tdClass} max-w-xs font-medium break-words`}>{asamblea.title}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatFechaHora(asamblea.closedAt)}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>{asamblea.topicCount}</td>
                  <td className={`${tdClass} text-right`}>
                    <Link
                      href={`/asambleas/${asamblea.id}/resultado`}
                      aria-label={`Ver el resultado de la asamblea ${asamblea.title}`}
                      className={linkButtonClass}
                    >
                      Ver resultado
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {list.total > 0 ? (
        <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">
            {list.total} {list.total === 1 ? "asamblea" : "asambleas"} · {CERRADAS_PAGE_SIZE} por página ·
            página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={`${CERRADAS_PATH}?page=${page - 1}`} className={linkButtonClass}>Anterior</Link>
            ) : (
              <span aria-disabled="true" className={`${linkButtonClass} cursor-not-allowed opacity-50`}>Anterior</span>
            )}
            {page < totalPages ? (
              <Link href={`${CERRADAS_PATH}?page=${page + 1}`} className={linkButtonClass}>Siguiente</Link>
            ) : (
              <span aria-disabled="true" className={`${linkButtonClass} cursor-not-allowed opacity-50`}>Siguiente</span>
            )}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
