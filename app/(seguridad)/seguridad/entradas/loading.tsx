export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
      <span
        aria-hidden
        className="size-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"
      />
      Cargando…
    </div>
  );
}
