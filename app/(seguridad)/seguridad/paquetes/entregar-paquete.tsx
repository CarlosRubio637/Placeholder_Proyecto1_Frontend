"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { entregarPaquete, type EntregarState } from "@/app/actions/entregas";
import {
  DOC_TYPES,
  cleanEntrega,
  validateEntrega,
  type DocType,
  type EntregaValues,
} from "@/lib/validation/entrega";

/** Datos del paquete que muestra el formulario (los arma la página). */
export type PaqueteEntrega = {
  id: string;
  code: string;
  unitCode: string;
  courier: string;
  trackingNumber: string | null;
  notes: string | null;
  /** Fecha de recepción ya formateada por la página. */
  recibido: string;
};

const initialState: EntregarState = {};

const empty: EntregaValues = {
  pickedUpByName: "",
  pickedUpByDocType: "DUI",
  pickedUpByDocNumber: "",
};

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-invalid:border-red-600 dark:border-zinc-700 dark:focus:border-zinc-100";
const secondaryButtonClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium dark:border-zinc-700";

// Botón "Entregar" de una fila + ventana modal (H21). Pide nombre, tipo y
// número de documento de quien recoge, y confirma antes de registrar.
export function EntregarPaquete({ paquete }: { paquete: PaqueteEntrega }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(entregarPaquete, initialState);

  const [draft, setDraft] = useState<EntregaValues>(empty);
  const [touched, setTouched] = useState<Partial<Record<keyof EntregaValues, boolean>>>({});
  const [dirty, setDirty] = useState(false);
  // "form": datos de quien recoge; "confirm": pregunta de confirmación.
  const [step, setStep] = useState<"form" | "confirm">("form");

  const clean = cleanEntrega(draft);
  const clientErrors = validateEntrega(clean);
  const hasErrors = Object.keys(clientErrors).length > 0;
  const serverErrors = dirty ? undefined : state.errors;
  const formError = dirty ? undefined : state.formError;

  function errorFor(key: keyof EntregaValues) {
    const serverError = serverErrors?.[key];
    if (serverError) return serverError;
    return touched[key] ? clientErrors[key] : undefined;
  }

  function open() {
    setDraft(empty);
    setTouched({});
    setDirty(true);
    setStep("form");
    dialog.current?.showModal();
  }

  function close() {
    dialog.current?.close();
  }

  function setField<K extends keyof EntregaValues>(key: K, value: EntregaValues[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  }

  function goToConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (hasErrors) {
      setTouched({ pickedUpByName: true, pickedUpByDocNumber: true });
      return;
    }
    setStep("confirm");
  }

  function confirm() {
    setStep("form");
    setDirty(false);
    startTransition(() => formAction({ id: paquete.id, ...clean }));
  }

  const nameError = errorFor("pickedUpByName");
  const docError = errorFor("pickedUpByDocNumber");

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`Entregar el paquete ${paquete.code}`}
        className="rounded-md bg-primary hover:bg-primary-hover px-3 py-1.5 text-sm font-medium text-primary-foreground"
      >
        Entregar
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={`entregar-${paquete.id}-titulo`}
        className="m-auto w-full max-w-md rounded-xl border border-zinc-200 bg-background p-6 text-foreground backdrop:bg-black/50 dark:border-zinc-800"
      >
        <h2 id={`entregar-${paquete.id}-titulo`} className="text-lg font-semibold">
          Entregar paquete
        </h2>

        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900">
          <dt className="text-zinc-500">Código</dt>
          <dd className="font-mono">{paquete.code}</dd>
          <dt className="text-zinc-500">Unidad</dt>
          <dd>{paquete.unitCode}</dd>
          <dt className="text-zinc-500">Empresa</dt>
          <dd>{paquete.courier}</dd>
          <dt className="text-zinc-500">Guía</dt>
          <dd>{paquete.trackingNumber ?? "—"}</dd>
          <dt className="text-zinc-500">Recibido</dt>
          <dd>{paquete.recibido}</dd>
          {paquete.notes ? (
            <>
              <dt className="text-zinc-500">Observaciones</dt>
              <dd className="break-words">{paquete.notes}</dd>
            </>
          ) : null}
        </dl>

        {step === "confirm" ? (
          <div className="mt-5 flex flex-col gap-4">
            <p className="font-medium">
              ¿Entregar el paquete {paquete.code} de la unidad {paquete.unitCode} a {clean.pickedUpByName}?
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setStep("form")} className={secondaryButtonClass}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirm}
                className="rounded-md bg-primary hover:bg-primary-hover px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Entregar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={goToConfirm} noValidate className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor={`nombre-${paquete.id}`} className="text-sm font-medium">
                Nombre de quien recoge
              </label>
              <input
                id={`nombre-${paquete.id}`}
                value={draft.pickedUpByName}
                onChange={(e) => setField("pickedUpByName", e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, pickedUpByName: true }))}
                maxLength={80}
                autoComplete="off"
                placeholder="Ej. Ana María López"
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? `nombre-${paquete.id}-error` : undefined}
                className={inputClass}
              />
              {nameError ? (
                <p id={`nombre-${paquete.id}-error`} className="text-sm text-red-600">
                  {nameError}
                </p>
              ) : null}
            </div>

            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1 text-sm font-medium">Tipo de documento</legend>
              <div className="flex gap-6">
                {DOC_TYPES.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`tipo-${paquete.id}`}
                      value={option.value}
                      checked={draft.pickedUpByDocType === option.value}
                      onChange={() => setField("pickedUpByDocType", option.value as DocType)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col gap-1">
              <label htmlFor={`documento-${paquete.id}`} className="text-sm font-medium">
                Número de documento
              </label>
              <input
                id={`documento-${paquete.id}`}
                value={draft.pickedUpByDocNumber}
                onChange={(e) => setField("pickedUpByDocNumber", e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, pickedUpByDocNumber: true }))}
                maxLength={draft.pickedUpByDocType === "DUI" ? 10 : 12}
                autoComplete="off"
                placeholder={draft.pickedUpByDocType === "DUI" ? "00000000-0" : "6 a 12 letras o números"}
                aria-invalid={docError ? true : undefined}
                aria-describedby={docError ? `documento-${paquete.id}-error` : undefined}
                className={inputClass}
              />
              {docError ? (
                <p id={`documento-${paquete.id}-error`} className="text-sm text-red-600">
                  {docError}
                </p>
              ) : null}
            </div>

            {formError ? (
              <p role="alert" className="text-sm text-red-600">
                {formError}
              </p>
            ) : null}

            <div className="flex justify-end gap-3">
              <button type="button" onClick={close} className={secondaryButtonClass}>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={hasErrors || pending}
                className="rounded-md bg-primary hover:bg-primary-hover px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Procesando…" : "Confirmar entrega"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
