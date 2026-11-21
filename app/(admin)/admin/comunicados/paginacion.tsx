import Link from "next/link";
import { lastPageOf } from "@/lib/comunicados-admin";

type PaginacionProps = {
  total: number;
  page: number;
  pageSize: number;
  noun: [singular: string, plural: string];
  href: (page: number) => string;
};

export function Paginacion({
  total,
  page,
  pageSize,
  noun,
  href,
}: PaginacionProps) {
  const lastPage = lastPageOf(total, pageSize);
  const label = total === 1 ? noun[0] : noun[1];

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <span className="text-zinc-600 dark:text-zinc-400">
        {`${total} ${label}, página ${page} de ${lastPage}`}
      </span>
      <div className="flex gap-2">
        <PageLink href={href(page - 1)} disabled={page <= 1}>
          Anterior
        </PageLink>
        <PageLink href={href(page + 1)} disabled={page >= lastPage}>
          Siguiente
        </PageLink>
      </div>
    </nav>
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
