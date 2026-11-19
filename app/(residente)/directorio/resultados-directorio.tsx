import Link from "next/link";
import {
  DIRECTORIO_MESSAGES,
  directorioHref,
  lastPageOf,
  type Busqueda,
  type DirectorioPagina,
  type Vecino,
} from "@/lib/directorio";

const noticeClass =
  "rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-zinc-600 dark:border-zinc-700 dark:text-zinc-400";

export function ResultadosDirectorio({
  pagina,
  busqueda,
  page,
}: {
  pagina: DirectorioPagina | null;
  busqueda: Busqueda | null;
  page: number;
}) {
  if (!pagina || !busqueda) {
    return <p className={noticeClass}>{DIRECTORIO_MESSAGES.initial}</p>;
  }
  if (pagina.data.length === 0) {
    return <p className={noticeClass}>{DIRECTORIO_MESSAGES.empty}</p>;
  }

  const lastPage = lastPageOf(pagina.total);
  const residentes = pagina.total === 1 ? "residente" : "residentes";

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2">
        {pagina.data.map((vecino, index) => (
          <li
            key={`${vecino.fullName}-${index}`}
            className="flex min-w-0 flex-col gap-2 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <h2 className="font-semibold wrap-anywhere">{vecino.fullName}</h2>
            <DatosCompartidos vecino={vecino} />
          </li>
        ))}
      </ul>

      <nav
        aria-label="Paginación"
        className="flex flex-wrap items-center justify-between gap-3 text-sm"
      >
        <span className="text-zinc-600 dark:text-zinc-400">
          {`${pagina.total} ${residentes}, página ${page} de ${lastPage}`}
        </span>
        <div className="flex gap-2">
          <PageLink
            href={directorioHref(busqueda, page - 1)}
            disabled={page <= 1}
          >
            Anterior
          </PageLink>
          <PageLink
            href={directorioHref(busqueda, page + 1)}
            disabled={page >= lastPage}
          >
            Siguiente
          </PageLink>
        </div>
      </nav>
    </>
  );
}

function DatosCompartidos({ vecino }: { vecino: Vecino }) {
  const datos = [
    vecino.unitCode && { label: "Unidad", value: vecino.unitCode },
    vecino.phone && {
      label: "Teléfono",
      value: vecino.phone,
      href: `tel:${vecino.phone}`,
    },
    vecino.email && {
      label: "Correo",
      value: vecino.email,
      href: `mailto:${vecino.email}`,
    },
  ].filter((dato) => !!dato);

  if (datos.length === 0) return null;

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      {datos.map((dato) => (
        <div key={dato.label} className="contents">
          <dt className="text-zinc-600 dark:text-zinc-400">{dato.label}</dt>
          <dd className="min-w-0 wrap-anywhere">
            {"href" in dato ? (
              <a href={dato.href} className="underline underline-offset-4">
                {dato.value}
              </a>
            ) : (
              dato.value
            )}
          </dd>
        </div>
      ))}
    </dl>
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
