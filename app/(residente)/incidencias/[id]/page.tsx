import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/api";

export const metadata: Metadata = {
  title: "Detalle de incidencia",
};

const NUMBER_REGEX = /^INC-\d{4}-\d{5}$/;

// PROVISIONAL (H10): destino de la redirección después de registrar.
// H11 ("Mis incidencias y detalle con historial") reemplaza esta página por
// el detalle completo con GET /incidencias/:id; el aviso ?registrada= se
// mantiene.
export default async function DetalleIncidenciaPage(props: PageProps<"/incidencias/[id]">) {
  const user = await requireRole("RESIDENTE");
  if (!user) return null;

  const { registrada } = await props.searchParams;
  const number = typeof registrada === "string" && NUMBER_REGEX.test(registrada) ? registrada : null;

  return (
    <div className="flex max-w-2xl flex-col items-start gap-4">
      {number ? (
        <p
          role="status"
          className="w-full rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
        >
          Incidencia {number} registrada
        </p>
      ) : null}
      <h1 className="text-2xl font-semibold">{number ?? "Detalle de incidencia"}</h1>
      <p>
        Estado:{" "}
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-sm font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Pendiente
        </span>
      </p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        El detalle completo con el historial estará disponible pronto.
      </p>
      <Link href="/incidencias/nueva" className="text-sm underline underline-offset-4">
        Reportar otra incidencia
      </Link>
    </div>
  );
}
