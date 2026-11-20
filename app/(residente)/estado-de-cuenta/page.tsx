import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/api";
import { fetchMyStatement } from "@/lib/estado-cuenta-api";
import {
  readStatementParams,
  statementHref,
  StatementView,
} from "@/app/_components/estado-cuenta/statement-view";

export const metadata: Metadata = {
  title: "Estado de cuenta",
};

// H2: estado de cuenta de la unidad del residente. Filtros y página van en la
// URL (?anio=&estado=&page=). Se vuelve a consultar al regresar de un pago.
export default async function EstadoDeCuentaPage(props: PageProps<"/estado-de-cuenta">) {
  const user = await requireRole("RESIDENTE");
  if (!user) return null;

  const filters = readStatementParams(await props.searchParams);
  const statement = await fetchMyStatement(filters);
  // Página fuera de rango (por ejemplo, un enlace viejo): a la última que existe.
  const lastPage = Math.max(1, Math.ceil(statement.total / statement.pageSize));
  if (statement.total > 0 && filters.page > lastPage) {
    redirect(statementHref("/estado-de-cuenta", filters, lastPage));
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Estado de cuenta</h1>
      <StatementView
        statement={statement}
        readOnly={false}
        filtered={Boolean(filters.year || filters.status)}
        pageHref={(page) => statementHref("/estado-de-cuenta", filters, page)}
      />
    </div>
  );
}
