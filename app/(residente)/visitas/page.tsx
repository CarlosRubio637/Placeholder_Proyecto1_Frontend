import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActualizarButton } from "./actualizar-button";
import { requireRole } from "@/lib/api";
import { MESSAGES, MIS_VISITAS_PATH, PAGE_SIZE, TABS, isTab, type Tab } from "@/lib/mis-visitas";
import { fetchMisVisitas } from "@/lib/mis-visitas-api";
import { VisitasTabla } from "./visitas-tabla";

export const metadata: Metadata = { title: "Mis visitas" };

const linkButtonClass = "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// H15: visitas de la unidad en dos pestañas. La pestaña y la página van en la
// URL (?tab=&page=); la notificación de una solicitud (H16) abre Activas.
export default async function MisVisitasPage(props: PageProps<"/visitas">) {
  const user = await requireRole("RESIDENTE");
  if (!user) return null;

  const params = await props.searchParams;
  const tabParam = first(params.tab);
  const tab: Tab = isTab(tabParam) ? tabParam : "activas";
  const pageParam = Number(first(params.page));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const lista = await fetchMisVisitas(tab, page);
  const totalPages = Math.max(1, Math.ceil(lista.total / PAGE_SIZE));
  const href = (nextTab: Tab, nextPage = 1) => {
    const query = new URLSearchParams();
    if (nextTab !== "activas") query.set("tab", nextTab);
    if (nextPage > 1) query.set("page", String(nextPage));
    const qs = query.toString();
    return qs ? `${MIS_VISITAS_PATH}?${qs}` : MIS_VISITAS_PATH;
  };
  if (lista.total > 0 && page > totalPages) redirect(href(tab, totalPages));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Mis visitas</h1>
          {user.unit ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Unidad {user.unit.code}</p>
          ) : null}
        </div>
        <Link href="/visitas/nueva" className="rounded-md bg-foreground px-4 py-2 font-medium text-background">
          Autorizar visita
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Pestañas" className="flex gap-1 rounded-lg border border-zinc-200 p-1 dark:border-zinc-800">
          {TABS.map((item) => (
            <Link
              key={item.value}
              href={href(item.value)}
              aria-current={item.value === tab ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                item.value === tab ? "bg-foreground text-background" : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <ActualizarButton />
      </div>

      {lista.data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
          <p className="font-medium">{tab === "activas" ? MESSAGES.emptyActive : MESSAGES.emptyHistory}</p>
        </div>
      ) : (
        <VisitasTabla visitas={lista.data} poll={tab === "activas"} />
      )}

      {lista.total > 0 ? (
        <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">
            {lista.total} {lista.total === 1 ? "visita" : "visitas"} · página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={href(tab, page - 1)} className={linkButtonClass}>Anterior</Link>
            ) : (
              <span aria-disabled="true" className={`${linkButtonClass} cursor-not-allowed opacity-50`}>Anterior</span>
            )}
            {page < totalPages ? (
              <Link href={href(tab, page + 1)} className={linkButtonClass}>Siguiente</Link>
            ) : (
              <span aria-disabled="true" className={`${linkButtonClass} cursor-not-allowed opacity-50`}>Siguiente</span>
            )}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
