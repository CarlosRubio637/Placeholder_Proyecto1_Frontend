import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/api";
import { fetchAdminAreas } from "@/lib/areas-api";

export const metadata: Metadata = {
  title: "Áreas comunes",
};

const AVISOS: Record<string, string> = {
  "area-guardada": "Área guardada",
};

// H9: lista de áreas comunes para la administración.
export default async function AreasAdminPage(props: PageProps<"/admin/areas">) {
  const user = await requireRole("ADMINISTRADOR");
  if (!user) return null;

  const { aviso } = await props.searchParams;
  const mensaje = typeof aviso === "string" ? AVISOS[aviso] : undefined;
  const areas = await fetchAdminAreas();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Áreas comunes (administración)</h1>
        <Link
          href="/admin/areas/nueva"
          className="rounded-md bg-foreground px-4 py-2 font-medium text-background"
        >
          Nueva área
        </Link>
      </div>

      {mensaje ? (
        <p role="status" className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
          {mensaje}
        </p>
      ) : null}

      {areas.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">No hay áreas registradas.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3">Área</th>
                <th className="px-4 py-3 text-right">Personas</th>
                <th className="px-4 py-3">Horario</th>
                <th className="px-4 py-3">Franja</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Reservas futuras</th>
                <th className="px-4 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {areas.map((area) => (
                <tr key={area.id}>
                  <td className="px-4 py-3 font-medium">{area.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{area.capacity}</td>
                  <td className="px-4 py-3 tabular-nums">{area.openTime}–{area.closeTime}</td>
                  <td className="px-4 py-3">{area.slotMinutes} min</td>
                  <td className="px-4 py-3">
                    {area.isActive ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">Habilitada</span>
                    ) : (
                      <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Deshabilitada</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{area.futureReservations}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/areas/${area.id}`} className="underline underline-offset-4">
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
