"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Torre } from "@/lib/paquetes";
import {
  BUSQUEDA_DEBOUNCE_MS,
  SEARCH_MAX,
  normalizarBusqueda,
  unidadesMorosasHref,
  type FiltrosMorosas,
} from "@/lib/unidades-morosas";

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100";
const buttonClass =
  "rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900";

export function FiltrosUnidadesMorosas({
  torres,
  towerId,
  search,
}: {
  torres: Torre[];
  towerId: string | undefined;
  search: string | undefined;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(search ?? "");
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function consultar(filtros: FiltrosMorosas) {
    clearTimeout(timer.current);
    if (filtros.towerId === towerId && filtros.search === search) return;
    startTransition(() => router.push(unidadesMorosasHref(filtros)));
  }

  function cambiarTexto(value: string) {
    setTexto(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => consultar({ towerId, search: normalizarBusqueda(value) }),
      BUSQUEDA_DEBOUNCE_MS,
    );
  }

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Torre o sección</span>
          <select
            value={towerId ?? ""}
            onChange={(event) =>
              consultar({
                towerId: event.target.value || undefined,
                search: normalizarBusqueda(texto),
              })
            }
            className={inputClass}
          >
            <option value="">Todas</option>
            {torres.map((torre) => (
              <option key={torre.id} value={torre.id}>
                {torre.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Buscar unidad</span>
          <input
            type="search"
            value={texto}
            maxLength={SEARCH_MAX}
            placeholder="Ej.: B-203"
            onChange={(event) => cambiarTexto(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              consultar({ towerId, search: normalizarBusqueda(texto) });
            }}
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        {pending ? (
          <span role="status" className="text-sm text-zinc-500">
            Cargando…
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => startTransition(() => router.refresh())}
          disabled={pending}
          className={buttonClass}
        >
          Actualizar
        </button>
      </div>
    </div>
  );
}
