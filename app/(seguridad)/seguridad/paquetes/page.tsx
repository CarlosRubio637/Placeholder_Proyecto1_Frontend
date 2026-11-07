import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/api";
import {
  formatRecibido,
  getPaquetes,
  getTorres,
  PAGE_SIZE,
  PAQUETES_PATH,
} from "@/lib/paquetes";
import { BuscarPaquetes } from "./buscar";
import { RegistrarPaquete } from "./registrar-paquete";

export const metadata: Metadata = { title: "Paquetería" };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined) {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

const thClass = "px-4 py-3 text-left text-sm font-medium";
const tdClass = "px-4 py-3 align-top text-sm";
const linkButtonClass =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700";

// H19: pantalla "Paquetería" del rol SEGURIDAD. Lista paquetes pendientes del
// día, con búsqueda y paginación, y abre el formulario de registro.
export default async function PaquetesPage(
  props: PageProps<"/seguridad/paquetes">,
) {
  const user = await requireRole("SEGURIDAD");
  if (!user) return null;

  const searchParams = await props.searchParams;
  const requestedPage = parsePage(first(searchParams.page));
  const search = first(searchParams.search)?.trim() ?? "";
  const aviso = first(searchParams.aviso)?.trim();

  // Torres y lista de paquetes en paralelo; si falla una, el error.tsx la
  // muestra. La lista pide por defecto solo los pendientes.
  const [torres, lista] = await Promise.all([
    getTorres(),
    getPaquetes({ status: "PENDIENTE_ENTREGA", page: requestedPage, search: search || undefined }),
  ]);

  const totalPages = Math.max(1, Math.ceil(lista.total / PAGE_SIZE));
  if (requestedPage > totalPages) {
    const next = new URLSearchParams();
    next.set("page", String(totalPages));
    if (search) next.set("search", search);
    redirect(`${PAQUETES_PATH}?${next.toString()}`);
  }
  const page = requestedPage;

  function pageHref(n: number) {
    const next = new URLSearchParams();
    if (n !== 1) next.set("page", String(n));
    if (search) next.set("search", search);
    const qs = next.toString();
    return qs ? `${PAQUETES_PATH}?${qs}` : PAQUETES_PATH;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Paquetería</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Registra la llegada de los paquetes a portería para que los residentes sepan que pueden recogerlos.
          </p>
        </div>
        <RegistrarPaquete torres={torres} />
      </div>

      {aviso ? (
        <p
          role="status"
          className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
        >
          {aviso}
        </p>
      ) : null}

      <BuscarPaquetes defaultValue={search} />

      {lista.data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
          <p className="font-medium">No hay paquetes pendientes de entrega.</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {search
              ? "Prueba con otra búsqueda."
              : "Cuando registres uno, aparecerá aquí."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <caption className="sr-only">Pendientes de entrega, del más reciente al más antiguo</caption>
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th scope="col" className={thClass}>Código</th>
                <th scope="col" className={thClass}>Unidad</th>
                <th scope="col" className={thClass}>Empresa</th>
                <th scope="col" className={thClass}>Guía</th>
                <th scope="col" className={thClass}>Recibido</th>
                <th scope="col" className={thClass}>Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {lista.data.map((paquete) => (
                <tr key={paquete.id}>
                  <td className={`${tdClass} whitespace-nowrap font-mono`}>{paquete.code}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{paquete.unit.code}</td>
                  <td className={tdClass}>{paquete.courier}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{paquete.trackingNumber ?? "—"}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatRecibido(paquete.receivedAt)}</td>
                  <td className={`${tdClass} max-w-sm break-words`}>{paquete.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {lista.total > 0 ? (
        <nav
          aria-label="Paginación"
          className="flex flex-wrap items-center justify-between gap-3 text-sm"
        >
          <span className="text-zinc-600 dark:text-zinc-400">
            Pendientes de entrega · {lista.total} {lista.total === 1 ? "paquete" : "paquetes"} · {PAGE_SIZE} por página · página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className={linkButtonClass}>Anterior</Link>
            ) : (
              <span aria-disabled="true" className={`${linkButtonClass} cursor-not-allowed opacity-50`}>Anterior</span>
            )}
            {page < totalPages ? (
              <Link href={pageHref(page + 1)} className={linkButtonClass}>Siguiente</Link>
            ) : (
              <span aria-disabled="true" className={`${linkButtonClass} cursor-not-allowed opacity-50`}>Siguiente</span>
            )}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
