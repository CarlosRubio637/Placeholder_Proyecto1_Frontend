import type { Metadata } from "next";
import { requireRole } from "@/lib/api";
import { formatHora, getResumen } from "@/lib/resumen";
import { Actualizar } from "./actualizar";
import { Tarjetas } from "./tarjetas";

export const metadata: Metadata = {
  title: "Resumen del condominio",
};

// H37: resumen "de un vistazo" para la administración. Es la pantalla de
// inicio del Administrador. Se consulta al abrirla y con Actualizar.
export default async function ResumenPage() {
  const user = await requireRole("ADMINISTRADOR");
  if (!user) return null;

  const result = await getResumen();

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Resumen del condominio</h1>
          {result.ok ? (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Última actualización: {formatHora(result.resumen.generatedAt)}
            </p>
          ) : null}
        </div>
        <Actualizar />
      </div>

      {result.ok ? (
        <Tarjetas resumen={result.resumen} />
      ) : (
        <p
          role="alert"
          className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-red-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-red-300"
        >
          No tienes permiso para ver esta página.
        </p>
      )}
    </div>
  );
}
