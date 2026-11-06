import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/api";
import { ASAMBLEAS_PATH, PAGE_SIZE, getAsambleas } from "@/lib/asambleas";
import { formatFecha } from "@/lib/fechas";
import { MESSAGES } from "@/lib/validation/asamblea";
import { EliminarAsamblea } from "./eliminar-asamblea";
import { StatusBadge } from "./status-badge";

export const metadata: Metadata = {
  title: "Asambleas",
};

const AVISOS: Record<string, string> = {
  programada: MESSAGES.saved,
  eliminada: MESSAGES.deleted,
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined) {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

const thClass = "px-4 py-3 text-left text-sm font-medium";
const tdClass = "px-4 py-3 align-top text-sm";
const linkButtonClass =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700";

// H22: lista de asambleas del administrador (más reciente primero, 10 por página).
export default async function AsambleasPage(props: PageProps<"/admin/asambleas">) {
  const user = await requireRole("ADMINISTRADOR");
  if (!user) return null;

  const searchParams = await props.searchParams;
  const requestedPage = parsePage(first(searchParams.page));
  const aviso = AVISOS[first(searchParams.aviso) ?? ""];

  const list = await getAsambleas(requestedPage);
  const totalPages = Math.max(1, Math.ceil(list.total / PAGE_SIZE));
  if (requestedPage > totalPages) {
    redirect(`${ASAMBLEAS_PATH}?page=${totalPages}`);
  }
  const page = requestedPage;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Asambleas</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Convoca asambleas con una agenda de temas para que el condominio vote sin depender
            de la asistencia física.
          </p>
        </div>
        <Link
          href={`${ASAMBLEAS_PATH}/nueva`}
          className="rounded-md bg-foreground px-4 py-2 font-medium text-background"
        >
          Convocar asamblea
        </Link>
      </div>

      {aviso ? (
        <p
          role="status"
          className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
        >
          {aviso}
        </p>
      ) : null}

      {list.data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
          <p className="font-medium">Todavía no hay asambleas.</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Cuando convoques la primera, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <caption className="sr-only">Asambleas, de la más reciente a la más antigua</caption>
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th scope="col" className={thClass}>Título</th>
                <th scope="col" className={thClass}>Inicio</th>
                <th scope="col" className={thClass}>Cierre</th>
                <th scope="col" className={thClass}>Estado</th>
                <th scope="col" className={`${thClass} text-right`}>Temas</th>
                <th scope="col" className={`${thClass} text-right`}>Unidades que votaron</th>
                <th scope="col" className={thClass}>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {list.data.map((asamblea) => (
                <tr key={asamblea.id}>
                  <td className={`${tdClass} max-w-xs font-medium break-words`}>
                    <Link
                      href={`${ASAMBLEAS_PATH}/${asamblea.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {asamblea.title}
                    </Link>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatFecha(asamblea.startsAt)}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatFecha(asamblea.endsAt)}</td>
                  <td className={tdClass}>
                    <StatusBadge status={asamblea.status} />
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>{asamblea.topicCount}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>{asamblea.votedUnits}</td>
                  <td className={tdClass}>
                    <div className="flex items-center justify-end gap-2">
                      {asamblea.status === "PROGRAMADA" ? (
                        <>
                          <Link
                            href={`${ASAMBLEAS_PATH}/${asamblea.id}`}
                            aria-label={`Editar la asamblea ${asamblea.title}`}
                            className={linkButtonClass}
                          >
                            Editar
                          </Link>
                          <EliminarAsamblea id={asamblea.id} title={asamblea.title} />
                        </>
                      ) : (
                        <Link
                          href={`${ASAMBLEAS_PATH}/${asamblea.id}`}
                          aria-label={`Ver la asamblea ${asamblea.title}`}
                          className={linkButtonClass}
                        >
                          Ver
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {list.total > 0 ? (
        <nav
          aria-label="Paginación"
          className="flex flex-wrap items-center justify-between gap-3 text-sm"
        >
          <span className="text-zinc-600 dark:text-zinc-400">
            {list.total} {list.total === 1 ? "asamblea" : "asambleas"} · {PAGE_SIZE} por página ·
            página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={`${ASAMBLEAS_PATH}?page=${page - 1}`} className={linkButtonClass}>
                Anterior
              </Link>
            ) : (
              <span aria-disabled="true" className={`${linkButtonClass} cursor-not-allowed opacity-50`}>
                Anterior
              </span>
            )}
            {page < totalPages ? (
              <Link href={`${ASAMBLEAS_PATH}?page=${page + 1}`} className={linkButtonClass}>
                Siguiente
              </Link>
            ) : (
              <span aria-disabled="true" className={`${linkButtonClass} cursor-not-allowed opacity-50`}>
                Siguiente
              </span>
            )}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
