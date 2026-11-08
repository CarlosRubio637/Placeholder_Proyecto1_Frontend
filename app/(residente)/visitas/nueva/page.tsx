import type { Metadata } from "next";
import { connection } from "next/server";
import { requireRole } from "@/lib/api";
import { ahora } from "@/lib/fechas";
import { defaultSchedule } from "@/lib/validation/visita";
import { VisitaForm } from "./visita-form";

export const metadata: Metadata = {
  title: "Autorizar visita",
};

// H14: el residente autoriza a un visitante antes de que llegue, para que
// seguridad lo deje entrar con el código sin llamarle.
export default async function AutorizarVisitaPage() {
  const user = await requireRole("RESIDENTE");
  if (!user) return null;

  // Los valores por defecto dependen de la hora actual: se calculan en cada solicitud.
  await connection();
  const nowMs = ahora();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Autorizar visita</h1>
      <p className="mt-1 mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Registra a tu visitante antes de que llegue. Recibirás un código que seguridad le
        pedirá en portería; solo sirve el día de la visita, de 06:00 a 22:00.
      </p>
      <VisitaForm nowMs={nowMs} defaults={defaultSchedule(nowMs)} />
    </div>
  );
}
