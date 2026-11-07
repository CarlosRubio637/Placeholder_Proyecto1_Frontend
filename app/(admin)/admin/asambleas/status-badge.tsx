import { STATUS_LABELS, type AsambleaStatus } from "@/lib/asambleas";

const STYLES: Record<AsambleaStatus, string> = {
  PROGRAMADA: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  ABIERTA: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  CERRADA: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
};

export function StatusBadge({ status }: { status: AsambleaStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-sm font-medium ${STYLES[status]}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
