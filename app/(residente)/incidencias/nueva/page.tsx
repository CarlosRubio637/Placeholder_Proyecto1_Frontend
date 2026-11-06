import type { Metadata } from "next";
import { requireRole } from "@/lib/api";
import { IncidenciaForm } from "./incidencia-form";

export const metadata: Metadata = {
  title: "Reportar incidencia",
};

// H10: el residente reporta un problema de las instalaciones con fotos.
export default async function ReportarIncidenciaPage() {
  const user = await requireRole("RESIDENTE");
  if (!user) return null;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Reportar incidencia</h1>
      <p className="mt-1 mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Cuéntanos qué problema encontraste en las instalaciones. La administración
        lo revisará y podrás darle seguimiento.
      </p>
      <IncidenciaForm />
    </div>
  );
}
