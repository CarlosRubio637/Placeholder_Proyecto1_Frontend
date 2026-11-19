import Link from "next/link";
import { categoryLabel, fechaCorta, fechaVigencia } from "@/lib/comunicados";
import {
  ADMIN_PAGE_SIZE,
  LIST_EMPTY,
  LIST_EMPTY_FILTERED,
  STATUS_LABELS,
  adminComunicadosHref,
  audienciaText,
  lecturasHref,
  lecturasText,
  porcentajeText,
  type AdminFiltro,
  type ComunicadosAdminPagina,
  type Estado,
} from "@/lib/comunicados-admin";
import { Paginacion } from "./paginacion";

const STATUS_BADGE: Record<Estado, string> = {
  VIGENTE:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  ARCHIVADO: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

const HEADERS = [
  "Título",
  "Categoría",
  "Audiencia",
  "Publicado",
  "Vigente hasta",
  "Estado",
  "Lecturas",
];

export function TablaComunicados({
  pagina,
  filtro,
}: {
  pagina: ComunicadosAdminPagina;
  filtro: AdminFiltro;
}) {
  if (pagina.data.length === 0) {
    const filtered = filtro.status !== null || filtro.category !== null;
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        {filtered ? LIST_EMPTY_FILTERED : LIST_EMPTY}
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
            <tr>
              {HEADERS.map((header) => (
                <th key={header} scope="col" className="px-4 py-3">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {pagina.data.map((comunicado) => (
              <tr key={comunicado.id}>
                <td className="min-w-48 px-4 py-3 wrap-anywhere">
                  <Link
                    href={lecturasHref(
                      comunicado.id,
                      { read: null, page: 1 },
                      filtro,
                    )}
                    className="font-medium underline underline-offset-4"
                  >
                    {comunicado.title}
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {categoryLabel(comunicado.category)}
                </td>
                <td className="min-w-32 px-4 py-3">
                  {audienciaText(comunicado)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                  {fechaCorta(comunicado.publishedAt)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                  {fechaVigencia(comunicado.expiresOn)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[comunicado.status]}`}
                  >
                    {STATUS_LABELS[comunicado.status]}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                  {lecturasText(
                    comunicado.readCount,
                    comunicado.recipientCount,
                  )}{" "}
                  <span className="block text-xs text-zinc-600 dark:text-zinc-400">
                    {porcentajeText(comunicado.readPct)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Paginacion
        total={pagina.total}
        page={filtro.page}
        pageSize={ADMIN_PAGE_SIZE}
        noun={["comunicado", "comunicados"]}
        href={(page) => adminComunicadosHref({ ...filtro, page })}
      />
    </>
  );
}
