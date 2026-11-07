"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { guardarPaquete, listarUnidades, type GuardarPaqueteState } from "@/app/actions/paquetes";
import type { Torre, Unidad } from "@/lib/paquetes";
import {
  cleanPaquete,
  LIMITS,
  validatePaquete,
  type PaqueteValues,
} from "@/lib/validation/paquete";

const initialState: GuardarPaqueteState = {};

const empty: PaqueteValues = {
  towerId: "",
  unitId: "",
  courier: "",
  trackingNumber: "",
  notes: "",
};

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 aria-invalid:border-red-600 dark:border-zinc-700 dark:focus:border-zinc-100";
const secondaryButtonClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium dark:border-zinc-700";

type Props = { torres: Torre[] };

// Botón + diálogo del formulario "Registrar llegada de paquete".
// Al elegir torre, llama al servidor para traer las unidades (listarUnidades).
export function RegistrarPaquete({ torres }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(guardarPaquete, initialState);

  const [draft, setDraft] = useState<PaqueteValues>(empty);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState(false);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const [unidadesError, setUnidadesError] = useState<string | undefined>();

  const clean = cleanPaquete(draft);
  const clientErrors = validatePaquete(clean);
  const hasErrors = Object.keys(clientErrors).length > 0;
  const serverErrors = dirty ? undefined : state.errors;

  function errorFor(key: keyof PaqueteValues, show: boolean) {
    const serverError = serverErrors?.[key as keyof typeof serverErrors];
    if (serverError) return serverError;
    if (show && clientErrors[key as keyof typeof clientErrors]) {
      return clientErrors[key as keyof typeof clientErrors];
    }
    return undefined;
  }

  function open() {
    setDraft(empty);
    setTouched({});
    setDirty(false);
    setUnidades([]);
    setUnidadesError(undefined);
    dialog.current?.showModal();
  }

  function close() {
    dialog.current?.close();
  }

  function setField<K extends keyof PaqueteValues>(key: K, value: PaqueteValues[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  }

  // Cuando cambia la torre, pide las unidades y limpia la seleccionada.
  async function onTowerChange(towerId: string) {
    setDraft((d) => ({ ...d, towerId, unitId: "" }));
    setDirty(true);
    setUnidades([]);
    setUnidadesError(undefined);
    if (!towerId) return;
    setLoadingUnidades(true);
    const res = await listarUnidades(towerId);
    setLoadingUnidades(false);
    if (res.error) setUnidadesError(res.error);
    else setUnidades(res.data ?? []);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (Object.keys(validatePaquete(clean)).length > 0) {
      setTouched({ unitId: true, courier: true, trackingNumber: true, notes: true });
      return;
    }
    setDirty(false);
    startTransition(() => formAction(clean));
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="rounded-md bg-foreground px-4 py-2 font-medium text-background"
      >
        Registrar paquete
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="registrar-paquete-titulo"
        className="m-auto w-full max-w-md rounded-xl border border-zinc-200 bg-background p-6 text-foreground backdrop:bg-black/50 dark:border-zinc-800"
      >
        <h2 id="registrar-paquete-titulo" className="text-lg font-semibold">
          Registrar llegada de paquete
        </h2>

        <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="towerId" className="text-sm font-medium">Torre</label>
            <select
              id="towerId"
              value={draft.towerId}
              onChange={(e) => onTowerChange(e.target.value)}
              required
              className={inputClass}
            >
              <option value="">Selecciona</option>
              {torres.map((torre) => (
                <option key={torre.id} value={torre.id}>{torre.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="unitId" className="text-sm font-medium">Unidad</label>
            <select
              id="unitId"
              value={draft.unitId}
              onChange={(e) => setField("unitId", e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, unitId: true }))}
              disabled={!draft.towerId || loadingUnidades}
              required
              aria-invalid={errorFor("unitId", !!touched.unitId) ? true : undefined}
              aria-describedby={errorFor("unitId", !!touched.unitId) ? "unitId-error" : undefined}
              className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <option value="">
                {loadingUnidades
                  ? "Cargando…"
                  : draft.towerId
                    ? "Selecciona"
                    : "Elige una torre primero"}
              </option>
              {unidades.map((unidad) => (
                <option key={unidad.id} value={unidad.id}>{unidad.code}</option>
              ))}
            </select>
            {unidadesError ? (
              <p className="text-sm text-red-600">{unidadesError}</p>
            ) : errorFor("unitId", !!touched.unitId) ? (
              <p id="unitId-error" className="text-sm text-red-600">
                {errorFor("unitId", !!touched.unitId)}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="courier" className="text-sm font-medium">Empresa de mensajería</label>
            <input
              id="courier"
              value={draft.courier}
              onChange={(e) => setField("courier", e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, courier: true }))}
              maxLength={LIMITS.courierMax}
              required
              placeholder="Ej. DHL, Amazon"
              aria-invalid={errorFor("courier", !!touched.courier) ? true : undefined}
              aria-describedby={errorFor("courier", !!touched.courier) ? "courier-error" : "courier-hint"}
              className={inputClass}
            />
            {errorFor("courier", !!touched.courier) ? (
              <p id="courier-error" className="text-sm text-red-600">
                {errorFor("courier", !!touched.courier)}
              </p>
            ) : (
              <p id="courier-hint" className="text-sm text-zinc-500">2 a 40 caracteres</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="trackingNumber" className="text-sm font-medium">Número de guía</label>
            <input
              id="trackingNumber"
              value={draft.trackingNumber}
              onChange={(e) => setField("trackingNumber", e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, trackingNumber: true }))}
              maxLength={LIMITS.trackingMax}
              placeholder="Opcional"
              aria-invalid={errorFor("trackingNumber", !!touched.trackingNumber) ? true : undefined}
              aria-describedby={errorFor("trackingNumber", !!touched.trackingNumber) ? "trackingNumber-error" : "trackingNumber-hint"}
              className={inputClass}
            />
            {errorFor("trackingNumber", !!touched.trackingNumber) ? (
              <p id="trackingNumber-error" className="text-sm text-red-600">
                {errorFor("trackingNumber", !!touched.trackingNumber)}
              </p>
            ) : (
              <p id="trackingNumber-hint" className="text-sm text-zinc-500">
                Opcional. Letras, números y guiones, 4 a 40 caracteres.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="notes" className="text-sm font-medium">Observaciones</label>
              <span className="text-xs text-zinc-500 tabular-nums">
                {clean.notes.length}/{LIMITS.notesMax}
              </span>
            </div>
            <textarea
              id="notes"
              rows={3}
              value={draft.notes}
              onChange={(e) => setField("notes", e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, notes: true }))}
              maxLength={LIMITS.notesMax}
              placeholder="Ej. Caja grande, frágil"
              aria-invalid={errorFor("notes", !!touched.notes) ? true : undefined}
              aria-describedby={errorFor("notes", !!touched.notes) ? "notes-error" : undefined}
              className={`${inputClass} resize-y`}
            />
            {errorFor("notes", !!touched.notes) ? (
              <p id="notes-error" className="text-sm text-red-600">
                {errorFor("notes", !!touched.notes)}
              </p>
            ) : null}
          </div>

          {state.formError ? (
            <p role="alert" className="text-sm text-red-600">{state.formError}</p>
          ) : null}

          <div className="mt-2 flex justify-end gap-3">
            <button type="button" onClick={close} className={secondaryButtonClass}>Cancelar</button>
            <button
              type="submit"
              disabled={hasErrors || pending || loadingUnidades}
              className="rounded-md bg-foreground px-4 py-2 font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}