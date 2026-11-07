"use client";

import { unstable_rethrow } from "next/navigation";
import { startTransition, useActionState, useRef, useState } from "react";
import {
  generarCuotas,
  previsualizarGeneracion,
  type GenerarCuotasState,
  type VistaPreviaResult,
} from "@/app/actions/cuotas";
import {
  confirmationQuestion,
  defaultConcept,
  defaultDueDate,
  lastDayOf,
  periodCompleteMessage,
  periodOptions,
  successMessage,
} from "@/lib/cuotas";
import {
  LIMITS,
  MESSAGES,
  validateGeneracion,
  type GeneracionField,
  type GeneracionValues,
} from "@/lib/validation/cuotas";

const initialState: GenerarCuotasState = {};
const ALL_TOUCHED = { period: true, amount: true, dueDate: true, concept: true };

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 aria-invalid:border-red-600 dark:border-zinc-700 dark:focus:border-zinc-100";

function trimmed(values: GeneracionValues): GeneracionValues {
  return { ...values, amount: values.amount.trim(), concept: values.concept.trim() };
}

export function GenerarCuotasForm({ today }: { today: string }) {
  const options = periodOptions(today);
  const [state, formAction, pending] = useActionState(generarCuotas, initialState);
  const [values, setValues] = useState<GeneracionValues>(() => {
    const period = options[1].value;
    return {
      period,
      amount: "",
      dueDate: defaultDueDate(period, today),
      concept: defaultConcept(period),
    };
  });
  const [conceptEdited, setConceptEdited] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<GeneracionField, boolean>>>({});
  const [editedSinceSubmit, setEditedSinceSubmit] = useState<Set<GeneracionField>>(new Set());
  const [notice, setNotice] = useState<string>();
  const [unitsToCreate, setUnitsToCreate] = useState<number>();
  const [checking, setChecking] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  const clean = trimmed(values);
  const clientErrors = validateGeneracion(clean, today);
  const hasErrors = Object.keys(clientErrors).length > 0;
  const busy = pending || checking;
  const untouchedSinceSubmit = editedSinceSubmit.size === 0;
  const formError = notice ?? (untouchedSinceSubmit ? state.formError : undefined);
  const success =
    state.result && untouchedSinceSubmit && !notice && !pending
      ? successMessage(state.result.createdCount, state.result.skippedCount)
      : undefined;

  function errorFor(field: GeneracionField) {
    const clientError = touched[field] ? clientErrors[field] : undefined;
    if (clientError) return clientError;
    return editedSinceSubmit.has(field) ? undefined : state.errors?.[field];
  }

  function markEdited(...fields: GeneracionField[]) {
    setEditedSinceSubmit((prev) => new Set([...prev, ...fields]));
    setNotice(undefined);
  }

  function touch(field: GeneracionField) {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }

  function update(field: GeneracionField, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    markEdited(field);
  }

  function changePeriod(period: string) {
    setValues((prev) => ({
      ...prev,
      period,
      dueDate: defaultDueDate(period, today),
      concept: conceptEdited ? prev.concept : defaultConcept(period),
    }));
    markEdited("period", "dueDate", "concept");
    touch("period");
  }

  async function openConfirmation() {
    setTouched(ALL_TOUCHED);
    if (hasErrors || busy) return;

    setNotice(undefined);
    setChecking(true);
    let outcome: VistaPreviaResult;
    try {
      outcome = await previsualizarGeneracion(clean.period);
    } catch (error) {
      unstable_rethrow(error);
      setNotice(MESSAGES.previewFailed);
      return;
    } finally {
      setChecking(false);
    }

    if ("error" in outcome) {
      setNotice(outcome.error);
      return;
    }
    if (outcome.preview.activeUnits === 0) {
      setNotice(MESSAGES.noActiveUnits);
      return;
    }
    if (outcome.preview.toCreate === 0) {
      setNotice(periodCompleteMessage(clean.period));
      return;
    }
    setUnitsToCreate(outcome.preview.toCreate);
    dialog.current?.showModal();
  }

  function confirmGeneration() {
    dialog.current?.close();
    const formData = new FormData();
    formData.set("period", clean.period);
    formData.set("amount", clean.amount);
    formData.set("dueDate", clean.dueDate);
    formData.set("concept", clean.concept);
    setEditedSinceSubmit(new Set());
    startTransition(() => formAction(formData));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void openConfirmation();
  }

  const describedBy = (field: GeneracionField, hint?: boolean) =>
    errorFor(field) ? `${field}-error` : hint ? `${field}-hint` : undefined;

  const firstDayOfPeriod = `${values.period}-01`;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="period" className="text-sm font-medium">
            Periodo
          </label>
          <select
            id="period"
            name="period"
            value={values.period}
            onChange={(e) => changePeriod(e.target.value)}
            aria-invalid={errorFor("period") ? true : undefined}
            aria-describedby={describedBy("period")}
            className={`${inputClass} bg-background`}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <FieldError field="period" error={errorFor("period")} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="amount" className="text-sm font-medium">
            Monto por unidad ($)
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min={LIMITS.minAmount}
            max={LIMITS.maxAmount}
            value={values.amount}
            onChange={(e) => update("amount", e.target.value)}
            onBlur={() => touch("amount")}
            placeholder="0.00"
            aria-invalid={errorFor("amount") ? true : undefined}
            aria-describedby={describedBy("amount")}
            className={`${inputClass} tabular-nums`}
          />
          <FieldError field="amount" error={errorFor("amount")} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="dueDate" className="text-sm font-medium">
            Fecha de vencimiento
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            min={today > firstDayOfPeriod ? today : firstDayOfPeriod}
            max={lastDayOf(values.period)}
            value={values.dueDate}
            onChange={(e) => update("dueDate", e.target.value)}
            onBlur={() => touch("dueDate")}
            aria-invalid={errorFor("dueDate") ? true : undefined}
            aria-describedby={describedBy("dueDate")}
            className={inputClass}
          />
          <FieldError field="dueDate" error={errorFor("dueDate")} />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="concept" className="text-sm font-medium">
              Concepto <span className="font-normal text-zinc-500">(opcional)</span>
            </label>
            <span id="concept-hint" className="text-xs text-zinc-500 tabular-nums">
              {clean.concept.length}/{LIMITS.conceptMax}
            </span>
          </div>
          <input
            id="concept"
            name="concept"
            value={values.concept}
            onChange={(e) => {
              setConceptEdited(true);
              update("concept", e.target.value);
            }}
            onBlur={() => touch("concept")}
            maxLength={LIMITS.conceptMax}
            aria-invalid={errorFor("concept") ? true : undefined}
            aria-describedby={describedBy("concept", true)}
            className={inputClass}
          />
          <FieldError field="concept" error={errorFor("concept")} />
        </div>
      </div>

      <p aria-live="polite" className="min-h-5 text-sm text-red-600">
        {formError}
      </p>

      {success ? (
        <p
          role="status"
          className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
        >
          {success}
        </p>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={hasErrors || busy}
          className="rounded-md bg-foreground px-4 py-2 font-medium text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {checking ? "Consultando..." : pending ? "Generando..." : "Generar"}
        </button>
      </div>

      <dialog
        ref={dialog}
        aria-labelledby="confirmar-generacion"
        className="m-auto max-w-md rounded-lg border border-zinc-200 bg-background p-6 text-foreground shadow-lg backdrop:bg-black/40 dark:border-zinc-800"
      >
        <p id="confirmar-generacion" className="font-medium">
          {unitsToCreate === undefined
            ? null
            : confirmationQuestion(Number(clean.amount), unitsToCreate, clean.period)}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmGeneration}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Continuar
          </button>
        </div>
      </dialog>
    </form>
  );
}

function FieldError({ field, error }: { field: GeneracionField; error?: string }) {
  if (!error) return null;
  return (
    <p id={`${field}-error`} className="text-sm text-red-600">
      {error}
    </p>
  );
}
