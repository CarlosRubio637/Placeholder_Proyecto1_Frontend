"use client";

import { unstable_rethrow } from "next/navigation";
import { startTransition, useActionState, useRef, useState } from "react";
import {
  contarAudiencia,
  publicarComunicado,
  type AudienciaResult,
  type PublicarState,
} from "@/app/actions/comunicados";
import {
  CATEGORY_OPTIONS,
  DEFAULT_CATEGORY,
  audienceLabel,
  confirmationQuestion,
  defaultExpiry,
  expiryBounds,
  type Categoria,
} from "@/lib/comunicados";
import type { Torre } from "@/lib/paquetes";
import {
  LIMITS,
  MESSAGES,
  validateComunicado,
  type ComunicadoField,
  type ComunicadoValues,
} from "@/lib/validation/comunicados";

const initialState: PublicarState = {};
const ALL_TOUCHED = { title: true, body: true, category: true, towerIds: true, expiresOn: true };

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 aria-invalid:border-red-600 dark:border-zinc-700 dark:focus:border-zinc-100";

export function ComunicadoForm({ today, towers }: { today: string; towers: Torre[] }) {
  const bounds = expiryBounds(today);
  const [state, formAction, pending] = useActionState(publicarComunicado, initialState);
  const [values, setValues] = useState<ComunicadoValues>({
    title: "",
    body: "",
    category: DEFAULT_CATEGORY,
    allTowers: true,
    towerIds: [],
    expiresOn: defaultExpiry(today),
  });
  const [touched, setTouched] = useState<Partial<Record<ComunicadoField, boolean>>>({});
  const [editedSinceSubmit, setEditedSinceSubmit] = useState<Set<ComunicadoField>>(new Set());
  const [notice, setNotice] = useState<string>();
  const [question, setQuestion] = useState<string>();
  const [confirmedValues, setConfirmedValues] = useState<ComunicadoValues>();
  const [dismissedState, setDismissedState] = useState<PublicarState>();
  const [checking, setChecking] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  const clientErrors = validateComunicado(values, today);
  const hasErrors = Object.keys(clientErrors).length > 0;
  const busy = pending || checking;
  const serverState = state === dismissedState ? initialState : state;
  const formError = notice ?? (editedSinceSubmit.size === 0 ? serverState.formError : undefined);

  function errorFor(field: ComunicadoField) {
    const clientError = touched[field] ? clientErrors[field] : undefined;
    if (clientError) return clientError;
    return editedSinceSubmit.has(field) ? undefined : serverState.errors?.[field];
  }

  function touch(field: ComunicadoField) {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }

  function update(field: ComunicadoField, patch: Partial<ComunicadoValues>) {
    setValues((prev) => ({ ...prev, ...patch }));
    setEditedSinceSubmit((prev) => new Set([...prev, field]));
    setNotice(undefined);
  }

  function toggleTower(towerId: string, checked: boolean) {
    const towerIds = checked
      ? [...values.towerIds, towerId]
      : values.towerIds.filter((id) => id !== towerId);
    update("towerIds", { towerIds });
    touch("towerIds");
  }

  async function openConfirmation() {
    setTouched(ALL_TOUCHED);
    if (hasErrors || busy) return;

    const snapshot = values;
    setNotice(undefined);
    setChecking(true);
    let outcome: AudienciaResult;
    try {
      outcome = await contarAudiencia(snapshot.allTowers ? [] : snapshot.towerIds);
    } catch (error) {
      unstable_rethrow(error);
      setNotice(MESSAGES.audienceFailed);
      return;
    } finally {
      setChecking(false);
    }

    if ("error" in outcome) {
      setNotice(outcome.error);
      return;
    }
    const selectedTowers = towers.filter((tower) => snapshot.towerIds.includes(tower.id));
    const label = audienceLabel(snapshot.allTowers ? null : selectedTowers);
    setQuestion(confirmationQuestion(outcome.recipientCount, label));
    setConfirmedValues(snapshot);
    dialog.current?.showModal();
  }

  function confirmPublication() {
    dialog.current?.close();
    if (!confirmedValues) return;
    const formData = new FormData();
    formData.set("title", confirmedValues.title);
    formData.set("body", confirmedValues.body);
    formData.set("category", confirmedValues.category);
    formData.set("expiresOn", confirmedValues.expiresOn);
    if (confirmedValues.allTowers) {
      formData.set("allTowers", "on");
    } else {
      confirmedValues.towerIds.forEach((towerId) => formData.append("towerIds", towerId));
    }
    setDismissedState(state);
    setEditedSinceSubmit(new Set());
    startTransition(() => formAction(formData));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void openConfirmation();
  }

  const describedBy = (field: ComunicadoField) =>
    errorFor(field) ? `${field}-error` : `${field}-hint`;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-1">
          <label htmlFor="title" className="text-sm font-medium">
            Título
          </label>
          <input
            id="title"
            name="title"
            value={values.title}
            onChange={(e) => update("title", { title: e.target.value })}
            onBlur={() => touch("title")}
            maxLength={LIMITS.titleMax}
            aria-invalid={errorFor("title") ? true : undefined}
            aria-describedby={describedBy("title")}
            className={inputClass}
          />
          <FieldMessage field="title" error={errorFor("title")} hint="5 a 100 caracteres" />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="body" className="text-sm font-medium">
            Contenido
          </label>
          <textarea
            id="body"
            name="body"
            rows={5}
            value={values.body}
            onChange={(e) => update("body", { body: e.target.value })}
            onBlur={() => touch("body")}
            maxLength={LIMITS.bodyMax}
            aria-invalid={errorFor("body") ? true : undefined}
            aria-describedby={describedBy("body")}
            className={`${inputClass} resize-y`}
          />
          <FieldMessage
            field="body"
            error={errorFor("body")}
            hint="10 a 2,000 caracteres"
            count={`${values.body.trim().length}/${LIMITS.bodyMax}`}
          />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="category" className="text-sm font-medium">
              Categoría
            </label>
            <select
              id="category"
              name="category"
              value={values.category}
              onChange={(e) => update("category", { category: e.target.value as Categoria })}
              aria-invalid={errorFor("category") ? true : undefined}
              aria-describedby={describedBy("category")}
              className={`${inputClass} bg-background`}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldMessage field="category" error={errorFor("category")} hint="" />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="expiresOn" className="text-sm font-medium">
              Fin de vigencia
            </label>
            <input
              id="expiresOn"
              name="expiresOn"
              type="date"
              min={bounds.min}
              max={bounds.max}
              value={values.expiresOn}
              onChange={(e) => update("expiresOn", { expiresOn: e.target.value })}
              onBlur={() => touch("expiresOn")}
              aria-invalid={errorFor("expiresOn") ? true : undefined}
              aria-describedby={describedBy("expiresOn")}
              className={inputClass}
            />
            <FieldMessage field="expiresOn" error={errorFor("expiresOn")} hint="Mañana a 90 días" />
          </div>
        </div>

        <fieldset className="flex flex-col gap-3" aria-describedby={describedBy("towerIds")}>
          <legend className="sr-only">Audiencia</legend>
          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              role="switch"
              name="allTowers"
              checked={values.allTowers}
              onChange={(e) => {
                update("towerIds", { allTowers: e.target.checked });
                touch("towerIds");
              }}
              className="h-5 w-9 accent-emerald-700"
            />
            Todo el condominio
          </label>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {towers.map((tower) => (
              <label
                key={tower.id}
                className={`flex items-center gap-2 text-sm ${values.allTowers ? "text-zinc-400" : ""}`}
              >
                <input
                  type="checkbox"
                  name="towerIds"
                  value={tower.id}
                  disabled={values.allTowers}
                  checked={values.towerIds.includes(tower.id)}
                  onChange={(e) => toggleTower(tower.id, e.target.checked)}
                />
                {tower.name}
              </label>
            ))}
          </div>
          <FieldMessage field="towerIds" error={errorFor("towerIds")} hint="" />
        </fieldset>
      </fieldset>

      <p aria-live="polite" className={formError ? "text-sm text-red-600" : "sr-only"}>
        {formError}
      </p>

      <button
        type="submit"
        disabled={hasErrors || busy}
        className="w-full rounded-md bg-foreground px-4 py-2.5 font-medium text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        {checking ? "Consultando..." : pending ? "Publicando..." : "Publicar"}
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="confirmar-publicacion"
        className="m-auto max-w-md rounded-lg border border-zinc-200 bg-background p-6 text-foreground shadow-lg backdrop:bg-black/40 dark:border-zinc-800"
      >
        <p id="confirmar-publicacion" className="font-medium">
          {question}
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
            onClick={confirmPublication}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Publicar
          </button>
        </div>
      </dialog>
    </form>
  );
}

function FieldMessage({
  field,
  error,
  hint,
  count,
}: {
  field: ComunicadoField;
  error?: string;
  hint: string;
  count?: string;
}) {
  if (error) {
    return (
      <p id={`${field}-error`} role="alert" className="text-sm text-red-600">
        {error}
      </p>
    );
  }
  if (!hint && !count) return null;
  return (
    <p id={`${field}-hint`} className="flex justify-between gap-2 text-sm text-zinc-500">
      <span>{hint}</span>
      {count ? <span className="tabular-nums">{count}</span> : null}
    </p>
  );
}
