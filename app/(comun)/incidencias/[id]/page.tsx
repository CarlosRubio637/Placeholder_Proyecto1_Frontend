import type { Metadata } from "next";
import Link from "next/link";
import { requireAnyRole } from "@/lib/api";
import { fetchIncident, fetchStaff } from "@/lib/incidencias-api";
import { describeEvent, formatDateTime, locationLabel } from "@/lib/incidencias";
import { PriorityBadge, StatusBadge } from "@/app/_components/incidencias/badges";
import { PhotoGallery } from "@/app/_components/incidencias/photo-gallery";
import { RefreshButton } from "@/app/_components/incidencias/refresh-button";
import { GestionPanel } from "./gestion-panel";

export const metadata: Metadata = {
  title: "Detalle de incidencia",
};

const NUMBER_REGEX = /^INC-\d{4}-\d{5}$/;

// H11: detalle de una incidencia de la unidad, con fotos, responsable e
// historial. H10 redirige aquí con ?registrada=<número> después de registrar.
// H12: el Administrador entra a la misma pantalla y ve el panel "Gestión".
export default async function DetalleIncidenciaPage(props: PageProps<"/incidencias/[id]">) {
  const user = await requireAnyRole(["RESIDENTE", "ADMINISTRADOR"]);
  if (!user) return null;
  const isAdmin = user.role === "ADMINISTRADOR";
  const back = isAdmin
    ? { href: "/admin/incidencias", label: "Incidencias" }
    : { href: "/incidencias", label: "Mis incidencias" };

  const { id } = await props.params;
  const { registrada } = await props.searchParams;
  const [incident, staff] = await Promise.all([
    fetchIncident(id),
    isAdmin ? fetchStaff() : Promise.resolve([]),
  ]);

  if (!incident) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-lg font-medium">La incidencia no existe.</p>
        <Link href={back.href} className="underline underline-offset-4">
          Volver a {back.label}
        </Link>
      </div>
    );
  }

  const justCreated =
    typeof registrada === "string" && NUMBER_REGEX.test(registrada) && registrada === incident.number;

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      {justCreated ? (
        <p
          role="status"
          className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
        >
          Incidencia {incident.number} registrada
        </p>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link href={back.href} className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400">
            ← {back.label}
          </Link>
          <p className="text-sm tabular-nums text-zinc-500">{incident.number}</p>
          <h1 className="text-2xl font-semibold">{incident.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={incident.status} />
            <PriorityBadge priority={incident.priority} />
          </div>
        </div>
        <RefreshButton />
      </div>

      <dl className="grid gap-x-6 gap-y-3 rounded-lg border border-zinc-200 p-4 text-sm sm:grid-cols-2 dark:border-zinc-800">
        <Item label="Unidad">{incident.unit.code}</Item>
        <Item label="Ubicación">
          {locationLabel(incident.location)}
          {incident.locationDetail ? (
            <span className="text-zinc-600 dark:text-zinc-400"> · {incident.locationDetail}</span>
          ) : null}
        </Item>
        <Item label="Creada">{formatDateTime(incident.createdAt)}</Item>
        <Item label="Responsable">
          {incident.assignee ? (
            <>
              {incident.assignee.name}{" "}
              <span className="text-zinc-600 dark:text-zinc-400">· {incident.assignee.specialty}</span>
            </>
          ) : (
            <span className="text-zinc-600 dark:text-zinc-400">Sin asignar</span>
          )}
        </Item>
        {incident.resolvedAt ? <Item label="Resuelta">{formatDateTime(incident.resolvedAt)}</Item> : null}
        <div className="sm:col-span-2">
          <dt className="text-zinc-500">Descripción</dt>
          <dd className="mt-0.5 whitespace-pre-line">{incident.description}</dd>
        </div>
      </dl>

      {isAdmin ? (
        <GestionPanel
          incidentId={incident.id}
          priority={incident.priority}
          assigneeId={incident.assignee?.id ?? null}
          resolved={incident.status === "RESUELTO"}
          staff={staff}
        />
      ) : null}

      {incident.photos.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Fotografías</h2>
          <PhotoGallery photos={incident.photos} title={incident.title} />
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Historial</h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3">Fecha y hora</th>
                <th className="px-4 py-3">Cambio</th>
                <th className="px-4 py-3">Observación</th>
                <th className="px-4 py-3">Autor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {incident.events.map((event) => (
                <tr key={event.id} className="align-top">
                  <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                    {formatDateTime(event.createdAt)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{describeEvent(event)}</td>
                  <td className="px-4 py-3">{event.note ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{event.authorLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-zinc-500">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
