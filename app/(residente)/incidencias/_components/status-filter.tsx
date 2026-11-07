"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { STATUSES, STATUS_LABELS, type IncidentStatus } from "@/lib/incidencias";

// Filtro por estado de "Mis incidencias". Al cambiarlo vuelve a la página 1.
export function StatusFilter({ value }: { value?: IncidentStatus }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="status" className="text-sm font-medium">
        Estado
      </label>
      <select
        id="status"
        value={value ?? ""}
        disabled={pending}
        onChange={(event) => {
          const status = event.target.value;
          const href = status ? `${pathname}?status=${status}` : pathname;
          startTransition(() => router.push(href));
        }}
        className="rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm dark:border-zinc-700"
      >
        <option value="">Todos</option>
        {STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>
    </div>
  );
}
