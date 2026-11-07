import type { Metadata } from "next";
import { requireRole } from "@/lib/api";
import { todayInElSalvador } from "@/lib/cuotas";
import { fetchGeneraciones } from "@/lib/cuotas-api";
import { GenerarCuotasForm } from "./generar-cuotas-form";
import { HistorialGeneraciones } from "./historial-generaciones";

export const metadata: Metadata = {
  title: "Generar cuotas",
};

function pageFrom(value: string | string[] | undefined): number {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export default async function GenerarCuotasPage(props: PageProps<"/admin/cuotas/generar">) {
  const user = await requireRole("ADMINISTRADOR");
  if (!user) return null;

  const { page } = await props.searchParams;
  const history = await fetchGeneraciones(pageFrom(page));

  return (
    <div className="flex flex-col gap-10">
      <section className="max-w-2xl">
        <h1 className="text-2xl font-semibold">Generar cuotas</h1>
        <p className="mt-1 mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Crea en una sola operación la cuota del mes para todas las unidades activas. Las que ya
          tienen cuota del periodo se omiten.
        </p>
        <GenerarCuotasForm today={todayInElSalvador()} />
      </section>
      <HistorialGeneraciones history={history} />
    </div>
  );
}
