import Link from "next/link";
import { redirect } from "next/navigation";
import { formatFecha } from "@/lib/fechas";
import {
  PARTICIPACION_PAGE_SIZE,
  formatPct,
  getParticipacion,
  type Resultado,
  type TemaResultado,
} from "@/lib/resultados";

type Props = {
  resultado: Resultado;
  /** Ruta de esta misma pantalla, para los enlaces de paginación del registro. */
  basePath: string;
  /** Tema cuyo registro se está paginando y su página (de la URL). */
  temaActivo?: string;
  pagina: number;
};

const cardClass = "rounded-xl border border-zinc-200 p-5 dark:border-zinc-800";
const linkButtonClass =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700";

const totalPagesOf = (total: number) =>
  Math.max(1, Math.ceil(total / PARTICIPACION_PAGE_SIZE));

const registroHref = (basePath: string, temaId: string, pagina: number) =>
  `${basePath}?tema=${temaId}&pagina=${pagina}#tema-${temaId}`;

// Vista del resultado de una asamblea (H24). La usan el Administrador
// (/admin/asambleas/:id/resultado) y el Residente (/asambleas/:id/resultado).
export async function ResultadoAsamblea({ resultado, basePath, temaActivo, pagina }: Props) {
  if (resultado.status === "PROGRAMADA") {
    return (
      <p role="status" className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
        La asamblea todavía no inicia.
      </p>
    );
  }

  if (resultado.status === "ABIERTA") {
    return (
      <div className="flex flex-col gap-4">
        <p
          role="status"
          className="rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100"
        >
          Los resultados se publican al cierre.
        </p>
        {resultado.topics.map((tema, index) => (
          <section key={tema.id} className={cardClass}>
            <h2 className="font-semibold break-words">
              Tema {index + 1}. {tema.question}
            </h2>
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
              {tema.votedUnits} de {tema.eligibleUnits} unidades han votado
            </p>
          </section>
        ))}
      </div>
    );
  }

  // Cerrada: resultado completo y registro de participación por tema.
  const registros = await Promise.all(
    resultado.topics.map((tema) =>
      getParticipacion(tema.id, tema.id === temaActivo ? pagina : 1),
    ),
  );

  // Una página que no existe (p. ej. ?pagina=99) lleva a la última.
  const activo = resultado.topics.findIndex((tema) => tema.id === temaActivo);
  if (activo >= 0) {
    const { total } = registros[activo];
    const last = totalPagesOf(total);
    if (pagina > last) {
      redirect(registroHref(basePath, resultado.topics[activo].id, last));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Cerrada el {resultado.closedAt ? formatFecha(resultado.closedAt) : "—"} · El resultado se
        guardó al cierre y no cambia.
      </p>
      {resultado.topics.map((tema, index) => (
        <TemaCerrado
          key={tema.id}
          tema={tema}
          index={index}
          registro={registros[index]}
          basePath={basePath}
        />
      ))}
    </div>
  );
}

function TemaCerrado({
  tema,
  index,
  registro,
  basePath,
}: {
  tema: TemaResultado;
  index: number;
  registro: Awaited<ReturnType<typeof getParticipacion>>;
  basePath: string;
}) {
  const ganadora = tema.options.find((option) => option.id === tema.winnerOptionId);
  const totalPages = totalPagesOf(registro.total);

  return (
    <section id={`tema-${tema.id}`} aria-labelledby={`tema-${tema.id}-titulo`} className="flex flex-col gap-4">
      <h2 id={`tema-${tema.id}-titulo`} className="text-lg font-semibold break-words">
        Tema {index + 1}. {tema.question}
      </h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className={cardClass}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Unidades habilitadas</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{tema.eligibleUnits}</p>
          <p className="text-sm text-zinc-500">Fijas al abrir la asamblea</p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Unidades que votaron</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{tema.votedUnits}</p>
          <p className="text-sm text-zinc-500">
            {tema.votedUnits} de {tema.eligibleUnits} unidades · {formatPct(tema.participationPct)} de
            participación
          </p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Opción ganadora</p>
          <p className="mt-1 text-3xl font-semibold break-words">
            {tema.totalVotes === 0 ? "Sin votos" : tema.isTie ? "Empate" : (ganadora?.text ?? "—")}
          </p>
          {ganadora && !tema.isTie ? (
            <p className="text-sm text-zinc-500">
              {ganadora.votes} de {tema.totalVotes} votos
            </p>
          ) : null}
        </div>
      </div>

      <div className={cardClass}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Votos por opción del tema {index + 1}</caption>
            <thead>
              <tr className="text-left text-zinc-600 dark:text-zinc-400">
                <th scope="col" className="pb-2 font-medium">Opción</th>
                <th scope="col" className="pb-2 font-medium">
                  <span className="sr-only">Gráfico</span>
                </th>
                <th scope="col" className="pb-2 text-right font-medium">Votos</th>
                <th scope="col" className="pb-2 text-right font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {tema.options.map((option) => (
                <tr key={option.id}>
                  <td className="max-w-48 py-2 pr-4 break-words">{option.text}</td>
                  <td className="w-1/2 min-w-24 py-2 pr-4" aria-hidden="true">
                    <div className="h-2.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
                      <div
                        className="h-2.5 rounded-full bg-foreground"
                        style={{ width: `${option.pct ?? 0}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-2 text-right tabular-nums">{option.votes ?? "—"}</td>
                  <td className="py-2 pl-3 text-right whitespace-nowrap tabular-nums">{formatPct(option.pct)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-200 dark:border-zinc-800">
                <th scope="row" className="pt-2 text-left font-medium">Total de votos</th>
                <td />
                <td className="pt-2 text-right font-medium tabular-nums">{tema.totalVotes ?? "—"}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className={cardClass}>
        <h3 className="font-semibold">Registro de participación (sin la opción elegida)</h3>
        {registro.total === 0 ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Ninguna unidad votó este tema.</p>
        ) : (
          <>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Unidades que votaron el tema {index + 1}</caption>
                <thead className="bg-zinc-50 dark:bg-zinc-900">
                  <tr className="text-left">
                    <th scope="col" className="px-3 py-2 font-medium">Unidad</th>
                    <th scope="col" className="px-3 py-2 font-medium">Votó</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {registro.data.map((row) => (
                    <tr key={row.unitCode}>
                      <td className="px-3 py-2">{row.unitCode}</td>
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums">{formatFecha(row.votedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav aria-label={`Paginación del registro del tema ${index + 1}`} className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">
                {registro.total} {registro.total === 1 ? "unidad" : "unidades"} · {PARTICIPACION_PAGE_SIZE} por página · página {registro.page} de {totalPages}
              </span>
              <div className="flex gap-2">
                {registro.page > 1 ? (
                  <Link href={registroHref(basePath, tema.id, registro.page - 1)} className={linkButtonClass}>Anterior</Link>
                ) : (
                  <span aria-disabled="true" className={`${linkButtonClass} cursor-not-allowed opacity-50`}>Anterior</span>
                )}
                {registro.page < totalPages ? (
                  <Link href={registroHref(basePath, tema.id, registro.page + 1)} className={linkButtonClass}>Siguiente</Link>
                ) : (
                  <span aria-disabled="true" className={`${linkButtonClass} cursor-not-allowed opacity-50`}>Siguiente</span>
                )}
              </div>
            </nav>
          </>
        )}
      </div>
    </section>
  );
}