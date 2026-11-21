import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AutoRefresh } from "@/app/_components/incidencias/auto-refresh";
import { PriorityBadge, StatusBadge } from "@/app/_components/incidencias/badges";
import { RefreshButton } from "@/app/_components/incidencias/refresh-button";
import { requireRole } from "@/lib/api";
import {
  ADMIN_SEARCH_MAX,
  daysLabel,
  isLocation,
  isPriority,
  isStatus,
  locationLabel,
  type AdminFilters,
} from "@/lib/incidencias";
import { ADMIN_PAGE_SIZE, fetchAdminIncidents, fetchStaff } from "@/lib/incidencias-api";
import { FiltrosIncidencias } from "./filtros";

export const metadata: Metadata = { title: "Incidencias (administración)" };

const ADMIN_PATH = "/admin/incidencias";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REFRESH_MS = 60_000;

const thClass = "px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500";
const tdClass = "px-4 py-3 align-top text-sm";
const linkButtonClass = "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// H12: bandeja del Administrador. Por defecto ordena por prioridad (Alta a
// Baja) y la más antigua primero; filtros y página van en la URL.
export default async function IncidenciasAdminPage(props: PageProps<"/admin/incidencias">) {
  const user = await requireRole("ADMINISTRADOR");
  if (!user) return null;

  const params = await props.searchParams;
  const status = first(params.status);
  const priority = first(params.priority);
  const location = first(params.location);
  const assignee = first(params.assignee);
  const search = first(params.search)?.trim().slice(0, ADMIN_SEARCH_MAX);
  // Lo que no es válido se ignora, como si no viniera.
  const filters: AdminFilters = {
    status: isStatus(status) ? status : undefined,
    priority: isPriority(priority) ? priority : undefined,
    location: isLocation(location) ? location : undefined,
    assignee: assignee === "none" || (assignee && UUID_REGEX.test(assignee)) ? assignee : undefined,
    search: search || undefined,
  };
  const pageParam = Number(first(params.page));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const [list, staff] = await Promise.all([fetchAdminIncidents(filters, page), fetchStaff()]);
  const totalPages = Math.max(1, Math.ceil(list.total / ADMIN_PAGE_SIZE));

  const pageHref = (target: number) => {
    const query = new URLSearchParams();
    if (filters.status) query.set("status", filters.status);
    if (filters.priority) query.set("priority", filters.priority);
    if (filters.location) query.set("location", filters.location);
    if (filters.assignee) query.set("assignee", filters.assignee);
    if (filters.search) query.set("search", filters.search);
    if (target > 1) query.set("page", String(target));
    const qs = query.toString();
    return qs ? `${ADMIN_PATH}?${qs}` : ADMIN_PATH;
  };

  // Página fuera de rango (por ejemplo, después de filtrar): a la última.
  if (list.total > 0 && page > totalPages) redirect(pageHref(totalPages));

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh ms={REFRESH_MS} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Incidencias</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Prioriza las incidencias y asigna un responsable de mantenimiento. Se actualiza cada minuto.
          </p>
        </div>
        <RefreshButton />
      </div>

      <FiltrosIncidencias key={JSON.stringify(filters)} filters={filters} staff={staff} />

      {list.data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
          <p className="font-medium">No hay incidencias que coincidan con los filtros.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <caption className="sr-only">Incidencias por prioridad y antigüedad</caption>
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th scope="col" className={thClass}>Número</th>
                <th scope="col" className={thClass}>Título</th>
                <th scope="col" className={thClass}>Unidad</th>
                <th scope="col" className={thClass}>Ubicación</th>
                <th scope="col" className={thClass}>Estado</th>
                <th scope="col" className={thClass}>Prioridad</th>
                <th scope="col" className={thClass}>Responsable</th>
                <th scope="col" className={thClass}>Antigüedad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {list.data.map((item) => (
                <tr key={item.id}>
                  <td className={`${tdClass} whitespace-nowrap tabular-nums`}>
                    <Link href={`/incidencias/${item.id}`} className="underline underline-offset-4">
                      {item.number}
                    </Link>
                  </td>
                  <td className={`${tdClass} max-w-xs break-words`}>{item.title}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{item.unitCode}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{locationLabel(item.location)}</td>
                  <td className={tdClass}><StatusBadge status={item.status} /></td>
                  <td className={tdClass}><PriorityBadge priority={item.priority} /></td>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    {item.assignee ? item.assignee.name : <span className="text-zinc-500">Sin asignar</span>}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap tabular-nums`}>{daysLabel(item.daysOpen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {list.total > 0 ? (
        <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">
            {list.total} {list.total === 1 ? "incidencia" : "incidencias"} · página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className={linkButtonClass}>Anterior</Link>
            ) : (
              <span aria-disabled="true" className={`${linkButtonClass} cursor-not-allowed opacity-50`}>Anterior</span>
            )}
            {page < totalPages ? (
              <Link href={pageHref(page + 1)} className={linkButtonClass}>Siguiente</Link>
            ) : (
              <span aria-disabled="true" className={`${linkButtonClass} cursor-not-allowed opacity-50`}>Siguiente</span>
            )}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
