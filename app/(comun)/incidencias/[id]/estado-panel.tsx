"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { cambiarEstado, type CambiarEstadoState } from "@/app/actions/incidencias-admin";
import {
  ESTADO_MESSAGES,
  NOTE_LIMITS,
  STATUS_LABELS,
  TRANSITIONS,
  validateNote,
  type IncidentStatus,
} from "@/lib/incidencias";

type Props = {
  incidentId: string;
  number: string;
  status: IncidentStatus;
  hasAssignee: boolean;
};

const initialState: CambiarEstadoState = {};
const secondaryButtonClass = "rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium dark:border-zinc-700";

// Panel "Estado" del detalle (H13), solo para el Administrador: el único
// cambio permitido desde el estado actual, con su observación y confirmación.
export function EstadoPanel({ incidentId, number, status, hasAssignee }: Props) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(cambiarEstado, initialState);
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [shown, setShown] = useState<CambiarEstadoState | null>(null);

  const transition = TRANSITIONS[status];
  const noteError = validateNote(note);

  // Si el estado cambia (por este cambio o por Actualizar), se limpia el formulario.
  const [syncedStatus, setSyncedStatus] = useState(status);
  if (syncedStatus !== status) {
    setSyncedStatus(status);
    setNote("");
    setTouched(false);
  }

  const handled = useRef<CambiarEstadoState>(initialState);
  useEffect(() => {
    if (state === handled.current) return;
    handled.current = state;
    setShown(state);
    if (state.ok) router.refresh();
  }, [state, router]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (noteError || pending) return;
    dialog.current?.showModal();
  }

  function confirm() {
    dialog.current?.close();
    setShown(null);
    startTransition(() =>
      formAction({ id: incidentId, toStatus: transition.to, expectedStatus: status, note }),
    );
  }

  const visibleNoteError = shown?.noteError ?? (touched ? noteError : undefined);
  const needsAssignee = transition.to === "EN_PROCESO" && !hasAssignee;

  return (
    <section aria-labelledby="estado-titulo" className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="estado-titulo" className="text-lg font-semibold">
          Estado
        </h2>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {STATUS_LABELS[status]} → {STATUS_LABELS[transition.to]}
        </span>
      </div>

      {needsAssignee ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Asigna un responsable antes de iniciar la atención.
        </p>
      ) : null}

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="estado-nota" className="text-sm font-medium">
              {transition.noteLabel}
            </label>
            <span className="text-xs tabular-nums text-zinc-500">
              {note.trim().length}/{NOTE_LIMITS.max}
            </span>
          </div>
          <textarea
            id="estado-nota"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => setTouched(note.length > 0)}
            maxLength={NOTE_LIMITS.max + 50}
            disabled={pending}
            aria-invalid={visibleNoteError ? true : undefined}
            aria-describedby={visibleNoteError ? "estado-nota-error" : undefined}
            className="w-full resize-y rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 aria-invalid:border-red-600 dark:border-zinc-700 dark:focus:border-zinc-100"
          />
          {visibleNoteError ? (
            <p id="estado-nota-error" className="text-sm text-red-600">
              {visibleNoteError}
            </p>
          ) : null}
        </div>

        {shown?.ok ? (
          <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
            {shown.ok}
          </p>
        ) : null}
        {shown?.error ? (
          <p role="alert" className="text-sm text-red-600">
            {shown.error}
          </p>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={Boolean(noteError) || pending}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Guardando…" : transition.action}
          </button>
        </div>
      </form>

      <dialog
        ref={dialog}
        aria-labelledby="estado-confirmar"
        className="m-auto w-full max-w-sm rounded-xl border border-zinc-200 bg-background p-6 text-foreground backdrop:bg-black/50 dark:border-zinc-800"
      >
        <p id="estado-confirmar" className="font-medium">
          {ESTADO_MESSAGES.confirm(number, transition.to)}
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={() => dialog.current?.close()} className={secondaryButtonClass}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Confirmar
          </button>
        </div>
      </dialog>
    </section>
  );
}
