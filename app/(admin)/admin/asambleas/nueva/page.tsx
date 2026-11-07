import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/api";
import { defaultSchedule } from "@/lib/fechas";
import { DEFAULT_OPTIONS, type AsambleaValues } from "@/lib/validation/asamblea";
import { AsambleaForm } from "../asamblea-form";

export const metadata: Metadata = {
  title: "Convocar asamblea",
};

// H22: el administrador convoca una asamblea con su agenda de temas.
export default async function ConvocarAsambleaPage() {
  const user = await requireRole("ADMINISTRADOR");
  if (!user) return null;

  const initial: AsambleaValues = {
    title: "",
    description: "",
    ...defaultSchedule(), // inicio mañana 08:00, cierre 2 días después
    topics: [{ question: "", options: [...DEFAULT_OPTIONS] }],
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/asambleas" className="text-sm underline underline-offset-4">
          Volver a asambleas
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Convocar asamblea</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Define la fecha de votación y los temas. Al llegar la hora de inicio, la asamblea se abre
          y todos los residentes reciben un aviso.
        </p>
      </div>
      <AsambleaForm initial={initial} />
    </div>
  );
}
