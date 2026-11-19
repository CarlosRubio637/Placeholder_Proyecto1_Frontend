"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  NAME_MAX,
  busquedaErrors,
  busquedaFrom,
  directorioHref,
  formFrom,
  type Busqueda,
  type BusquedaForm,
} from "@/lib/directorio";
import type { Torre } from "@/lib/paquetes";

const MODES: { value: BusquedaForm["mode"]; label: string }[] = [
  { value: "nombre", label: "Nombre" },
  { value: "unidad", label: "Unidad" },
];

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm dark:border-zinc-700";
const errorClass = "text-sm text-red-700 dark:text-red-400";

export function BuscarVecinos({
  torres,
  busqueda,
}: {
  torres: Torre[];
  busqueda: Busqueda | null;
}) {
  const router = useRouter();
  const [searching, startSearch] = useTransition();
  const [form, setForm] = useState<BusquedaForm>(() => formFrom(busqueda));
  const errors = busquedaErrors(form);
  const next = busquedaFrom(form);

  function update(change: Partial<BusquedaForm>) {
    setForm((current) => ({ ...current, ...change }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!next) return;
    startSearch(() => {
      router.push(directorioHref(next));
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
    >
      <fieldset className="flex flex-wrap items-center gap-4">
        <legend className="mb-2 text-sm font-medium">Buscar por</legend>
        {MODES.map((mode) => (
          <label key={mode.value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="mode"
              value={mode.value}
              checked={form.mode === mode.value}
              onChange={() => update({ mode: mode.value })}
            />
            {mode.label}
          </label>
        ))}
      </fieldset>

      {form.mode === "nombre" ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="directorio-nombre" className="text-sm font-medium">
            Nombre
          </label>
          <input
            id="directorio-nombre"
            type="text"
            maxLength={NAME_MAX}
            value={form.name}
            onChange={(event) => update({ name: event.target.value })}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={
              errors.name ? "directorio-nombre-error" : undefined
            }
            className={inputClass}
          />
          {errors.name ? (
            <p id="directorio-nombre-error" className={errorClass}>
              {errors.name}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="directorio-torre" className="text-sm font-medium">
              Torre
            </label>
            <select
              id="directorio-torre"
              value={form.towerId}
              onChange={(event) => update({ towerId: event.target.value })}
              className={inputClass}
            >
              <option value="">Selecciona</option>
              {torres.map((torre) => (
                <option key={torre.id} value={torre.id}>
                  {torre.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="directorio-unidad" className="text-sm font-medium">
              Número de unidad
            </label>
            <input
              id="directorio-unidad"
              type="text"
              inputMode="numeric"
              maxLength={3}
              placeholder="101"
              value={form.unitNumber}
              onChange={(event) => update({ unitNumber: event.target.value })}
              aria-invalid={errors.unitNumber ? true : undefined}
              aria-describedby={
                errors.unitNumber ? "directorio-unidad-error" : undefined
              }
              className={inputClass}
            />
            {errors.unitNumber ? (
              <p id="directorio-unidad-error" className={errorClass}>
                {errors.unitNumber}
              </p>
            ) : null}
          </div>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={!next || searching}
          className="rounded-md bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
        >
          {searching ? "Buscando..." : "Buscar"}
        </button>
      </div>
    </form>
  );
}
