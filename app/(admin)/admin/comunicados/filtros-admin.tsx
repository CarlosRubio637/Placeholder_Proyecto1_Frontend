"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { CATEGORY_OPTIONS, type Categoria } from "@/lib/comunicados";
import {
  STATUS_OPTIONS,
  adminComunicadosHref,
  parseCategory,
  parseStatus,
  type Estado,
} from "@/lib/comunicados-admin";

const controlClass =
  "rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm disabled:opacity-60 dark:border-zinc-700";

type Filtro = { status: Estado | null; category: Categoria | null };

export function FiltrosAdmin({ status, category }: Filtro) {
  const router = useRouter();
  const [filtering, startFilter] = useTransition();
  const [shown, setShown] = useOptimistic<Filtro>({ status, category });

  function go(next: Filtro) {
    startFilter(() => {
      setShown(next);
      router.push(adminComunicadosHref({ ...next, page: 1 }));
    });
  }

  return (
    <div aria-busy={filtering} className="flex flex-wrap items-end gap-4">
      <div className="flex items-center gap-2">
        <label htmlFor="status" className="text-sm font-medium">
          Estado
        </label>
        <select
          id="status"
          value={shown.status ?? ""}
          onChange={(event) =>
            go({ ...shown, status: parseStatus(event.target.value) })
          }
          className={controlClass}
        >
          <option value="">Todos</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="category" className="text-sm font-medium">
          Categoría
        </label>
        <select
          id="category"
          value={shown.category ?? ""}
          onChange={(event) =>
            go({ ...shown, category: parseCategory(event.target.value) })
          }
          className={controlClass}
        >
          <option value="">Todas</option>
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
