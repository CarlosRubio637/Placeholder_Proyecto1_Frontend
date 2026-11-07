import type { Metadata } from "next";
import { requireRole } from "@/lib/api";
import { todaySV } from "@/lib/areas";
import { getTorres } from "@/lib/paquetes";
import { ComunicadoForm } from "./comunicado-form";

export const metadata: Metadata = {
  title: "Nuevo comunicado",
};

export default async function NuevoComunicadoPage() {
  const user = await requireRole("ADMINISTRADOR");
  if (!user) return null;

  const towers = await getTorres();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Nuevo comunicado</h1>
      <section
        aria-label="Nuevo comunicado"
        className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800"
      >
        <ComunicadoForm today={todaySV()} towers={towers} />
      </section>
    </div>
  );
}
