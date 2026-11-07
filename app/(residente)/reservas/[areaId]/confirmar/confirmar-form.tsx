"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { reservar, type ReservaFormState } from "@/app/actions/reservas";
import { formatDate } from "@/lib/areas";
import {
  RESERVA_MESSAGES,
  STATUS_LABEL,
  validateReserva,
  type ReservaField,
  type Reservation,
} from "@/lib/reservas";

const initialState: ReservaFormState = {};

type Props = {
  area: { id: string; capacity: number; rules: string | null };
  date: string;
  startTime: string;
  backHref: string;
};

// H7: número de personas, aceptación de reglas y comprobante.
export function ConfirmarReservaForm({ area, date, startTime, backHref }: Props) {
  const [state, formAction, pending] = useActionState(reservar, initialState);
  const [attendees, setAttendees] = useState("1");
  const [acceptRules, setAcceptRules] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<ReservaField, boolean>>>({});
  const [staleState, setStaleState] = useState<ReservaFormState | null>(null);

  if (state.reservation) {
    return <Comprobante reservation={state.reservation} />;
  }

  const clientErrors = validateReserva({ attendees, acceptRules }, area.capacity);
  const hasErrors = Object.keys(clientErrors).length > 0;
  // Los errores del servidor se ocultan al editar el campo.
  const serverState = staleState === state ? initialState : state;

  function errorFor(field: ReservaField) {
    return (touched[field] ? clientErrors[field] : undefined) ?? serverState.errors?.[field];
  }
  function touch(field: ReservaField) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setStaleState(state);
  }

  if (state.slotTaken) {
    return (
      <div className="flex flex-col gap-3">
        <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          {RESERVA_MESSAGES.slotTaken}
        </p>
        <Link href={backHref} className="self-start rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">
          Volver a la disponibilidad
        </Link>
      </div>
    );
  }

  const attendeesError = errorFor("attendees");
  const rulesError = errorFor("acceptRules");

  return (
    <form
      action={formAction}
      noValidate
      onSubmit={() => setTouched({ attendees: true, acceptRules: true })}
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="areaId" value={area.id} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="startTime" value={startTime} />
      <input type="hidden" name="capacity" value={area.capacity} />

      <div className="flex flex-col gap-1">
        <label htmlFor="attendees" className="text-sm font-medium">
          Número de personas
        </label>
        <input
          id="attendees"
          name="attendees"
          type="number"
          inputMode="numeric"
          min={1}
          max={area.capacity}
          step={1}
          value={attendees}
          onChange={(e) => {
            setAttendees(e.target.value);
            touch("attendees");
          }}
          aria-invalid={attendeesError ? true : undefined}
          aria-describedby={attendeesError ? "attendees-error" : undefined}
          className="w-32 rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 aria-invalid:border-red-600 dark:border-zinc-700 dark:focus:border-zinc-100"
        />
        {attendeesError ? (
          <p id="attendees-error" className="text-sm text-red-600">{attendeesError}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Reglas de uso</p>
        <p className="whitespace-pre-line rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {area.rules ?? "Esta área no tiene reglas adicionales."}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="acceptRules"
            checked={acceptRules}
            onChange={(e) => {
              setAcceptRules(e.target.checked);
              touch("acceptRules");
            }}
            aria-invalid={rulesError ? true : undefined}
            aria-describedby={rulesError ? "rules-error" : undefined}
            className="size-4"
          />
          Acepto las reglas de uso
        </label>
        {rulesError ? <p id="rules-error" className="text-sm text-red-600">{rulesError}</p> : null}
      </div>

      <p aria-live="polite" className="min-h-5 text-sm text-red-600">{serverState.formError}</p>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending || hasErrors}
          className="rounded-md bg-foreground px-4 py-2 font-medium text-background transition-opacity disabled:opacity-60"
        >
          {pending ? "Confirmando..." : "Confirmar reserva"}
        </button>
        <Link href={backHref} className="text-sm underline underline-offset-4">
          Volver
        </Link>
      </div>
    </form>
  );
}

function Comprobante({ reservation }: { reservation: Reservation }) {
  return (
    <section aria-labelledby="comprobante" className="flex flex-col gap-4">
      <p role="status" className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
        {RESERVA_MESSAGES.success}
      </p>
      <h2 id="comprobante" className="text-lg font-semibold">Comprobante</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <dt className="text-zinc-600 dark:text-zinc-400">Número de reserva</dt>
        <dd className="font-mono font-medium">{reservation.code}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Área</dt>
        <dd className="font-medium">{reservation.area.name}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Fecha</dt>
        <dd className="font-medium tabular-nums">{formatDate(reservation.date)}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Franja</dt>
        <dd className="font-medium tabular-nums">
          {reservation.startTime} a {reservation.endTime}
        </dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Personas</dt>
        <dd className="font-medium">{reservation.attendees}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Estado</dt>
        <dd className="font-medium">{STATUS_LABEL[reservation.status]}</dd>
      </dl>
      <Link href="/" className="self-start text-sm underline underline-offset-4">
        Ir al inicio
      </Link>
    </section>
  );
}
