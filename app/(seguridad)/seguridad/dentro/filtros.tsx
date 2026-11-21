"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AVISO_PARAMS, DENTRO_PATH, DENTRO_SEARCH_MAX } from "@/lib/dentro-client";

type Torre = { id: string; name: string };

const fieldClass =
  "rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:focus:border-zinc-100";

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
    // Un aviso de H17 ("Salida registrada…") no se arrastra al filtrar.
    for (const name of AVISO_PARAMS) query.delete(name);
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
    <div className="flex flex-wrap items-start gap-4">
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
          maxLength={DENTRO_SEARCH_MAX}
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
