"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ADMIN_SEARCH_MAX,
  PRIORITIES,
  PRIORITY_LABELS,
  STATUSES,
  STATUS_LABELS,
  type AdminFilters,
  type MaintenanceStaff,
} from "@/lib/incidencias";
import { LOCATIONS } from "@/lib/validation/incidencia";

type Props = { filters: AdminFilters; staff: MaintenanceStaff[] };

const selectClass =
  "rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm dark:border-zinc-700";

// Filtros de la bandeja (H12). Viajan en la URL, así Actualizar, el refresco
// de 60 segundos y el botón Atrás los conservan. Al cambiar, vuelve a la página 1.
export function FiltrosIncidencias({ filters, staff }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.search ?? "");

  function go(next: AdminFilters) {
    const query = new URLSearchParams();
    if (next.status) query.set("status", next.status);
    if (next.priority) query.set("priority", next.priority);
    if (next.location) query.set("location", next.location);
    if (next.assignee) query.set("assignee", next.assignee);
    if (next.search) query.set("search", next.search);
    const qs = query.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  function set<K extends keyof AdminFilters>(key: K, value: string) {
    go({ ...filters, search: search.trim() || undefined, [key]: value || undefined });
  }

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        go({ ...filters, search: search.trim() || undefined });
      }}
      className="flex flex-wrap items-end gap-3"
      aria-busy={pending}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="f-status" className="text-sm font-medium">Estado</label>
        <select id="f-status" value={filters.status ?? ""} onChange={(e) => set("status", e.target.value)} className={selectClass}>
          <option value="">Todos</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>{STATUS_LABELS[status]}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="f-priority" className="text-sm font-medium">Prioridad</label>
        <select id="f-priority" value={filters.priority ?? ""} onChange={(e) => set("priority", e.target.value)} className={selectClass}>
          <option value="">Todas</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>{PRIORITY_LABELS[priority]}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="f-location" className="text-sm font-medium">Ubicación</label>
        <select id="f-location" value={filters.location ?? ""} onChange={(e) => set("location", e.target.value)} className={selectClass}>
          <option value="">Todas</option>
          {LOCATIONS.map((location) => (
            <option key={location.value} value={location.value}>{location.label}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="f-assignee" className="text-sm font-medium">Responsable</label>
        <select id="f-assignee" value={filters.assignee ?? ""} onChange={(e) => set("assignee", e.target.value)} className={selectClass}>
          <option value="">Todos</option>
          <option value="none">Sin asignar</option>
          {staff.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="f-search" className="text-sm font-medium">Buscar</label>
        <div className="flex gap-2">
          <input
            id="f-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={ADMIN_SEARCH_MAX}
            placeholder="Número o título"
            className="w-56 rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
          />
          <button type="submit" disabled={pending} className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium disabled:opacity-60 dark:border-zinc-700">
            Buscar
          </button>
        </div>
      </div>
    </form>
  );
}
