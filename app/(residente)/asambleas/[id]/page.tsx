import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/api";
import { formatFechaLarga, getAsamblea } from "@/lib/votaciones";
import { Actualizar } from "../actualizar";
import { TemaVotacion } from "./tema-votacion";

export const metadata: Metadata = { title: "Votar" };

// H23: detalle de una asamblea en la que la unidad del residente está
// habilitada. Cada tema tiene sus botones de opción; si ya votó, muestra el
// aviso "Ya votaste" o "Tu unidad ya votó" según corresponda.
export default async function VotarPage(props: PageProps<"/asambleas/[id]">) {
  const user = await requireRole("RESIDENTE");
  if (!user) return null;

  const { id } = await props.params;
  const asamblea = await getAsamblea(id);
  if (!asamblea) notFound();

  const closed = asamblea.status === "CERRADA";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/asambleas" className="text-sm underline underline-offset-4">
          Volver a asambleas activas
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold break-words">{asamblea.title}</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {closed
                ? "La votación ya cerró."
                : `Cierra el ${formatFechaLarga(asamblea.endsAt)}. Tu voto es definitivo y secreto; cuenta uno por unidad en cada tema.`}
            </p>
            {asamblea.description ? (
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
                {asamblea.description}
              </p>
            ) : null}
          </div>
          <Actualizar />
        </div>
      </div>

      {closed ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          La votación no está abierta.
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        {asamblea.topics.map((tema, index) => (
          <TemaVotacion key={tema.id} tema={tema} index={index} />
        ))}
      </div>
    </div>
  );
}
