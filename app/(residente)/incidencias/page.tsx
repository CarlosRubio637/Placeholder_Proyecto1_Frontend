import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/api";
import { fetchMyIncidents, PAGE_SIZE } from "@/lib/incidencias-api";
import { formatDate, isStatus, locationLabel } from "@/lib/incidencias";
import { PriorityBadge, StatusBadge } from "./_components/badges";
import { RefreshButton } from "./_components/refresh-button";
import { StatusFilter } from "./_components/status-filter";

export const metadata: Metadata = {
  title: "Mis incidencias",
};

// H11: incidencias de la unidad del residente. El filtro y la página van en
// la URL (?status=&page=), así Actualizar y el botón Atrás los conservan.
export default async function MisIncidenciasPage(props: PageProps<"/incidencias">) {
  const user = await requireRole("RESIDENTE");
  if (!user) return null;

  const searchParams = await props.searchParams;
  const status = isStatus(searchParams.status) ? searchParams.status : undefined;
  const pageParam = Number(searchParams.page);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const { data, total } = await fetchMyIncidents({ status, page });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (target: number) => {
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    if (target > 1) query.set("page", String(target));
    const qs = query.toString();
    return qs ? `/incidencias?${qs}` : "/incidencias";
  };

  // Página fuera de rango (por ejemplo, un enlace viejo): a la última que existe.
  if (total > 0 && page > totalPages) {
    redirect(pageHref(totalPages));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Mis incidencias</h1>
          {user.unit ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Unidad {user.unit.code}</p>
          ) : null}
        </div>
        <Link
          href="/incidencias/nueva"
          className="rounded-md bg-foreground px-4 py-2 font-medium text-background"
        >
          Reportar incidencia
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <StatusFilter value={status} />
        <RefreshButton />
      </div>

      {data.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          {status ? "No hay incidencias con ese estado." : "Tu unidad no ha reportado incidencias."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Ubicación</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Prioridad</th>
                  <th className="px-4 py-3">Creada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {data.map((incident) => (
                  <tr key={incident.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      <Link
                        href={`/incidencias/${incident.id}`}
                        className="font-medium underline underline-offset-4"
                      >
                        {incident.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{incident.title}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {locationLabel(incident.location)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={incident.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={incident.priority} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {formatDate(incident.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav
            aria-label="Paginación"
            className="flex flex-wrap items-center justify-between gap-3 text-sm"
          >
            <span className="text-zinc-600 dark:text-zinc-400">
              {total} {total === 1 ? "incidencia" : "incidencias"} · página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <PageLink href={pageHref(page - 1)} disabled={page <= 1}>
                Anterior
              </PageLink>
              <PageLink href={pageHref(page + 1)} disabled={page >= totalPages}>
                Siguiente
              </PageLink>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
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
