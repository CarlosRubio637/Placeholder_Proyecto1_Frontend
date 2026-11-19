import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/api";
import {
  DENTRO_PAGE_SIZE,
  DENTRO_PATH,
  formatDocumento,
  formatEntrada,
  formatTiempoDentro,
  getDentro,
} from "@/lib/dentro";
import { getTorres } from "@/lib/paquetes";
import { ActualizarDentro } from "./actualizar";
import { FiltrosDentro } from "./filtros";

export const metadata: Metadata = { title: "Quién está dentro" };

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// H18: "Portería: quién está dentro". Lista las visitas Dentro, la entrada
// más antigua primero, con filtros por torre y búsqueda. Se actualiza cada
// 30 s y con el botón Actualizar.
export default async function DentroPage(props: PageProps<"/seguridad/dentro">) {
  const user = await requireRole("SEGURIDAD");
  if (!user) return null;

  const searchParams = await props.searchParams;
  const requestedPage = parsePage(first(searchParams.page));
  const rawTower = first(searchParams.towerId) ?? "";
  // Un towerId mal formado en la URL se ignora en vez de responder 400.
  const towerId = UUID_REGEX.test(rawTower) ? rawTower : "";
  const search = (first(searchParams.search) ?? "").trim().slice(0, 80);

  const [torres, lista] = await Promise.all([
    getTorres(),
    getDentro({ towerId: towerId || undefined, search: search || undefined, page: requestedPage }),
  ]);

  const totalPages = Math.max(1, Math.ceil(lista.total / DENTRO_PAGE_SIZE));
  function pageHref(n: number) {
    const next = new URLSearchParams();
    if (towerId) next.set("towerId", towerId);
    if (search) next.set("search", search);
    if (n !== 1) next.set("page", String(n));
    const qs = next.toString();
    return qs ? `${DENTRO_PATH}?${qs}` : DENTRO_PATH;
  }
  if (requestedPage > totalPages) redirect(pageHref(totalPages));
  const page = requestedPage;
  const filtered = Boolean(towerId || search);
  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Portería: quién está dentro</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Visitantes con entrada registrada y sin salida, de la entrada más antigua a la más reciente.
        </p>
      </div>

      <div className="w-fit min-w-56 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Visitantes dentro</p>
        <p className="mt-1 text-4xl font-semibold tabular-nums">{lista.totalInside}</p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <FiltrosDentro
          torres={torres.map((torre) => ({ id: torre.id, name: torre.name }))}
          towerId={towerId}
          search={search}
        />
        <ActualizarDentro />
      </div>

      {lista.data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
          <p className="font-medium">
            {filtered && lista.totalInside > 0
              ? "Ningún visitante dentro coincide con la búsqueda."
              : "No hay visitantes dentro del condominio."}
          </p>
          {filtered && lista.totalInside > 0 ? (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Prueba con otra torre o con otro nombre o documento.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <caption className="sr-only">
              Visitantes dentro del condominio, de la entrada más antigua a la más reciente
            </caption>
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th scope="col" className={thClass}>Visitante</th>
                <th scope="col" className={thClass}>Documento</th>
                <th scope="col" className={thClass}>Unidad</th>
                <th scope="col" className={thClass}>Motivo</th>
                <th scope="col" className={thClass}>Entrada</th>
                <th scope="col" className={thClass}>Tiempo dentro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {lista.data.map((visita) => (
                <tr key={visita.id}>
                  <td className={`${tdClass} max-w-xs font-medium break-words`}>{visita.visitorName}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    {formatDocumento(visita.documentType, visita.documentNumber)}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>{visita.unitCode}</td>
                  <td className={`${tdClass} max-w-xs break-words`}>{visita.reason}</td>
                  <td className={`${tdClass} whitespace-nowrap tabular-nums`}>
                    {formatEntrada(visita.entryAt, now)}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap tabular-nums`}>
                    {formatTiempoDentro(visita.minutesInside)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">
          {lista.total} {lista.total === 1 ? "visitante" : "visitantes"} · {DENTRO_PAGE_SIZE} por página ·
          se actualiza cada 30 s
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
    </div>
  );
}
