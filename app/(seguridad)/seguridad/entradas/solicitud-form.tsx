"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { enviarSolicitud, type EnviarSolicitudState } from "@/app/actions/entradas";
import { listarUnidades } from "@/app/actions/paquetes";
import type { Torre, Unidad } from "@/lib/paquetes";
import {
  cleanSolicitud,
  validateSolicitud,
  type SolicitudValues,
} from "@/lib/validation/entrada";
import { DOCUMENT_TYPES, LIMITS } from "@/lib/validation/visita";

const initialState: EnviarSolicitudState = {};

const empty: SolicitudValues = {
  visitorName: "",
  documentType: "DUI",
  documentNumber: "",
  towerId: "",
  unitId: "",
  reason: "",
};

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 aria-invalid:border-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:focus:border-zinc-100";
const secondaryButtonClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium dark:border-zinc-700";

type Props = { torres: Torre[]; onSent: (message: string) => void };

// Botón + diálogo "Visitante sin autorización" (H16). Mismas validaciones de H14;
// al enviar, la solicitud aparece en "Esperando respuesta".
export function SolicitudForm({ torres, onSent }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(enviarSolicitud, initialState);

  const [draft, setDraft] = useState<SolicitudValues>(empty);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState(false);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const [unidadesError, setUnidadesError] = useState<string | undefined>();

  const clean = cleanSolicitud(draft);
  const clientErrors = validateSolicitud(clean);
  const hasErrors = Object.keys(clientErrors).length > 0;
  const serverErrors = dirty ? undefined : state.errors;

  // Al enviarse con éxito: cierra el diálogo y avisa a la pantalla.
  const handled = useRef<EnviarSolicitudState | null>(null);
  useEffect(() => {
    if (state.sent && handled.current !== state) {
      handled.current = state;
      dialog.current?.close();
      onSent(state.sent);
    }
  }, [state, onSent]);

  function errorFor(key: keyof SolicitudValues) {
    const serverError = serverErrors?.[key];
    if (serverError) return serverError;
    return touched[key] ? clientErrors[key] : undefined;
  }

  function open() {
    setDraft(empty);
    setTouched({});
    // true: oculta los errores del envío anterior hasta el próximo envío.
    setDirty(true);
    setUnidades([]);
    setUnidadesError(undefined);
    dialog.current?.showModal();
  }

  function setField<K extends keyof SolicitudValues>(key: K, value: SolicitudValues[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  }

  const touch = (key: keyof SolicitudValues) => () => setTouched((t) => ({ ...t, [key]: true }));

  // Al cambiar la torre, trae sus unidades y limpia la seleccionada.
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
    if (Object.keys(validateSolicitud(clean)).length > 0) {
      setTouched({
        visitorName: true,
        documentType: true,
        documentNumber: true,
        towerId: true,
        unitId: true,
        reason: true,
      });
      return;
    }
    setDirty(false);
    startTransition(() => formAction(clean));
  }

  function field(key: keyof SolicitudValues) {
    const error = errorFor(key);
    return {
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? `${key}-error` : undefined,
    } as const;
  }

  function errorText(key: keyof SolicitudValues) {
    const error = errorFor(key);
    return error ? (
      <p id={`${key}-error`} className="text-sm text-red-600">
        {error}
      </p>
    ) : null;
  }

  return (
    <>
      <button type="button" onClick={open} className={secondaryButtonClass}>
        Visitante sin autorización
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="solicitud-titulo"
        className="m-auto w-full max-w-md rounded-xl border border-zinc-200 bg-background p-6 text-foreground backdrop:bg-black/50 dark:border-zinc-800"
      >
        <h2 id="solicitud-titulo" className="text-lg font-semibold">
          Visitante sin autorización
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Se avisará a los residentes de la unidad; tienen 15 minutos para responder.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="visitorName" className="text-sm font-medium">Nombre del visitante</label>
            <input
              id="visitorName"
              value={draft.visitorName}
              onChange={(e) => setField("visitorName", e.target.value)}
              onBlur={touch("visitorName")}
              maxLength={LIMITS.nameMax}
              autoComplete="off"
              className={inputClass}
              {...field("visitorName")}
            />
            {errorText("visitorName")}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[10rem_1fr]">
            <div className="flex flex-col gap-1">
              <label htmlFor="documentType" className="text-sm font-medium">Documento</label>
              <select
                id="documentType"
                value={draft.documentType}
                onChange={(e) => setField("documentType", e.target.value)}
                onBlur={touch("documentType")}
                className={inputClass}
                {...field("documentType")}
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {errorText("documentType")}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="documentNumber" className="text-sm font-medium">Número</label>
              <input
                id="documentNumber"
                value={draft.documentNumber}
                onChange={(e) => setField("documentNumber", e.target.value)}
                onBlur={touch("documentNumber")}
                maxLength={12}
                autoComplete="off"
                placeholder={draft.documentType === "DUI" ? "00000000-0" : "6 a 12 letras o números"}
                className={inputClass}
                {...field("documentNumber")}
              />
              {errorText("documentNumber")}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="towerId" className="text-sm font-medium">Torre</label>
              <select
                id="towerId"
                value={draft.towerId}
                onChange={(e) => void onTowerChange(e.target.value)}
                onBlur={touch("towerId")}
                className={inputClass}
                {...field("towerId")}
              >
                <option value="">Selecciona</option>
                {torres.map((torre) => (
                  <option key={torre.id} value={torre.id}>{torre.name}</option>
                ))}
              </select>
              {errorText("towerId")}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="unitId" className="text-sm font-medium">Unidad</label>
              <select
                id="unitId"
                value={draft.unitId}
                onChange={(e) => setField("unitId", e.target.value)}
                onBlur={touch("unitId")}
                disabled={!draft.towerId || loadingUnidades}
                className={inputClass}
                {...field("unitId")}
              >
                <option value="">
                  {loadingUnidades ? "Cargando…" : draft.towerId ? "Selecciona" : "Elige una torre primero"}
                </option>
                {unidades.map((unidad) => (
                  <option key={unidad.id} value={unidad.id} disabled={unidad.residentCount === 0}>
                    {unidad.residentCount === 0 ? `${unidad.code} (sin residentes)` : unidad.code}
                  </option>
                ))}
              </select>
              {unidadesError ? (
                <p className="text-sm text-red-600">{unidadesError}</p>
              ) : (
                errorText("unitId")
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="reason" className="text-sm font-medium">Motivo</label>
              <span className="text-xs text-zinc-500 tabular-nums">
                {clean.reason.length}/{LIMITS.reasonMax}
              </span>
            </div>
            <input
              id="reason"
              value={draft.reason}
              onChange={(e) => setField("reason", e.target.value)}
              onBlur={touch("reason")}
              maxLength={LIMITS.reasonMax}
              placeholder="Ej. Entrega de muebles"
              className={inputClass}
              {...field("reason")}
            />
            {errorText("reason")}
          </div>

          {state.formError && !dirty ? (
            <p role="alert" className="text-sm text-red-600">{state.formError}</p>
          ) : null}

          <div className="mt-2 flex justify-end gap-3">
            <button type="button" onClick={() => dialog.current?.close()} className={secondaryButtonClass}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={hasErrors || pending || loadingUnidades}
              className="rounded-md bg-foreground px-4 py-2 font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Enviando…" : "Enviar solicitud"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
