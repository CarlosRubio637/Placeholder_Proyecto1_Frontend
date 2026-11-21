import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/api";
import { formatDate } from "@/lib/areas";
import {
  CANCEL_AVISOS,
  isMyReservationTab,
  MY_RESERVATIONS_MESSAGES,
  MY_RESERVATIONS_PAGE_SIZE,
  STATUS_LABEL,
  type MyReservationTab,
} from "@/lib/reservas";
import { fetchMyReservations } from "@/lib/reservas-api";
import { CancelButton } from "./cancel-button";

export const metadata: Metadata = {
  title: "Mis reservas",
};

const TABS: { value: MyReservationTab; label: string }[] = [
  { value: "proximas", label: "Próximas" },
  { value: "historial", label: "Historial" },
];

const STATUS_STYLE: Record<string, string> = {
  CONFIRMADA: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  CANCELADA: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  CANCELADA_ADMIN: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
};

// H8: reservas de la unidad del residente. Pestaña y página van en la URL
// (?tab=&page=), así Atrás y la recarga las conservan.
export default async function MisReservasPage(props: PageProps<"/reservas/mias">) {
  const user = await requireRole("RESIDENTE");
  if (!user) return null;

  const query = await props.searchParams;
  const tab: MyReservationTab = isMyReservationTab(query.tab) ? query.tab : "proximas";
  const pageParam = Number(query.page);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const { data, total } = await fetchMyReservations({ tab, page });
  const totalPages = Math.max(1, Math.ceil(total / MY_RESERVATIONS_PAGE_SIZE));

  const href = (target: { tab?: MyReservationTab; page?: number }) => {
    const params = new URLSearchParams();
    const nextTab = target.tab ?? tab;
    if (nextTab !== "proximas") params.set("tab", nextTab);
    if (target.page && target.page > 1) params.set("page", String(target.page));
    const qs = params.toString();
    return qs ? `/reservas/mias?${qs}` : "/reservas/mias";
  };

  if (total > 0 && page > totalPages) {
    redirect(href({ page: totalPages }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Mis reservas</h1>
          {user.unit ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Unidad {user.unit.code}</p>
          ) : null}
        </div>
        <Link href="/reservas" className="rounded-md bg-primary hover:bg-primary-hover px-4 py-2 font-medium text-primary-foreground">
          Reservar un área
        </Link>
      </div>

      {query.aviso === "reserva-cancelada" ? (
        <p role="status" className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
          {MY_RESERVATIONS_MESSAGES.cancelled}
        </p>
      ) : typeof query.aviso === "string" && query.aviso in CANCEL_AVISOS ? (
        <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          {CANCEL_AVISOS[query.aviso as keyof typeof CANCEL_AVISOS]}
        </p>
      ) : null}

      <div role="tablist" aria-label="Pestañas de reservas" className="flex gap-2">
        {TABS.map((item) => (
          <Link
            key={item.value}
            role="tab"
            aria-selected={item.value === tab}
            href={href({ tab: item.value })}
            className={`rounded-md border px-4 py-2 text-sm font-medium ${
              item.value === tab
                ? "border-foreground bg-foreground text-background"
                : "border-zinc-300 dark:border-zinc-700"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {data.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          {tab === "proximas" ? MY_RESERVATIONS_MESSAGES.emptyUpcoming : MY_RESERVATIONS_MESSAGES.emptyHistory}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Área</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Franja</th>
                  <th className="px-4 py-3">Personas</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Reservó</th>
                  <th className="px-4 py-3"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {data.map((reservation) => (
                  <tr key={reservation.id}>
                    <td className="px-4 py-3 whitespace-nowrap font-mono">{reservation.code}</td>
                    <td className="px-4 py-3">{reservation.area.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{formatDate(reservation.date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {reservation.startTime} a {reservation.endTime}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{reservation.attendees}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[reservation.status] ?? ""}`}>
                        {STATUS_LABEL[reservation.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">{reservation.reservedBy}</td>
                    <td className="px-4 py-3">
                      {reservation.canCancel ? <CancelButton id={reservation.id} code={reservation.code} tab={tab} /> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              {total} {total === 1 ? "reserva" : "reservas"} · página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <PageLink href={href({ page: page - 1 })} disabled={page <= 1}>Anterior</PageLink>
              <PageLink href={href({ page: page + 1 })} disabled={page >= totalPages}>Siguiente</PageLink>
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
