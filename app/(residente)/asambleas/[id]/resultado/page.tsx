import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResultadoAsamblea } from "@/app/_components/resultado-asamblea";
import { requireRole } from "@/lib/api";
import { getResultado } from "@/lib/resultados";

export const metadata: Metadata = { title: "Resultado de la asamblea" };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// H24: resultado auditable de la asamblea, vista del Residente.
export default async function ResultadoResidentePage(
  props: PageProps<"/asambleas/[id]/resultado">,
) {
  const user = await requireRole("RESIDENTE");
  if (!user) return null;

  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const resultado = await getResultado(id);
  if (!resultado) notFound();

  const pagina = Math.max(1, Number.parseInt(first(searchParams.pagina) ?? "1", 10) || 1);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/asambleas/cerradas" className="text-sm underline underline-offset-4">
          Volver a asambleas cerradas
        </Link>
        <h1 className="mt-2 text-2xl font-semibold break-words">Resultado: {resultado.title}</h1>
      </div>
      <ResultadoAsamblea
        resultado={resultado}
        basePath={`/asambleas/${id}/resultado`}
        temaActivo={first(searchParams.tema)}
        pagina={pagina}
      />
    </div>
  );
}
