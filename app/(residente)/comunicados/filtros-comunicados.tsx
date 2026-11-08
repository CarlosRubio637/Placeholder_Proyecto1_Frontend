"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  CATEGORY_OPTIONS,
  comunicadosHref,
  type Categoria,
  type Pestana,
} from "@/lib/comunicados";

const TABS: { value: Pestana; label: string }[] = [
  { value: "vigentes", label: "Vigentes" },
  { value: "archivados", label: "Archivados" },
];

const controlClass =
  "rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm disabled:opacity-60 dark:border-zinc-700";

export function FiltrosComunicados({
  tab,
  category,
}: {
  tab: Pestana;
  category: Categoria | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function go(next: { tab: Pestana; category: Categoria | null }) {
    startTransition(() => router.push(comunicadosHref(next)));
  }

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <fieldset
          disabled={pending}
          className="flex min-w-0 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900"
        >
          <legend className="sr-only">Pestaña</legend>
          {TABS.map((option) => (
            <label
              key={option.value}
              className="cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium text-zinc-600 has-checked:bg-background has-checked:text-foreground has-checked:shadow-sm has-focus-visible:ring-2 has-focus-visible:ring-zinc-400 dark:text-zinc-400"
            >
              <input
                type="radio"
                name="tab"
                value={option.value}
                checked={tab === option.value}
                onChange={() => go({ tab: option.value, category })}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <div className="flex items-center gap-2">
          <label htmlFor="category" className="text-sm font-medium">
            Categoría
          </label>
          <select
            id="category"
            value={category ?? ""}
            disabled={pending}
            onChange={(event) => {
              const value = event.target.value;
              go({
                tab,
                category:
                  CATEGORY_OPTIONS.find((option) => option.value === value)
                    ?.value ?? null,
              });
            }}
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

      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
        className={`${controlClass} font-medium`}
      >
        {pending ? "Actualizando..." : "Actualizar"}
      </button>
    </div>
  );
}
