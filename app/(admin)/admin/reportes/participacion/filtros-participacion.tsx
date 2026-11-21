"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  reporteParticipacionHref,
  type FiltrosParticipacion as Filtros,
} from "@/lib/validation/reporte-participacion";
import { MAX_RANGE_DAYS, validateRango } from "@/lib/validation/reporte-periodo";

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500 aria-invalid:border-red-600 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100 dark:disabled:bg-zinc-900";
const buttonClass =
  "rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900";

// Espera antes de consultar, para no navegar en cada dígito del año.
const DEBOUNCE_MS = 400;

type Props = Filtros & {
  /** Asambleas Abiertas y Cerradas; `label` ya trae el título y el estado. */
  opciones: { id: string; label: string }[];
};

// Filtros del reporte de participación (H35): una asamblea ("Todas" por
// defecto) o el rango de fechas de apertura. Consulta al cambiar un filtro
// válido, sin botón Consultar, igual que H33 y H34. Con una asamblea elegida
// las fechas no aplican y quedan deshabilitadas. Exportar es de H36.
export function FiltrosParticipacion({ asamblea, desde, hasta, opciones }: Props) {
  const router = useRouter();
  const [values, setValues] = useState({ asamblea, desde, hasta });
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const porAsamblea = values.asamblea !== null;
  const error = porAsamblea ? null : validateRango(values.desde, values.hasta);

  function go(next: Filtros) {
    startTransition(() => router.push(reporteParticipacionHref(next)));
  }

  function chooseAsamblea(value: string) {
    const next = { ...values, asamblea: value || null };
    setValues(next);
    clearTimeout(timer.current);
    if (!next.asamblea && validateRango(next.desde, next.hasta)) return;
    go(next);
  }

  function changeFecha(field: "desde" | "hasta", value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    clearTimeout(timer.current);
    if (validateRango(next.desde, next.hasta)) return;
    if (next.desde === desde && next.hasta === hasta) return;
    // Al cambiar el periodo se vuelve a la página 1.
    timer.current = setTimeout(() => go(next), DEBOUNCE_MS);
  }

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-wrap items-start gap-6">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Asamblea</span>
          <select
            value={values.asamblea ?? ""}
            onChange={(event) => chooseAsamblea(event.target.value)}
            className={`${inputClass} max-w-xs`}
          >
            <option value="">Todas</option>
            {opciones.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Desde</span>
          <input
            type="date"
            value={values.desde}
            max={values.hasta || undefined}
            disabled={porAsamblea}
            aria-invalid={error?.field === "desde" || undefined}
            aria-describedby="participacion-ayuda"
            onChange={(event) => changeFecha("desde", event.target.value)}
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
              disabled={porAsamblea}
              aria-invalid={error?.field === "hasta" || undefined}
              aria-describedby="participacion-ayuda"
              onChange={(event) => changeFecha("hasta", event.target.value)}
              className={inputClass}
            />
          </label>
          <p
            id="participacion-ayuda"
            role={error ? "alert" : undefined}
            className={error ? "text-red-700 dark:text-red-400" : "text-zinc-500"}
          >
            {error
              ? error.message
              : porAsamblea
                ? "Con una asamblea elegida no se aplican las fechas"
                : `Máximo ${MAX_RANGE_DAYS} días · por fecha de apertura`}
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
