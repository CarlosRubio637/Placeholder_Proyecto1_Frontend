"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import {
  READ_OPTIONS,
  lecturasHref,
  parseRead,
  type AdminFiltro,
} from "@/lib/comunicados-admin";

export function FiltroLectura({
  id,
  read,
  lista,
}: {
  id: string;
  read: boolean | null;
  lista: AdminFiltro;
}) {
  const router = useRouter();
  const [filtering, startFilter] = useTransition();
  const [shown, setShown] = useOptimistic(read);

  function go(next: boolean | null) {
    startFilter(() => {
      setShown(next);
      router.push(lecturasHref(id, { read: next, page: 1 }, lista));
    });
  }

  return (
    <div aria-busy={filtering} className="flex items-center gap-2">
      <label htmlFor="read" className="text-sm font-medium">
        Lectura
      </label>
      <select
        id="read"
        value={shown === null ? "" : String(shown)}
        onChange={(event) => go(parseRead(event.target.value))}
        className="rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm dark:border-zinc-700"
      >
        <option value="">Todos</option>
        {READ_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
