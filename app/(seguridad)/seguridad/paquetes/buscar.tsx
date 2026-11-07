"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
const PAQUETES_PATH = "/seguridad/paquetes";

// Campo de búsqueda: al escribir actualiza ?search= con un retraso corto para
// no consultar en cada tecla. Reinicia a página 1 cuando cambia el texto.
export function BuscarPaquetes({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (value === defaultValue) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (value) next.set("search", value);
      else next.delete("search");
      next.delete("page");
      startTransition(() => router.replace(`${PAQUETES_PATH}?${next.toString()}`));
    }, 300);
    return () => clearTimeout(timer.current);
    // params y defaultValue se actualizan por navegación; `value` es lo que dispara.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="buscar" className="text-sm font-medium">Buscar</label>
      <input
        id="buscar"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Código, guía o unidad"
        className="w-full max-w-sm rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
      />
    </div>
  );
}
