import type { Metadata } from "next";
import { requireRole } from "@/lib/api";
import { getTorres, getUnidades } from "@/lib/paquetes";
import { UnitPicker } from "./unit-picker";

export const metadata: Metadata = {
  title: "Unidades",
};

// H2: el administrador elige torre y unidad para ver su estado de cuenta.
export default async function UnidadesPage(props: PageProps<"/admin/unidades">) {
  const user = await requireRole("ADMINISTRADOR");
  if (!user) return null;

  const query = await props.searchParams;
  const towers = await getTorres();
  const towerId = typeof query.torre === "string" && towers.some((t) => t.id === query.torre) ? query.torre : undefined;
  const units = towerId ? await getUnidades(towerId) : [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Unidades</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Elige una torre y una unidad para ver su estado de cuenta, su código de registro y sus residentes.
      </p>
      <UnitPicker towers={towers} towerId={towerId} units={units} />
    </div>
  );
}
