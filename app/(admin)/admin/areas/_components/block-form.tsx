"use client";

import { useActionState, useState } from "react";
import { registrarBloqueo, type BlockFormState } from "@/app/actions/areas";
import { validateBlock, type BlockField, type BlockValues } from "@/lib/validation/area";
import { ConfirmCancellations } from "./confirm-cancellations";

const initialState: BlockFormState = {};

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 aria-invalid:border-red-600 dark:border-zinc-700 dark:focus:border-zinc-100";

// H9: bloquear un área por mantenimiento en un rango de fechas.
export function BlockForm({ areaId, today }: { areaId: string; today: string }) {
  const empty: BlockValues = { startDate: today, endDate: today, reason: "" };
  const [state, formAction, pending] = useActionState(
    async (prev: BlockFormState, formData: FormData) => {
      const next = await registrarBloqueo(prev, formData);
      if (next.success) {
        setValues(empty);
        setTouched({});
      }
      return next;
    },
    initialState,
  );
  const [values, setValues] = useState<BlockValues>(empty);
  const [touched, setTouched] = useState<Partial<Record<BlockField, boolean>>>({});
  const [staleState, setStaleState] = useState<BlockFormState | null>(null);

  const clientErrors = validateBlock({ ...values, reason: values.reason.trim() }, today);
  const hasErrors = Object.keys(clientErrors).length > 0;
  const serverState = staleState === state ? initialState : state;

  function errorFor(field: BlockField) {
    return (touched[field] ? clientErrors[field] : undefined) ?? serverState.errors?.[field];
  }

  function update(field: BlockField, value: string) {
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      // El fin sigue al inicio mientras quede antes de él.
      if (field === "startDate" && next.endDate < value) next.endDate = value;
      return next;
    });
    setTouched((prev) => ({ ...prev, [field]: true }));
    setStaleState(state);
  }

  function input(field: BlockField, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) {
    const error = errorFor(field);
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={`block-${field}`} className="text-sm font-medium">{label}</label>
        <input
          id={`block-${field}`}
          name={field}
          value={values[field]}
          onChange={(e) => update(field, e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `block-${field}-error` : undefined}
          className={inputClass}
          {...props}
        />
        {error ? <p id={`block-${field}-error`} className="text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <form
      action={formAction}
      noValidate
      onSubmit={() => setTouched({ startDate: true, endDate: true, reason: true })}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="areaId" value={areaId} />
      <div className="grid gap-4 sm:grid-cols-2">
        {input("startDate", "Inicio del bloqueo", { type: "date", min: today })}
        {input("endDate", "Fin del bloqueo", { type: "date", min: values.startDate || today })}
      </div>
      {input("reason", "Motivo", { maxLength: 200, placeholder: "Mantenimiento de la bomba" })}

      {serverState.confirmCount !== undefined ? (
        <ConfirmCancellations count={serverState.confirmCount} pending={pending} onCancel={() => setStaleState(state)} />
      ) : null}

      {serverState.success ? (
        <p role="status" className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
          {serverState.success}
        </p>
      ) : null}
      <p aria-live="polite" className="min-h-5 text-sm text-red-600">{serverState.formError}</p>

      <div>
        <button
          type="submit"
          disabled={pending || hasErrors || serverState.confirmCount !== undefined}
          className="rounded-md bg-foreground px-4 py-2 font-medium text-background transition-opacity disabled:opacity-60"
        >
          {pending ? "Bloqueando..." : "Bloquear"}
        </button>
      </div>
    </form>
  );
}
