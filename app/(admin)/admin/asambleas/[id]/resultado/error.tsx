"use client";

export default function ErrorResultado({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3">
      <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
        No se pudo cargar la información. Intenta de nuevo.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700"
      >
        Reintentar
      </button>
    </div>
  );
}
