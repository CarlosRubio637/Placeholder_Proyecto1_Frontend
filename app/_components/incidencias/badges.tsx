import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  type IncidentPriority,
  type IncidentStatus,
} from "@/lib/incidencias";

const STATUS_CLASSES: Record<IncidentStatus, string> = {
  PENDIENTE: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  EN_PROCESO: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100",
  RESUELTO: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
};

const PRIORITY_CLASSES: Record<IncidentPriority, string> = {
  ALTA: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100",
  MEDIA: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  BAJA: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
};

const BASE = "inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium";

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return <span className={`${BASE} ${STATUS_CLASSES[status]}`}>{STATUS_LABELS[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: IncidentPriority }) {
  return (
    <span className={`${BASE} ${PRIORITY_CLASSES[priority]}`}>{PRIORITY_LABELS[priority]}</span>
  );
}
