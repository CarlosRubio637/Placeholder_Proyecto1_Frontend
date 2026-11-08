import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/api";
import {
  EMPTY_MESSAGES,
  RESIDENT_PAGE_SIZE,
  categoryLabel,
  comunicadosHref,
  fechaCorta,
  parseListParams,
  type ComunicadosFiltro,
  type ComunicadosPagina,
} from "@/lib/comunicados";
import { getComunicados } from "@/lib/comunicados-api";
import { FiltrosComunicados } from "./filtros-comunicados";

export const metadata: Metadata = {
  title: "Comunicados",
};

const noticeClass = "rounded-lg border px-4 py-3 text-sm";

export default async function ComunicadosPage(
  props: PageProps<"/comunicados">,
) {
  const user = await requireRole("RESIDENTE");
  if (!user) return null;

  const filtro = parseListParams(await props.searchParams);
  const result = await getComunicados(filtro);

  if (result.ok) {
    const lastPage = Math.max(
      1,
      Math.ceil(result.pagina.total / RESIDENT_PAGE_SIZE),
    );
    if (filtro.page > lastPage)
      redirect(comunicadosHref({ ...filtro, page: lastPage }));
  }

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Comunicados</h1>

      <FiltrosComunicados tab={filtro.tab} category={filtro.category} />

      {!result.ok ? (
        <p
          role="alert"
          className={`${noticeClass} border-red-200 text-red-800 dark:border-red-900 dark:text-red-300`}
        >
          {result.error === "forbidden"
            ? "No tienes permiso para ver esta página."
            : result.message}
        </p>
      ) : result.pagina.data.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          {EMPTY_MESSAGES[filtro.tab]}
        </p>
      ) : (
        <ListaComunicados pagina={result.pagina} filtro={filtro} />
      )}
    </div>
  );
}

function ListaComunicados({
  pagina,
  filtro,
}: {
  pagina: ComunicadosPagina;
  filtro: ComunicadosFiltro;
}) {
  const lastPage = Math.max(1, Math.ceil(pagina.total / RESIDENT_PAGE_SIZE));

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th scope="col" className="px-4 py-3">
                Título
              </th>
              <th scope="col" className="px-4 py-3">
                Categoría
              </th>
              <th scope="col" className="px-4 py-3">
                Publicado
              </th>
              <th scope="col" className="px-4 py-3">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {pagina.data.map((comunicado) => {
              const unread = comunicado.readAt === null;
              return (
                <tr
                  key={comunicado.id}
                  className={
                    unread ? "bg-sky-50 dark:bg-sky-950/40" : undefined
                  }
                >
                  <td className="min-w-48 px-4 py-3 wrap-anywhere">
                    <Link
                      href={`/comunicados/${comunicado.id}`}
                      prefetch={false}
                      className={`underline underline-offset-4 ${unread ? "font-semibold" : ""}`}
                    >
                      {comunicado.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {categoryLabel(comunicado.category)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                    {fechaCorta(comunicado.publishedAt)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {unread ? (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800 dark:bg-sky-900 dark:text-sky-200">
                        No leído
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">
                        Leído
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <nav
        aria-label="Paginación"
        className="flex flex-wrap items-center justify-between gap-3 text-sm"
      >
        <span className="text-zinc-600 dark:text-zinc-400">
          {pagina.total} {pagina.total === 1 ? "comunicado" : "comunicados"},
          página {filtro.page} de {lastPage}
        </span>
        <div className="flex gap-2">
          <PageLink
            href={comunicadosHref({ ...filtro, page: filtro.page - 1 })}
            disabled={filtro.page <= 1}
          >
            Anterior
          </PageLink>
          <PageLink
            href={comunicadosHref({ ...filtro, page: filtro.page + 1 })}
            disabled={filtro.page >= lastPage}
          >
            Siguiente
          </PageLink>
        </div>
      </nav>
    </>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const className =
    "rounded-md border border-zinc-300 px-3 py-1.5 dark:border-zinc-700";
  if (disabled) {
    return (
      <span
        aria-disabled
        className={`${className} cursor-not-allowed opacity-50`}
      >
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
