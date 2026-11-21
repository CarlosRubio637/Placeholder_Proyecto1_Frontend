import Link from "next/link";
import type { Torre, Unidad } from "@/lib/paquetes";

// H2: listas de torre y unidad de la pantalla "Unidad (administración)".
// Son enlaces: elegir una torre muestra sus unidades y elegir una unidad abre
// su estado de cuenta.
export function UnitPicker({
  towers,
  towerId,
  units,
  unitId,
}: {
  towers: Torre[];
  towerId?: string;
  units: Unidad[];
  unitId?: string;
}) {
  const chip = (active: boolean) =>
    `rounded-md border px-3 py-1.5 text-sm ${
      active ? "border-foreground bg-foreground text-background" : "border-zinc-300 dark:border-zinc-700"
    }`;
  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Torre" className="flex flex-wrap gap-2">
        {towers.map((tower) => (
          <Link key={tower.id} href={`/admin/unidades?torre=${tower.id}`} className={chip(tower.id === towerId)}>
            {tower.name}
          </Link>
        ))}
      </div>
      {towerId ? (
        <div role="group" aria-label="Unidad" className="flex flex-wrap gap-2">
          {units.map((unit) => (
            <Link key={unit.id} href={`/admin/unidades/${unit.id}`} className={chip(unit.id === unitId)}>
              {unit.code}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
