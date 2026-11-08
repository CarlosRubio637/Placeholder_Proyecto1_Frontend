"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { MAX_RANGE_DAYS, morosidadHref, validateRango } from "@/lib/validation/morosidad";

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 aria-invalid:border-red-600 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100";
const buttonClass =
  "rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900";

// Espera antes de consultar, para no navegar en cada dígito del año.
const DEBOUNCE_MS = 400;

// Filtro de rango (H32): consulta al cambiar a un rango válido, sin botón
// Consultar. Actualizar vuelve a pedir los datos; Exportar es de H36.
export function FiltrosMorosidad({ desde, hasta }: { desde: string; hasta: string }) {
  const router = useRouter();
  const [values, setValues] = useState({ desde, hasta });
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const error = validateRango(values.desde, values.hasta);

  function change(field: "desde" | "hasta", value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    clearTimeout(timer.current);
    if (validateRango(next.desde, next.hasta)) return;
    if (next.desde === desde && next.hasta === hasta) return;
    // Al cambiar el rango se vuelve a la página 1.
    timer.current = setTimeout(() => {
      startTransition(() => router.push(morosidadHref(next.desde, next.hasta)));
    }, DEBOUNCE_MS);
  }

  function refresh() {
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-wrap items-start gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Desde</span>
          <input
            type="date"
            value={values.desde}
            max={values.hasta || undefined}
            required
            aria-invalid={error?.field === "desde" || undefined}
            aria-describedby="rango-ayuda"
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
              required
              aria-invalid={error?.field === "hasta" || undefined}
              aria-describedby="rango-ayuda"
              onChange={(event) => change("hasta", event.target.value)}
              className={inputClass}
            />
          </label>
          <p
            id="rango-ayuda"
            role={error ? "alert" : undefined}
            className={error ? "text-red-700 dark:text-red-400" : "text-zinc-500"}
          >
            {error ? error.message : `Máximo ${MAX_RANGE_DAYS} días · por fecha de vencimiento`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {pending ? (
          <span role="status" className="text-sm text-zinc-500">
            Cargando…
          </span>
        ) : null}
        <button type="button" onClick={refresh} disabled={pending} className={buttonClass}>
          Actualizar
        </button>
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
