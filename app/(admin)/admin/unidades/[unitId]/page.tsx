import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/api";
import { formatDateTime } from "@/lib/estado-cuenta";
import { fetchAdminUnit, fetchUnitStatement } from "@/lib/estado-cuenta-api";
import { getTorres, getUnidades } from "@/lib/paquetes";
import {
  readStatementParams,
  statementHref,
  StatementView,
} from "@/app/_components/estado-cuenta/statement-view";
import { UnitPicker } from "../unit-picker";
import { RegenerateCode } from "./regenerate-code";

export const metadata: Metadata = {
  title: "Unidad (administración)",
};

// H2: estado de cuenta de una unidad en solo lectura, su código de registro y
// sus residentes. Las listas de torre y unidad permiten cambiar de unidad.
export default async function UnidadAdminPage(props: PageProps<"/admin/unidades/[unitId]">) {
  const user = await requireRole("ADMINISTRADOR");
  if (!user) return null;

  const { unitId } = await props.params;
  const filters = readStatementParams(await props.searchParams);
  const [unit, statement, towers] = await Promise.all([
    fetchAdminUnit(unitId),
    fetchUnitStatement(unitId, filters),
    getTorres(),
  ]);
  if (!unit || !statement) notFound();
  const units = await getUnidades(unit.tower.id);
  const base = `/admin/unidades/${unit.id}`;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Unidad {unit.code}</h1>
        <UnitPicker towers={towers} towerId={unit.tower.id} units={units} unitId={unit.id} />
      </div>

      <section aria-labelledby="codigo" className="flex flex-col gap-3">
        <h2 id="codigo" className="text-lg font-semibold">Código de registro</h2>
        <RegenerateCode unitId={unit.id} code={unit.registrationCode} />
        <p className="text-xs text-zinc-500">
          {unit.registrationCodeUpdatedAt
            ? `Regenerado el ${formatDateTime(unit.registrationCodeUpdatedAt)}.`
            : "Código original de los datos iniciales."}
        </p>
      </section>

      <section aria-labelledby="residentes" className="flex flex-col gap-3">
        <h2 id="residentes" className="text-lg font-semibold">
          Residentes registrados ({unit.residents.length} de 4)
        </h2>
        {unit.residents.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Todavía no hay residentes registrados.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 text-sm dark:divide-zinc-800 dark:border-zinc-800">
            {unit.residents.map((resident) => (
              <li key={resident.email} className="flex flex-wrap justify-between gap-2 px-4 py-2">
                <span className="font-medium">{resident.fullName}</span>
                <span className="text-zinc-600 dark:text-zinc-400">{resident.email}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="estado" className="flex flex-col gap-3">
        <h2 id="estado" className="text-lg font-semibold">Estado de cuenta</h2>
        <StatementView
          statement={statement}
          readOnly
          filtered={Boolean(filters.year || filters.status)}
          pageHref={(page) => statementHref(base, filters, page)}
        />
      </section>
    </div>
  );
}
