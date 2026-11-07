import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/api";
import { formatDate } from "@/lib/areas";
import { availabilityPath, slotEnd } from "@/lib/reservas";
import { fetchArea } from "@/lib/reservas-api";
import { ConfirmarReservaForm } from "./confirmar-form";

export const metadata: Metadata = {
  title: "Confirmar reserva",
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// H7: el residente confirma la franja que eligió en la disponibilidad (H6).
// Ruta: /reservas/:areaId/confirmar?fecha=AAAA-MM-DD&inicio=HH:mm
export default async function ConfirmarReservaPage(
  props: PageProps<"/reservas/[areaId]/confirmar">,
) {
  const user = await requireRole("RESIDENTE");
  if (!user) return null;

  const { areaId } = await props.params;
  const query = await props.searchParams;
  const date = typeof query.fecha === "string" ? query.fecha : "";
  const startTime = typeof query.inicio === "string" ? query.inicio : "";

  const area = await fetchArea(areaId);
  const endTime = area ? slotEnd(area, startTime) : null;
  const back = availabilityPath(areaId, DATE_ONLY.test(date) ? date : undefined);

  if (!area || !endTime || !DATE_ONLY.test(date)) {
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <h1 className="text-2xl font-semibold">Confirmar reserva</h1>
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
          {area
            ? "La franja elegida no es válida. Vuelve a la disponibilidad y elige otra."
            : "El área no existe o no está habilitada."}
        </p>
        <Link href={area ? back : "/reservas"} className="text-sm underline underline-offset-4">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Confirmar reserva</h1>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <dt className="text-zinc-600 dark:text-zinc-400">Área</dt>
        <dd className="font-medium">{area.name}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Fecha</dt>
        <dd className="font-medium tabular-nums">{formatDate(date)}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Franja</dt>
        <dd className="font-medium tabular-nums">
          {startTime} a {endTime}
        </dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Aforo</dt>
        <dd className="font-medium">{area.capacity} personas</dd>
      </dl>

      <ConfirmarReservaForm
        area={{ id: area.id, capacity: area.capacity, rules: area.rules }}
        date={date}
        startTime={startTime}
        backHref={back}
      />
    </div>
  );
}
