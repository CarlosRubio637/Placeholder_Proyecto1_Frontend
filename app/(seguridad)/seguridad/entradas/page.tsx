import type { Metadata } from "next";
import { requireRole } from "@/lib/api";
import { getSolicitudes } from "@/lib/entradas-api";
import { getTorres } from "@/lib/paquetes";
import { Porteria } from "./porteria";

export const metadata: Metadata = { title: "Portería: entradas" };

// H16: pantalla "Portería: entradas" del rol SEGURIDAD. Busca autorizaciones,
// envía solicitudes para visitantes sin aviso y registra las entradas.
export default async function EntradasPage() {
  const user = await requireRole("SEGURIDAD");
  if (!user) return null;

  // Si falla alguna, el error.tsx lo muestra.
  const [torres, solicitudes] = await Promise.all([getTorres(), getSolicitudes()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Portería: entradas</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Busca la autorización del visitante o pide permiso a la unidad si llegó sin aviso.
        </p>
      </div>
      <Porteria torres={torres} initialSolicitudes={solicitudes} />
    </div>
  );
}
