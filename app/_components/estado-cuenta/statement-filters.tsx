"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { FEE_STATUSES, FEE_STATUS_LABEL } from "@/lib/estado-cuenta";

// H2: filtros por año y estado. Al cambiar un filtro vuelve a la página 1.
export function StatementFilters({ years }: { years: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function change(name: "anio" | "estado", value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete("page");
    const qs = next.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  const select =
    "rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700";

  return (
    <div className="flex flex-wrap items-end gap-3" aria-busy={pending}>
      <div className="flex flex-col gap-1">
        <label htmlFor="filtro-anio" className="text-sm font-medium">Año</label>
        <select
          id="filtro-anio"
          className={select}
          value={params.get("anio") ?? ""}
          onChange={(e) => change("anio", e.target.value)}
        >
          <option value="">Todos</option>
          {years.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="filtro-estado" className="text-sm font-medium">Estado</label>
        <select
          id="filtro-estado"
          className={select}
          value={params.get("estado") ?? ""}
          onChange={(e) => change("estado", e.target.value)}
        >
          <option value="">Todos</option>
          {FEE_STATUSES.map((status) => (
            <option key={status} value={status}>{FEE_STATUS_LABEL[status]}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
