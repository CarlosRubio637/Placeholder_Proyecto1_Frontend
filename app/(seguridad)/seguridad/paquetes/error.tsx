"use client";

export default function PaquetesError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="flex max-w-xl flex-col items-start gap-3">
      <p className="text-lg font-medium">No se pudo cargar la información de paquetes.</p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Revisa tu conexión e intenta de nuevo. Si el problema sigue, avisa a soporte.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium dark:border-zinc-700"
      >
        Reintentar
      </button>
    </div>
  );
}
