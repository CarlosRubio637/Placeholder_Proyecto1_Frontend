import Link from "next/link";
import { formatMonto, formatPorcentaje } from "@/lib/morosidad";
import type { Resumen } from "@/lib/resumen";

const cardClass =
  "flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950";
const labelClass = "text-sm text-zinc-600 dark:text-zinc-400";
const valueClass = "text-3xl font-semibold tabular-nums";
const linkClass = "mt-auto text-sm font-medium underline underline-offset-4";

const SIN_DATOS = "Sin datos";

function Tarjeta({
  titulo,
  periodo,
  href,
  children,
}: {
  titulo: string;
  periodo: string;
  href: string;
  children: React.ReactNode;
}) {
  // "/admin/reportes/morosidad" → "tarjeta-morosidad".
  const id = `tarjeta-${href.split("/").pop()}`;
  return (
    <section aria-labelledby={id} className={cardClass}>
      <header>
        <h2 id={id} className="text-lg font-semibold">
          {titulo}
        </h2>
        <p className="text-xs text-zinc-500">{periodo}</p>
      </header>
      {children}
      <Link href={href} className={linkClass}>
        Ver reporte
      </Link>
    </section>
  );
}

function Cifra({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className={labelClass}>{label}</p>
      <p className={valueClass}>{value}</p>
    </div>
  );
}

function SinDatos() {
  return <p className="text-sm text-zinc-600 dark:text-zinc-400">{SIN_DATOS}</p>;
}

// Las cuatro tarjetas del resumen (H37), cada una con su enlace al reporte
// completo (H32 a H35). Una tarjeta sin datos muestra "Sin datos".
export function Tarjetas({ resumen }: { resumen: Resumen }) {
  const { debt, areas, incidents, voting } = resumen;
  const areasSinDatos = areas.avgOccupancyPct === null && areas.mostUsed === null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Tarjeta titulo="Morosidad" periodo="Últimos 12 meses" href="/admin/reportes/morosidad">
        <Cifra label="Monto adeudado" value={formatMonto(debt.owedAmount)} />
        <Cifra
          label="Porcentaje de unidades morosas"
          value={formatPorcentaje(debt.overduePct)}
        />
      </Tarjeta>

      <Tarjeta titulo="Áreas comunes" periodo="Mes actual" href="/admin/reportes/areas">
        {areasSinDatos ? (
          <SinDatos />
        ) : (
          <>
            <Cifra
              label="Ocupación promedio"
              value={
                areas.avgOccupancyPct === null ? SIN_DATOS : formatPorcentaje(areas.avgOccupancyPct)
              }
            />
            <Cifra label="Área más usada" value={areas.mostUsed?.name ?? SIN_DATOS} />
          </>
        )}
      </Tarjeta>

      <Tarjeta titulo="Incidencias" periodo="Abiertas hoy" href="/admin/reportes/incidencias">
        <Cifra label="Abiertas" value={incidents.openTotal} />
        <Cifra label="Abiertas con más de 7 días" value={incidents.staleCount} />
      </Tarjeta>

      <Tarjeta
        titulo="Votaciones"
        periodo="Última asamblea cerrada"
        href="/admin/reportes/participacion"
      >
        {voting ? (
          <>
            <Cifra
              label="Participación promedio"
              value={formatPorcentaje(voting.avgParticipationPct)}
            />
            <p className={labelClass}>{voting.assemblyTitle}</p>
          </>
        ) : (
          <SinDatos />
        )}
      </Tarjeta>
    </div>
  );
}
