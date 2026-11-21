import type { Metadata } from "next";
import Link from "next/link";
import { requireAnyRole } from "@/lib/api";
import { availabilityPath } from "@/lib/reservas";
import { fetchAreas } from "@/lib/reservas-api";

export const metadata: Metadata = {
  title: "Áreas comunes",
};

// H6: catálogo de áreas habilitadas.
export default async function AreasComunesPage() {
  const user = await requireAnyRole(["RESIDENTE", "ADMINISTRADOR"]);
  if (!user) return null;

  const areas = await fetchAreas();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Áreas comunes</h1>
      {areas.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No hay áreas comunes habilitadas.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <li key={area.id}>
              <Link
                href={availabilityPath(area.id)}
                className="flex h-full flex-col gap-2 rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
              >
                <h2 className="text-lg font-semibold">{area.name}</h2>
                <p className="text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
                  Aforo máximo: {area.capacity} personas
                  <br />
                  Horario: {area.openTime} a {area.closeTime}
                  <br />
                  Franjas de {area.slotMinutes} minutos
                </p>
                {area.rules ? <p className="whitespace-pre-line text-sm">{area.rules}</p> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
