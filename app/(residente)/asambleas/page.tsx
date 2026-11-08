import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/api";
import {
  ASAMBLEAS_PATH,
  formatFecha,
  getActivas,
} from "@/lib/votaciones";
import { Actualizar } from "./actualizar";

export const metadata: Metadata = { title: "Asambleas activas" };

// H23: pantalla "Asambleas activas" del residente. Lista una tarjeta por cada
// asamblea Abierta en la que su unidad está habilitada.
export default async function AsambleasActivasPage() {
  const user = await requireRole("RESIDENTE");
  if (!user) return null;

  const { data } = await getActivas();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Asambleas activas</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Vota por tu unidad en las asambleas abiertas. Tu voto es definitivo y secreto, y cuenta uno por unidad en cada tema.
          </p>
        </div>
        <Actualizar />
      </div>

      {data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
          <p className="font-medium">No hay asambleas abiertas.</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Cuando la administración abra una, aparecerá aquí.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.map((asamblea) => {
            const complete = asamblea.votedTopics >= asamblea.topicCount;
            return (
              <li key={asamblea.id}>
                <Link
                  href={`${ASAMBLEAS_PATH}/${asamblea.id}`}
                  className="flex h-full flex-col gap-3 rounded-xl border border-zinc-200 bg-background p-5 transition-colors hover:border-foreground dark:border-zinc-800"
                >
                  <h2 className="text-lg font-semibold break-words">{asamblea.title}</h2>
                  <dl className="grid gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="font-medium text-foreground">Cierra</dt>
                      <dd>{formatFecha(asamblea.endsAt)}</dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="font-medium text-foreground">Progreso</dt>
                      <dd>
                        Tu unidad votó {asamblea.votedTopics} de {asamblea.topicCount} temas
                      </dd>
                    </div>
                  </dl>
                  <span
                    className={`mt-auto inline-block self-start rounded-full px-2 py-0.5 text-xs font-medium ${
                      complete
                        ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                        : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                    }`}
                  >
                    {complete ? "Listo" : "Faltan temas por votar"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
