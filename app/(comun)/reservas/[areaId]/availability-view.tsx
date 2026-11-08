"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  availabilityPath,
  confirmationPath,
  type AvailabilitySlot,
  type SlotStatus,
} from "@/lib/reservas";

const REFRESH_MS = 30_000;

const STYLES: Record<SlotStatus, string> = {
  DISPONIBLE: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
  RESERVADO: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100",
  MANTENIMIENTO: "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
  PASADO: "border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500",
};

const LABELS: Record<SlotStatus, string> = {
  DISPONIBLE: "Disponible",
  RESERVADO: "Reservado",
  MANTENIMIENTO: "Mantenimiento",
  PASADO: "Pasado",
};

type Props = {
  areaId: string;
  date: string;
  min: string;
  max: string;
  slots: AvailabilitySlot[];
  error?: string;
  canReserve: boolean;
};

// H6: selector de fecha y franjas. Los datos vienen del servidor; se vuelven a
// pedir cada 30 segundos y con Actualizar. El temporizador se detiene al salir.
export function AvailabilityView({ areaId, date, min, max, slots, error, canReserve }: Props) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [changing, startChange] = useTransition();
  const [value, setValue] = useState(date);
  const [syncedDate, setSyncedDate] = useState(date);

  // La fecha también cambia con los botones atrás y adelante del navegador.
  if (date !== syncedDate) {
    setSyncedDate(date);
    setValue(date);
  }

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);

  function changeDate(next: string) {
    setValue(next);
    // Un campo a medio escribir llega vacío o fuera de rango: no se consulta.
    if (next && next >= min && next <= max) {
      startChange(() => router.replace(availabilityPath(areaId, next)));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="fecha" className="text-sm font-medium">Fecha</label>
          <input
            id="fecha"
            type="date"
            min={min}
            max={max}
            value={value}
            onChange={(e) => changeDate(e.target.value)}
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
          />
        </div>
        <button
          type="button"
          disabled={refreshing}
          onClick={() => startRefresh(() => router.refresh())}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium disabled:opacity-60 dark:border-zinc-700"
        >
          {refreshing ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600">{error}</p>
      ) : (
        <ul aria-busy={changing} className={`grid gap-2 sm:grid-cols-2 ${changing ? "opacity-60" : ""}`}>
          {slots.map((slot) => {
            const label =
              slot.status === "RESERVADO" && slot.ownReservationId
                ? "Reservado por tu unidad"
                : LABELS[slot.status];
            const content = (
              <>
                <span className="font-medium tabular-nums">
                  {slot.startTime} a {slot.endTime}
                </span>
                <span className="text-sm">{label}</span>
              </>
            );
            const className = `flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${STYLES[slot.status]}`;
            return (
              <li key={slot.startTime}>
                {slot.status === "DISPONIBLE" && canReserve ? (
                  <Link
                    href={confirmationPath(areaId, date, slot.startTime)}
                    className={`${className} underline-offset-4 hover:underline`}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className={className}>{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
