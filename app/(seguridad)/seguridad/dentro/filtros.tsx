"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

// Ruta de la pantalla. Va aquí y no se importa de lib/dentro.ts porque ese
// archivo usa apiFetch, que solo corre en el servidor.
const DENTRO_PATH = "/seguridad/dentro";
const SEARCH_MAX = 80;

type Torre = { id: string; name: string };

const fieldClass =
  "rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100";

// Filtros de "Quién está dentro" (H18): torre y búsqueda por nombre o
// documento. Viven en la URL; al cambiar vuelven a la página 1.
export function FiltrosDentro({
  torres,
  towerId,
  search,
}: {
  torres: Torre[];
  towerId: string;
  search: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(search);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function navigate(key: "towerId" | "search", next: string) {
    const query = new URLSearchParams(params);
    if (next) query.set(key, next);
    else query.delete(key);
    query.delete("page");
    const qs = query.toString();
    startTransition(() => router.replace(qs ? `${DENTRO_PATH}?${qs}` : DENTRO_PATH));
  }

  // La búsqueda espera un momento para no consultar en cada tecla.
  useEffect(() => {
    if (value === search) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => navigate("search", value.trim()), 300);
    return () => clearTimeout(timer.current);
    // `search` y `params` cambian por navegación; lo que dispara es `value`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="torre" className="text-sm font-medium">
          Torre
        </label>
        <select
          id="torre"
          value={towerId}
          onChange={(e) => navigate("towerId", e.target.value)}
          className={fieldClass}
        >
          <option value="">Todas</option>
          {torres.map((torre) => (
            <option key={torre.id} value={torre.id}>
              {torre.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="buscar" className="text-sm font-medium">
          Buscar
        </label>
        <input
          id="buscar"
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={SEARCH_MAX}
          aria-describedby="buscar-ayuda"
          className={`${fieldClass} w-72 max-w-full`}
        />
        <p id="buscar-ayuda" className="text-sm text-zinc-600 dark:text-zinc-400">
          Nombre o documento
        </p>
      </div>
    </div>
  );
}
