import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/api";
import {
  formatRecibido,
  getMisPaquetes,
  MIS_PAQUETES_PAGE_SIZE,
  MIS_PAQUETES_PATH,
  type PackageStatus,
} from "@/lib/paquetes";
import { Actualizar } from "./actualizar";

export const metadata: Metadata = { title: "Mis paquetes" };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined) {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

function parseTab(value: string | undefined): PackageStatus {
  return value === "ENTREGADO" ? "ENTREGADO" : "PENDIENTE_ENTREGA";
}

const thClass = "px-4 py-3 text-left text-sm font-medium";
const tdClass = "px-4 py-3 align-top text-sm";
const linkButtonClass =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700";

// H20: pantalla "Mis paquetes" del rol RESIDENTE. Dos pestañas (Pendientes y
// Entregados), 10 por página, botón Actualizar.
export default async function MisPaquetesPage(
  props: PageProps<"/paquetes">,
) {
  const user = await requireRole("RESIDENTE");
  if (!user) return null;

  const searchParams = await props.searchParams;
  const tab = parseTab(first(searchParams.tab));
  const requestedPage = parsePage(first(searchParams.page));

  const lista = await getMisPaquetes(tab, requestedPage);

  const totalPages = Math.max(1, Math.ceil(lista.total / MIS_PAQUETES_PAGE_SIZE));
  if (requestedPage > totalPages) {
    const next = new URLSearchParams();
    next.set("page", String(totalPages));
    if (tab === "ENTREGADO") next.set("tab", "ENTREGADO");
    redirect(`${MIS_PAQUETES_PATH}?${next.toString()}`);
  }
  const page = requestedPage;

  function tabHref(nextTab: PackageStatus) {
    const next = new URLSearchParams();
    if (nextTab === "ENTREGADO") next.set("tab", "ENTREGADO");
    const qs = next.toString();
    return qs ? `${MIS_PAQUETES_PATH}?${qs}` : MIS_PAQUETES_PATH;
  }

  function pageHref(n: number) {
    const next = new URLSearchParams();
    if (n !== 1) next.set("page", String(n));
    if (tab === "ENTREGADO") next.set("tab", "ENTREGADO");
    const qs = next.toString();
    return qs ? `${MIS_PAQUETES_PATH}?${qs}` : MIS_PAQUETES_PATH;
  }

  const isPending = tab === "PENDIENTE_ENTREGA";
  const isDelivered = tab === "ENTREGADO";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Mis paquetes</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Paquetes de tu unidad: los que están en portería esperando y los que ya recogiste.
          </p>
        </div>
        <Actualizar />
      </div>

      {/* Pestañas */}
      <nav
        aria-label="Estado del paquete"
        className="flex gap-6 border-b border-zinc-200 dark:border-zinc-800"
      >
        <TabLink href={tabHref("PENDIENTE_ENTREGA")} active={isPending}>
          Pendientes{lista.pendingCount > 0 ? ` (${lista.pendingCount})` : ""}
        </TabLink>
        <TabLink href={tabHref("ENTREGADO")} active={isDelivered}>
          Entregados
        </TabLink>
      </nav>

      {lista.data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
          <p className="font-medium">
            {isPending
              ? "No tienes paquetes pendientes."
              : "Todavía no hay paquetes entregados."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <caption className="sr-only">
              {isPending ? "Paquetes pendientes de entrega" : "Paquetes entregados"}, del más reciente al más antiguo
            </caption>
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th scope="col" className={thClass}>Código</th>
                <th scope="col" className={thClass}>Empresa</th>
                <th scope="col" className={thClass}>Guía</th>
                <th scope="col" className={thClass}>Recibido</th>
                {isPending ? (
                  <th scope="col" className={`${thClass} text-right`}>Días en portería</th>
                ) : (
                  <>
                    <th scope="col" className={thClass}>Entregado</th>
                    <th scope="col" className={thClass}>Recogido por</th>
                  </>
                )}
                <th scope="col" className={thClass}>Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {lista.data.map((paquete) => (
                <tr key={paquete.id}>
                  <td className={`${tdClass} whitespace-nowrap font-mono`}>{paquete.code}</td>
                  <td className={tdClass}>{paquete.courier}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{paquete.trackingNumber ?? "—"}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatRecibido(paquete.receivedAt)}</td>
                  {isPending ? (
                    <td className={`${tdClass} text-right tabular-nums`}>{paquete.daysWaiting}</td>
                  ) : (
                    <>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        {paquete.deliveredAt ? formatRecibido(paquete.deliveredAt) : "—"}
                      </td>
                      <td className={tdClass}>
                        {paquete.pickedUpByName ? (
                          <>
                            {paquete.pickedUpByName}
                            {paquete.pickedUpByDocLast4 ? (
                              <span className="text-zinc-500"> (***{paquete.pickedUpByDocLast4})</span>
                            ) : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    </>
                  )}
                  <td className={`${tdClass} max-w-sm break-words`}>{paquete.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {lista.total > 0 ? (
        <nav
          aria-label="Paginación"
          className="flex flex-wrap items-center justify-between gap-3 text-sm"
        >
          <span className="text-zinc-600 dark:text-zinc-400">
            {lista.total} {lista.total === 1 ? "paquete" : "paquetes"} · {MIS_PAQUETES_PAGE_SIZE} por página · página {page} de {totalPages}
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

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  const base = "px-1 pb-3 text-sm font-medium transition-colors";
  const classes = active
    ? `${base} border-b-2 border-foreground text-foreground`
    : `${base} border-b-2 border-transparent text-zinc-500 hover:text-foreground`;
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={classes}>
      {children}
    </Link>
  );
}
