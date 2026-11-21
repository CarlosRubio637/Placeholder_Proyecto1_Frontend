import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/api";
import { getTorres } from "@/lib/paquetes";
import {
  lastPageOf,
  parseUnidadesMorosasParams,
  unidadesMorosasHref,
} from "@/lib/unidades-morosas";
import { getUnidadesMorosas } from "@/lib/unidades-morosas-api";
import { FiltrosUnidadesMorosas } from "./filtros-unidades-morosas";
import { ReporteUnidadesMorosas } from "./reporte-unidades-morosas";

export const metadata: Metadata = {
  title: "Unidades morosas",
};

export default async function UnidadesMorosasPage(props: PageProps<"/admin/morosidad">) {
  const user = await requireRole("ADMINISTRADOR");
  if (!user) return null;

  const { filtros: pedidos, page } = parseUnidadesMorosasParams(await props.searchParams);
  const torres = await getTorres();
  const filtros = torres.some((torre) => torre.id === pedidos.towerId)
    ? pedidos
    : { ...pedidos, towerId: undefined };
  const result = await getUnidadesMorosas(filtros, page);

  if (result.ok) {
    const lastPage = lastPageOf(result.reporte.total);
    if (page > lastPage) redirect(unidadesMorosasHref(filtros, lastPage));
  }

  return (
    <div className="flex min-w-0 max-w-6xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Unidades morosas</h1>

      <FiltrosUnidadesMorosas
        key={unidadesMorosasHref(filtros)}
        torres={torres}
        towerId={filtros.towerId}
        search={filtros.search}
      />

      {result.ok ? (
        <ReporteUnidadesMorosas reporte={result.reporte} filtros={filtros} page={page} />
      ) : (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-white p-5 text-sm text-red-800 dark:border-red-900 dark:bg-zinc-950 dark:text-red-300"
        >
          {result.error === "forbidden" ? "No tienes permiso para ver esta página." : result.message}
        </p>
      )}
    </div>
  );
}
