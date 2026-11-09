"use client";

import Link from "next/link";
import { ahora } from "@/lib/fechas";
import { startTransition, useActionState, useState } from "react";
import {
  autorizarVisita,
  type AutorizarVisitaState,
  type VisitaAutorizada,
} from "@/app/actions/visitas";
import {
  DOCUMENT_TYPES,
  LIMITS,
  VISIT_HOURS,
  addDays,
  availableTimes,
  cleanValues,
  formatDateEs,
  svNow,
  validateVisita,
  type VisitaField,
  type VisitaValues,
} from "@/lib/validation/visita";

const initialState: AutorizarVisitaState = {};

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 aria-invalid:border-red-600 dark:border-zinc-700 dark:focus:border-zinc-100";

const ALL_FIELDS: VisitaField[] = [
  "visitorName",
  "documentType",
  "documentNumber",
  "visitDate",
  "expectedTime",
  "reason",
];

type Props = {
  /** Momento en que el servidor armó la pantalla: fija los valores iniciales sin desfase. */
  nowMs: number;
  defaults: { visitDate: string; expectedTime: string };
};

// H14: el residente autoriza a un visitante antes de que llegue. Al guardar
// muestra el código de visita en lugar del formulario.
export function VisitaForm({ nowMs, defaults }: Props) {
  const [state, formAction, pending] = useActionState(autorizarVisita, initialState);
  const [values, setValues] = useState<VisitaValues>({
    visitorName: "",
    documentType: "DUI",
    documentNumber: "",
    visitDate: defaults.visitDate,
    expectedTime: defaults.expectedTime,
    reason: "",
  });
  // "Ahora" se actualiza en cada cambio, para que la hora pasada se valide al momento.
  const [now, setNow] = useState(nowMs);
  // Campos que el usuario ya tocó: sus errores se muestran desde ese momento.
  const [touched, setTouched] = useState<Partial<Record<VisitaField, boolean>>>({});
  // Campos editados después del último envío: ocultan el error del servidor.
  const [editedSinceSubmit, setEditedSinceSubmit] = useState<Set<VisitaField>>(new Set());
  // Después de "Autorizar otra visita" se vuelve al formulario.
  const [dismissed, setDismissed] = useState<VisitaAutorizada | null>(null);

  const clean = cleanValues(values);
  const clientErrors = validateVisita(clean, now);
  const hasErrors = Object.keys(clientErrors).length > 0;

  const today = svNow(now).date;
  const maxDate = addDays(today, LIMITS.maxDaysAhead);
  const times = availableTimes(values.visitDate, now);

  function errorFor(field: VisitaField) {
    if (touched[field]) {
      const error = clientErrors[field];
      if (error) return error;
    }
    if (!editedSinceSubmit.has(field)) return state.errors?.[field];
    return undefined;
  }

  function update(field: VisitaField, value: string) {
    setNow(ahora());
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      // Si la hora elegida ya no está disponible para la nueva fecha, toma la primera libre.
      if (field === "visitDate") {
        const options = availableTimes(value, ahora());
        if (options.length > 0 && !options.includes(next.expectedTime)) {
          next.expectedTime = options[0];
        }
      }
      return next;
    });
    setEditedSinceSubmit((prev) => (prev.has(field) ? prev : new Set(prev).add(field)));
  }

  function touch(field: VisitaField) {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(Object.fromEntries(ALL_FIELDS.map((field) => [field, true])));
    const fresh = validateVisita(clean, ahora());
    if (Object.keys(fresh).length > 0 || pending) return;

    const formData = new FormData();
    for (const field of ALL_FIELDS) formData.set(field, clean[field]);
    setEditedSinceSubmit(new Set());
    startTransition(() => formAction(formData));
  }

  function autorizarOtra() {
    setDismissed(state.visit ?? null);
    const now = ahora();
    const next = availableTimes(svNow(now).date, now)[0];
    setNow(now);
    setValues({
      visitorName: "",
      documentType: "DUI",
      documentNumber: "",
      visitDate: next ? svNow(now).date : addDays(svNow(now).date, 1),
      expectedTime: next ?? VISIT_HOURS.from,
      reason: "",
    });
    setTouched({});
  }

  if (state.visit && state.visit !== dismissed) {
    return <VisitaExito visit={state.visit} onOtra={autorizarOtra} />;
  }

  const describedBy = (field: VisitaField, hint?: boolean) =>
    errorFor(field) ? `${field}-error` : hint ? `${field}-hint` : undefined;

  const isDui = values.documentType === "DUI";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label htmlFor="visitorName" className="text-sm font-medium">
          Nombre completo del visitante
        </label>
        <input
          id="visitorName"
          name="visitorName"
          autoComplete="off"
          value={values.visitorName}
          onChange={(e) => update("visitorName", e.target.value)}
          onBlur={() => touch("visitorName")}
          maxLength={LIMITS.nameMax}
          placeholder="Ej.: Ana María López"
          aria-invalid={errorFor("visitorName") ? true : undefined}
          aria-describedby={describedBy("visitorName")}
          className={inputClass}
        />
        <FieldError field="visitorName" error={errorFor("visitorName")} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-medium">Tipo de documento</legend>
          <div className="flex gap-5 py-2">
            {DOCUMENT_TYPES.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="documentType"
                  value={option.value}
                  checked={values.documentType === option.value}
                  onChange={() => {
                    update("documentType", option.value);
                    touch("documentType");
                  }}
                />
                {option.label}
              </label>
            ))}
          </div>
          <FieldError field="documentType" error={errorFor("documentType")} />
        </fieldset>

        <div className="flex flex-col gap-1">
          <label htmlFor="documentNumber" className="text-sm font-medium">
            Número de documento
          </label>
          <input
            id="documentNumber"
            name="documentNumber"
            autoComplete="off"
            inputMode={isDui ? "numeric" : "text"}
            value={values.documentNumber}
            onChange={(e) => update("documentNumber", e.target.value)}
            onBlur={() => touch("documentNumber")}
            maxLength={isDui ? 10 : 12}
            placeholder={isDui ? "00000000-0" : "6 a 12 letras o números"}
            aria-invalid={errorFor("documentNumber") ? true : undefined}
            aria-describedby={describedBy("documentNumber")}
            className={inputClass}
          />
          <FieldError field="documentNumber" error={errorFor("documentNumber")} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="visitDate" className="text-sm font-medium">
            Fecha de la visita
          </label>
          <input
            id="visitDate"
            name="visitDate"
            type="date"
            value={values.visitDate}
            min={today}
            max={maxDate}
            onChange={(e) => {
              update("visitDate", e.target.value);
              touch("visitDate");
            }}
            onBlur={() => touch("visitDate")}
            aria-invalid={errorFor("visitDate") ? true : undefined}
            aria-describedby={describedBy("visitDate", true)}
            className={inputClass}
          />
          {errorFor("visitDate") ? (
            <FieldError field="visitDate" error={errorFor("visitDate")} />
          ) : (
            <p id="visitDate-hint" className="text-xs text-zinc-500">
              De hoy al {formatDateEs(maxDate)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="expectedTime" className="text-sm font-medium">
            Hora estimada de llegada
          </label>
          <select
            id="expectedTime"
            name="expectedTime"
            value={values.expectedTime}
            onChange={(e) => {
              update("expectedTime", e.target.value);
              touch("expectedTime");
            }}
            onBlur={() => touch("expectedTime")}
            aria-invalid={errorFor("expectedTime") ? true : undefined}
            aria-describedby={describedBy("expectedTime", true)}
            className={`${inputClass} bg-background`}
          >
            {/* Si la hora elegida ya pasó, se muestra igual para que el error tenga sentido. */}
            {times.includes(values.expectedTime) ? null : (
              <option value={values.expectedTime}>{values.expectedTime}</option>
            )}
            {times.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
          {errorFor("expectedTime") ? (
            <FieldError field="expectedTime" error={errorFor("expectedTime")} />
          ) : (
            <p id="expectedTime-hint" className="text-xs text-zinc-500">
              Horario de visitas: {VISIT_HOURS.from} a {VISIT_HOURS.until}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="reason" className="text-sm font-medium">
            Motivo de la visita
          </label>
          <span id="reason-hint" className="text-xs text-zinc-500 tabular-nums">
            {clean.reason.length}/{LIMITS.reasonMax}
          </span>
        </div>
        <input
          id="reason"
          name="reason"
          autoComplete="off"
          value={values.reason}
          onChange={(e) => update("reason", e.target.value)}
          onBlur={() => touch("reason")}
          maxLength={LIMITS.reasonMax}
          placeholder="Ej.: Visita familiar"
          aria-invalid={errorFor("reason") ? true : undefined}
          aria-describedby={describedBy("reason", true)}
          className={inputClass}
        />
        <FieldError field="reason" error={errorFor("reason")} />
      </div>

      {state.conflict && editedSinceSubmit.size === 0 ? (
        <p
          role="alert"
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
        >
          {state.conflict}
        </p>
      ) : null}

      <p aria-live="polite" className="min-h-5 text-sm text-red-600">
        {state.formError}
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={hasErrors || pending}
          className="rounded-md bg-foreground px-4 py-2 font-medium text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Autorizando…" : "Autorizar"}
        </button>
        <Link href="/" className="text-sm underline underline-offset-4">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

/** Estado Éxito: el código en grande, con el visitante, la fecha y la vigencia. */
function VisitaExito({ visit, onOtra }: { visit: VisitaAutorizada; onOtra: () => void }) {
  const [copied, setCopied] = useState<"ok" | "error" | null>(null);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(visit.code);
      setCopied("ok");
    } catch {
      setCopied("error");
    }
  }

  const fecha = formatDateEs(visit.visitDate);

  return (
    <section
      aria-labelledby="visita-autorizada"
      className="flex flex-col items-start gap-4 rounded-xl border border-emerald-300 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-950"
    >
      <h2 id="visita-autorizada" role="status" className="text-lg font-semibold text-emerald-900 dark:text-emerald-200">
        Visita autorizada
      </h2>
      <div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Código de visita</p>
        <p className="font-mono text-5xl font-bold tracking-[0.3em]" aria-label={`Código ${visit.code.split("").join(" ")}`}>
          {visit.code}
        </p>
      </div>
      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-zinc-600 dark:text-zinc-400">Visitante</dt>
        <dd className="font-medium">{visit.visitorName}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Fecha</dt>
        <dd className="font-medium">
          {fecha}, hora estimada {visit.expectedTime}
        </dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Vigencia</dt>
        <dd className="font-medium">
          Válido el {fecha} de {VISIT_HOURS.from} a {VISIT_HOURS.until}
        </dd>
      </dl>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Comparte el código con tu visitante: seguridad lo pedirá en portería.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copiar}
          className="rounded-md bg-foreground px-4 py-2 font-medium text-background"
        >
          Copiar código
        </button>
        <button
          type="button"
          onClick={onOtra}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
        >
          Autorizar otra visita
        </button>
        <span aria-live="polite" className="text-sm text-zinc-600 dark:text-zinc-400">
          {copied === "ok" ? "Código copiado." : copied === "error" ? "No se pudo copiar; cópialo a mano." : null}
        </span>
      </div>
    </section>
  );
}

function FieldError({ field, error }: { field: VisitaField; error?: string }) {
  if (!error) return null;
  return (
    <p id={`${field}-error`} className="text-sm text-red-600">
      {error}
    </p>
  );
}
