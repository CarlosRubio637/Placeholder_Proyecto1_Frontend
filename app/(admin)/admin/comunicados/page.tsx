import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/api";
import { firstParam } from "@/lib/comunicados";
import {
  ADMIN_PAGE_SIZE,
  adminComunicadosHref,
  lastPageOf,
  parseAdminListParams,
} from "@/lib/comunicados-admin";
import { getComunicadosAdmin } from "@/lib/comunicados-api";
import { FiltrosAdmin } from "./filtros-admin";
import { TablaComunicados } from "./tabla-comunicados";

export const metadata: Metadata = {
  title: "Comunicados",
};

const AVISOS: Record<string, string> = {
  "comunicado-publicado": "Comunicado publicado",
};

export default async function ComunicadosPage(
  props: PageProps<"/admin/comunicados">,
) {
  const user = await requireRole("ADMINISTRADOR");
  if (!user) return null;

  const searchParams = await props.searchParams;
  const aviso = firstParam(searchParams.aviso);
  const mensaje = aviso && Object.hasOwn(AVISOS, aviso) ? AVISOS[aviso] : null;
  const filtro = parseAdminListParams(searchParams);
  const result = await getComunicadosAdmin(filtro);

  if (result.ok) {
    const lastPage = lastPageOf(result.pagina.total, ADMIN_PAGE_SIZE);
    if (filtro.page > lastPage)
      redirect(adminComunicadosHref({ ...filtro, page: lastPage }));
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Comunicados</h1>
        <Link
          href="/admin/comunicados/nuevo"
          className="rounded-md bg-primary hover:bg-primary-hover px-4 py-2 font-medium text-primary-foreground"
        >
          Nuevo comunicado
        </Link>
      </div>

      {mensaje ? (
        <p
          role="status"
          className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
        >
          {mensaje}
        </p>
      ) : null}

      <FiltrosAdmin status={filtro.status} category={filtro.category} />

      {result.ok ? (
        <TablaComunicados pagina={result.pagina} filtro={filtro} />
      ) : (
        <p
          role="alert"
          className="rounded-lg border border-red-200 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:text-red-300"
        >
          {result.error === "forbidden"
            ? "No tienes permiso para ver esta página."
            : result.message}
        </p>
      )}
    </div>
  );
}
