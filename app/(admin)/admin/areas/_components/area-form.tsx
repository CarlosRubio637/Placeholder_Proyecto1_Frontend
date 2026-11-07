"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { guardarArea, type AreaFormState } from "@/app/actions/areas";
import type { Area } from "@/lib/areas";
import {
  HALF_HOURS,
  SLOT_OPTIONS,
  validateArea,
  type AreaField,
  type AreaValues,
} from "@/lib/validation/area";
import { ConfirmCancellations } from "./confirm-cancellations";

const initialState: AreaFormState = {};

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 aria-invalid:border-red-600 dark:border-zinc-700 dark:focus:border-zinc-100";

function initialValues(area?: Area): AreaValues {
  return {
    name: area?.name ?? "",
    capacity: area ? String(area.capacity) : "",
    rules: area?.rules ?? "",
    openTime: area?.openTime ?? "08:00",
    closeTime: area?.closeTime ?? "20:00",
    slotMinutes: String(area?.slotMinutes ?? 60),
    isActive: area?.isActive ?? true,
  };
}

// H9: crear (sin `area`) o editar un área común.
export function AreaForm({ area }: { area?: Area }) {
  const [state, formAction, pending] = useActionState(guardarArea, initialState);
  // Inputs controlados: React no los limpia después de cada envío.
  const [values, setValues] = useState<AreaValues>(() => initialValues(area));
  const [touched, setTouched] = useState<Partial<Record<AreaField, boolean>>>({});
  // Respuesta del servidor cuyos errores o confirmación ya no aplican porque
  // el usuario editó el formulario o canceló.
  const [staleState, setStaleState] = useState<AreaFormState | null>(null);

  const clean = { ...values, name: values.name.trim().replace(/\s+/g, " "), rules: values.rules.trim() };
  const clientErrors = validateArea(clean);
  const hasErrors = Object.keys(clientErrors).length > 0;
  const serverState = staleState === state ? initialState : state;

  function errorFor(field: AreaField) {
    return (touched[field] ? clientErrors[field] : undefined) ?? serverState.errors?.[field];
  }

  function update<K extends keyof AreaValues>(key: K, value: AreaValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (key !== "isActive") setTouched((prev) => ({ ...prev, [key]: true }));
    setStaleState(state);
  }

  function fieldProps(field: AreaField) {
    const error = errorFor(field);
    return {
      id: field,
      name: field,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? `${field}-error` : undefined,
      onBlur: () => setTouched((prev) => ({ ...prev, [field]: true })),
    };
  }

  function fieldError(field: AreaField) {
    const error = errorFor(field);
    return error ? (
      <p id={`${field}-error`} className="text-sm text-red-600">
        {error}
      </p>
    ) : null;
  }

  return (
    <form
      action={formAction}
      noValidate
      onSubmit={() => setTouched({ name: true, capacity: true, rules: true, openTime: true, closeTime: true, slotMinutes: true })}
      className="flex max-w-2xl flex-col gap-4"
    >
      {area ? <input type="hidden" name="id" value={area.id} /> : null}

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">Nombre</label>
        <input {...fieldProps("name")} value={values.name} maxLength={50} onChange={(e) => update("name", e.target.value)} className={inputClass} />
        {fieldError("name")}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="capacity" className="text-sm font-medium">Aforo máximo (personas)</label>
        <input {...fieldProps("capacity")} type="number" inputMode="numeric" min={1} max={500} step={1} value={values.capacity} onChange={(e) => update("capacity", e.target.value)} className={`${inputClass} max-w-40`} />
        {fieldError("capacity")}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="rules" className="text-sm font-medium">
          Reglas de uso <span className="font-normal text-zinc-500">(opcional)</span>
        </label>
        <textarea {...fieldProps("rules")} rows={3} maxLength={500} value={values.rules} onChange={(e) => update("rules", e.target.value)} className={inputClass} />
        <p className="text-xs text-zinc-500">{values.rules.trim().length}/500</p>
        {fieldError("rules")}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="openTime" className="text-sm font-medium">Hora de apertura</label>
          <select {...fieldProps("openTime")} value={values.openTime} onChange={(e) => update("openTime", e.target.value)} className={inputClass}>
            {HALF_HOURS.map((time) => <option key={time} value={time}>{time}</option>)}
          </select>
          {fieldError("openTime")}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="closeTime" className="text-sm font-medium">Hora de cierre</label>
          <select {...fieldProps("closeTime")} value={values.closeTime} onChange={(e) => update("closeTime", e.target.value)} className={inputClass}>
            {HALF_HOURS.map((time) => <option key={time} value={time}>{time}</option>)}
          </select>
          {fieldError("closeTime")}
        </div>
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium">Duración de la franja</legend>
        <div className="flex gap-4">
          {SLOT_OPTIONS.map((slot) => (
            <label key={slot} className="flex items-center gap-2 text-sm">
              <input type="radio" name="slotMinutes" value={slot} checked={values.slotMinutes === String(slot)} onChange={(e) => update("slotMinutes", e.target.value)} />
              {slot} minutos
            </label>
          ))}
        </div>
        {fieldError("slotMinutes")}
      </fieldset>

      <label className="flex items-center gap-3 text-sm font-medium">
        <input type="checkbox" role="switch" name="isActive" checked={values.isActive} onChange={(e) => update("isActive", e.target.checked)} className="h-5 w-9 accent-emerald-700" />
        {values.isActive ? "Habilitada" : "Deshabilitada"}
      </label>

      {serverState.confirmCount !== undefined ? (
        <ConfirmCancellations count={serverState.confirmCount} pending={pending} onCancel={() => setStaleState(state)} />
      ) : null}

      <p aria-live="polite" className="min-h-5 text-sm text-red-600">
        {serverState.formError}
      </p>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending || hasErrors || serverState.confirmCount !== undefined}
          className="rounded-md bg-foreground px-4 py-2 font-medium text-background transition-opacity disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Guardar"}
        </button>
        <Link href="/admin/areas" className="text-sm underline underline-offset-4">
          Volver a la lista
        </Link>
      </div>
    </form>
  );
}
