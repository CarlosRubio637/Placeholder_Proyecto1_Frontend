import {
  READERS_PAGE_SIZE,
  lecturaFecha,
  lecturasHref,
  readersEmptyMessage,
  type AdminFiltro,
  type LecturasFiltro,
  type LecturasPagina,
} from "@/lib/comunicados-admin";
import { Paginacion } from "../paginacion";

const HEADERS = ["Nombre", "Unidad", "Lectura", "Fecha y hora de lectura"];

export function TablaDestinatarios({
  id,
  lecturas,
  filtro,
  lista,
}: {
  id: string;
  lecturas: LecturasPagina;
  filtro: LecturasFiltro;
  lista: AdminFiltro;
}) {
  if (lecturas.data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        {readersEmptyMessage(filtro.read)}
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
            {lecturas.data.map((destinatario, index) => (
              <tr key={`${destinatario.unitCode}-${index}`}>
                <td className="min-w-40 px-4 py-3 wrap-anywhere">
                  {destinatario.fullName ?? "Sin nombre registrado"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {destinatario.unitCode}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {destinatario.readAt ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                      Leído
                    </span>
                  ) : (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800 dark:bg-sky-900 dark:text-sky-200">
                      No leído
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                  {destinatario.readAt
                    ? lecturaFecha(destinatario.readAt)
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Paginacion
        total={lecturas.total}
        page={filtro.page}
        pageSize={READERS_PAGE_SIZE}
        noun={["destinatario", "destinatarios"]}
        href={(page) => lecturasHref(id, { ...filtro, page }, lista)}
      />
    </>
  );
}
