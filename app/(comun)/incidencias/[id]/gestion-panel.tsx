"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { guardarGestion, type GestionInput, type GestionState } from "@/app/actions/incidencias-admin";
import {
  GESTION_MESSAGES,
  PRIORITIES,
  PRIORITY_LABELS,
  type IncidentPriority,
  type MaintenanceStaff,
} from "@/lib/incidencias";

type Props = {
  incidentId: string;
  priority: IncidentPriority;
  /** Id del responsable actual, o null. */
  assigneeId: string | null;
  resolved: boolean;
  staff: MaintenanceStaff[];
};

const initialState: GestionState = {};

// Orden de los botones de opción: Baja, Media, Alta (como en la card).
const PRIORITY_OPTIONS = [...PRIORITIES].reverse();

// Panel "Gestión" del detalle (H12), solo para el Administrador: prioridad y
// responsable. Guardar se habilita cuando algo cambió.
export function GestionPanel({ incidentId, priority, assigneeId, resolved, staff }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(guardarGestion, initialState);
  const [draftPriority, setDraftPriority] = useState(priority);
  const [draftAssignee, setDraftAssignee] = useState(assigneeId ?? "");
  const [shown, setShown] = useState<GestionState | null>(null);

  // Si el servidor trae otros valores (Actualizar, otro administrador), se
  // toman como punto de partida.
  const [synced, setSynced] = useState({ priority, assigneeId });
  if (synced.priority !== priority || synced.assigneeId !== assigneeId) {
    setSynced({ priority, assigneeId });
    setDraftPriority(priority);
    setDraftAssignee(assigneeId ?? "");
  }

  const handled = useRef<GestionState>(initialState);
  useEffect(() => {
    if (state === handled.current) return;
    handled.current = state;
    setShown(state);
    if (state.ok) router.refresh();
  }, [state, router]);

  const priorityChanged = draftPriority !== priority;
  const assigneeChanged = draftAssignee !== (assigneeId ?? "");
  const changed = priorityChanged || assigneeChanged;
  // Un responsable que se desactivó sigue asignado, pero ya no sale en el catálogo.
  const currentMissing = assigneeId !== null && !staff.some((item) => item.id === assigneeId);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!changed || pending || resolved) return;
    const input: GestionInput = { id: incidentId };
    if (priorityChanged) input.priority = draftPriority;
    if (assigneeChanged) input.assigneeId = draftAssignee || null;
    setShown(null);
    startTransition(() => formAction(input));
  }

  return (
    <section aria-labelledby="gestion-titulo" className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 id="gestion-titulo" className="text-lg font-semibold">
        Gestión
      </h2>

      {resolved ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{GESTION_MESSAGES.resolved}</p>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <fieldset disabled={resolved || pending} className="flex flex-col gap-2 disabled:opacity-60">
          <legend className="text-sm font-medium">Prioridad</legend>
          <div className="flex flex-wrap gap-4">
            {PRIORITY_OPTIONS.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="priority"
                  value={option}
                  checked={draftPriority === option}
                  onChange={() => setDraftPriority(option)}
                />
                {PRIORITY_LABELS[option]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1">
          <label htmlFor="assigneeId" className="text-sm font-medium">
            Responsable
          </label>
          <select
            id="assigneeId"
            value={draftAssignee}
            onChange={(e) => setDraftAssignee(e.target.value)}
            disabled={resolved || pending}
            aria-invalid={shown?.field === "assigneeId" ? true : undefined}
            aria-describedby={shown?.field === "assigneeId" ? "assigneeId-error" : undefined}
            className="w-full max-w-sm rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm aria-invalid:border-red-600 disabled:opacity-60 dark:border-zinc-700"
          >
            <option value="">Sin asignar</option>
            {currentMissing ? (
              <option value={assigneeId ?? ""} disabled>
                Responsable actual (inactivo)
              </option>
            ) : null}
            {staff.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.specialty}
              </option>
            ))}
          </select>
          {shown?.field === "assigneeId" && shown.error ? (
            <p id="assigneeId-error" className="text-sm text-red-600">
              {shown.error}
            </p>
          ) : null}
        </div>

        {shown?.ok ? (
          <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
            {shown.ok}
          </p>
        ) : null}
        {shown?.error && shown.field !== "assigneeId" ? (
          <p role="alert" className="text-sm text-red-600">
            {shown.error}
          </p>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={!changed || pending || resolved}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </section>
  );
}
