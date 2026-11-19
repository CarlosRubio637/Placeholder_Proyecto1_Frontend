import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/api";
import {
  directorioHref,
  lastPageOf,
  parseDirectorioParams,
} from "@/lib/directorio";
import { getDirectorio } from "@/lib/directorio-api";
import { getTorres } from "@/lib/paquetes";
import { BuscarVecinos } from "./buscar-vecinos";
import { ResultadosDirectorio } from "./resultados-directorio";

export const metadata: Metadata = {
  title: "Directorio de vecinos",
};

export default async function DirectorioPage(props: PageProps<"/directorio">) {
  const user = await requireRole("RESIDENTE");
  if (!user) return null;

  const parsed = parseDirectorioParams(await props.searchParams);
  const torres = await getTorres();
  const pedida = parsed.busqueda;
  const busqueda =
    pedida?.mode === "unidad" &&
    !torres.some((torre) => torre.id === pedida.towerId)
      ? null
      : pedida;
  const page = parsed.page;
  const result = busqueda ? await getDirectorio(busqueda, page) : null;

  if (busqueda && result?.ok) {
    const lastPage = lastPageOf(result.pagina.total);
    if (page > lastPage) redirect(directorioHref(busqueda, lastPage));
  }

  return (
    <div className="flex min-w-0 max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Directorio de vecinos</h1>

      <BuscarVecinos
        key={busqueda ? directorioHref(busqueda) : "inicial"}
        torres={torres}
        busqueda={busqueda}
      />

      {result && !result.ok ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:text-red-300"
        >
          {result.error === "forbidden"
            ? "No tienes permiso para ver esta página."
            : result.message}
        </p>
      ) : (
        <ResultadosDirectorio
          pagina={result?.pagina ?? null}
          busqueda={busqueda}
          page={page}
        />
      )}
    </div>
  );
}
