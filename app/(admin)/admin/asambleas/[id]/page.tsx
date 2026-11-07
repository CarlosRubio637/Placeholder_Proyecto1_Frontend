import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/api";
import { getAsamblea } from "@/lib/asambleas";
import { isoToLocal } from "@/lib/fechas";
import { MESSAGES } from "@/lib/validation/asamblea";
import { AsambleaForm } from "../asamblea-form";
import { StatusBadge } from "../status-badge";

export const metadata: Metadata = {
  title: "Asamblea",
};

// H22: editar una asamblea Programada o verla en solo lectura (Abierta o Cerrada).
export default async function AsambleaPage(props: PageProps<"/admin/asambleas/[id]">) {
  const user = await requireRole("ADMINISTRADOR");
  if (!user) return null;

  const { id } = await props.params;
  const asamblea = await getAsamblea(id);
  if (!asamblea) notFound();

  const readOnly = asamblea.status !== "PROGRAMADA";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/asambleas" className="text-sm underline underline-offset-4">
          Volver a asambleas
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold break-words">
            {readOnly ? asamblea.title : "Editar asamblea"}
          </h1>
          <StatusBadge status={asamblea.status} />
        </div>
        {readOnly ? (
          <div className="mt-3 flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            <p role="status">{MESSAGES.started}</p>
            {asamblea.eligibleUnits !== null ? (
              <p>Unidades habilitadas para votar: {asamblea.eligibleUnits}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <AsambleaForm
        id={asamblea.id}
        readOnly={readOnly}
        initial={{
          title: asamblea.title,
          description: asamblea.description ?? "",
          startsAt: isoToLocal(asamblea.startsAt),
          endsAt: isoToLocal(asamblea.endsAt),
          topics: asamblea.topics.map((topic) => ({
            question: topic.question,
            options: topic.options.map((option) => option.text),
          })),
        }}
      />
    </div>
  );
}
