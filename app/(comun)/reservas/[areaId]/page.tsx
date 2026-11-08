import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAnyRole } from "@/lib/api";
import { todaySV } from "@/lib/areas";
import { addDaysIso, RESERVA_MESSAGES } from "@/lib/reservas";
import { fetchArea, fetchAvailability } from "@/lib/reservas-api";
import { AvailabilityView } from "./availability-view";

export const metadata: Metadata = {
  title: "Disponibilidad",
};

const MAX_DAYS_AHEAD = 30;

// H6: franjas de un área en una fecha. Ruta: /reservas/:areaId?fecha=AAAA-MM-DD
export default async function DisponibilidadPage(props: PageProps<"/reservas/[areaId]">) {
  const user = await requireAnyRole(["RESIDENTE", "ADMINISTRADOR"]);
  if (!user) return null;

  const { areaId } = await props.params;
  const query = await props.searchParams;
  const today = todaySV();
  const date = typeof query.fecha === "string" && query.fecha ? query.fecha : today;

  const area = await fetchArea(areaId);
  if (!area) notFound();

  const result = await fetchAvailability(area.id, date);
  if (result.notFound) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/reservas" className="text-sm underline underline-offset-4">
          Áreas comunes
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Disponibilidad: {area.name}</h1>
        <p className="mt-1 text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
          Aforo máximo: {area.capacity} personas · {area.openTime} a {area.closeTime}
        </p>
      </div>

      {query.aviso === "franja-ocupada" ? (
        <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          {RESERVA_MESSAGES.slotTaken}
        </p>
      ) : null}

      <AvailabilityView
        areaId={area.id}
        date={date}
        min={today}
        max={addDaysIso(today, MAX_DAYS_AHEAD)}
        slots={result.slots}
        error={result.error}
        canReserve={user.role === "RESIDENTE"}
      />
    </div>
  );
}
