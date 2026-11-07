import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eliminarBloqueo } from "@/app/actions/areas";
import { requireRole } from "@/lib/api";
import { fetchAdminAreas } from "@/lib/areas-api";
import { formatDate, todaySV } from "@/lib/areas";
import { AreaForm } from "../_components/area-form";
import { BlockForm } from "../_components/block-form";
import { DeleteBlockButton } from "../_components/delete-block-button";

export const metadata: Metadata = {
  title: "Editar área",
};

// H9: editar un área y administrar sus bloqueos por mantenimiento.
export default async function EditarAreaPage(props: PageProps<"/admin/areas/[id]">) {
  const user = await requireRole("ADMINISTRADOR");
  if (!user) return null;

  const { id } = await props.params;
  // El backend no tiene GET de un área (H9 define solo la lista).
  const area = (await fetchAdminAreas()).find((item) => item.id === id);
  if (!area) notFound();

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Editar área: {area.name}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Reservas confirmadas futuras: {area.futureReservations}
          </p>
        </div>
        <AreaForm area={area} />
      </section>

      <section className="flex max-w-2xl flex-col gap-4" aria-labelledby="bloqueos">
        <h2 id="bloqueos" className="text-xl font-semibold">Bloqueos por mantenimiento</h2>
        {area.blocks.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No hay bloqueos programados.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {area.blocks.map((block) => (
              <li key={block.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium tabular-nums">
                    {formatDate(block.startDate)}
                    {block.endDate !== block.startDate ? ` al ${formatDate(block.endDate)}` : ""}
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400">{block.reason}</p>
                </div>
                <form action={eliminarBloqueo}>
                  <input type="hidden" name="areaId" value={area.id} />
                  <input type="hidden" name="blockId" value={block.id} />
                  <DeleteBlockButton />
                </form>
              </li>
            ))}
          </ul>
        )}
        <h3 className="mt-2 font-medium">Nuevo bloqueo</h3>
        <BlockForm areaId={area.id} today={todaySV()} />
      </section>
    </div>
  );
}
