"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  MAX_RANGE_DAYS,
  PERIODOS,
  PERIODO_LABELS,
  reporteIncidenciasHref,
  validateRango,
  type Periodo,
} from "@/lib/validation/reporte-incidencias";

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500 aria-invalid:border-red-600 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100 dark:disabled:bg-zinc-900";
const buttonClass =
  "rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900";

// Espera antes de consultar, para no navegar en cada dígito del año.
const DEBOUNCE_MS = 400;

type Props = {
  periodo: Periodo;
  /** Fechas efectivas del periodo (en Mes actual y Últimos 3 meses, calculadas). */
  desde: string;
  hasta: string;
};

// Selector de periodo (H34, con la especificación de H33): Mes actual, Últimos
// 3 meses o Personalizado. Consulta al cambiar a un periodo válido, sin botón
// Consultar. Las fechas solo se editan en Personalizado. Exportar es de H36.
export function FiltrosIncidencias({ periodo, desde, hasta }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Periodo>(periodo);
  const [values, setValues] = useState({ desde, hasta });
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const custom = selected === "personalizado";
  const error = custom ? validateRango(values.desde, values.hasta) : null;

  function go(href: string) {
    startTransition(() => router.push(href));
  }

  function choose(next: Periodo) {
    setSelected(next);
    clearTimeout(timer.current);
    // Al pasar a Personalizado se parte de las fechas que se están viendo.
    if (next === "personalizado") {
      if (!validateRango(values.desde, values.hasta)) {
        go(reporteIncidenciasHref(next, values.desde, values.hasta));
      }
      return;
    }
    go(reporteIncidenciasHref(next));
  }

  function change(field: "desde" | "hasta", value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    clearTimeout(timer.current);
    if (validateRango(next.desde, next.hasta)) return;
    if (periodo === "personalizado" && next.desde === desde && next.hasta === hasta) return;
    // Al cambiar el periodo se vuelve a la página 1.
    timer.current = setTimeout(() => {
      go(reporteIncidenciasHref("personalizado", next.desde, next.hasta));
    }, DEBOUNCE_MS);
  }

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-wrap items-start gap-6">
        <fieldset className="flex flex-col gap-1.5 text-sm">
          <legend className="mb-1.5 font-medium">Periodo</legend>
          <div className="flex flex-wrap gap-4 py-2">
            {PERIODOS.map((option) => (
              <label key={option} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="periodo"
                  value={option}
                  checked={selected === option}
                  onChange={() => choose(option)}
                />
                {PERIODO_LABELS[option]}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Desde</span>
          <input
            type="date"
            value={values.desde}
            max={values.hasta || undefined}
            required={custom}
            disabled={!custom}
            aria-invalid={error?.field === "desde" || undefined}
            aria-describedby="periodo-ayuda"
            onChange={(event) => change("desde", event.target.value)}
            className={inputClass}
          />
        </label>
        <div className="flex flex-col gap-1.5 text-sm">
          <label className="flex flex-col gap-1.5">
            <span className="font-medium">Hasta</span>
            <input
              type="date"
              value={values.hasta}
              min={values.desde || undefined}
              required={custom}
              disabled={!custom}
              aria-invalid={error?.field === "hasta" || undefined}
              aria-describedby="periodo-ayuda"
              onChange={(event) => change("hasta", event.target.value)}
              className={inputClass}
            />
          </label>
          <p
            id="periodo-ayuda"
            role={error ? "alert" : undefined}
            className={error ? "text-red-700 dark:text-red-400" : "text-zinc-500"}
          >
            {error ? error.message : `Máximo ${MAX_RANGE_DAYS} días · por fecha de creación`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {pending ? (
          <span role="status" className="text-sm text-zinc-500">
            Cargando…
          </span>
        ) : null}
        {/* H36 activa la exportación con los filtros actuales. */}
        <button type="button" disabled title="Disponible pronto" className={buttonClass}>
          Exportar PDF
        </button>
        <button type="button" disabled title="Disponible pronto" className={buttonClass}>
          Exportar CSV
        </button>
      </div>
    </div>
  );
}
