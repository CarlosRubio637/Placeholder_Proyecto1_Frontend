"use client";

// Estado "Error del servidor" del catálogo y la disponibilidad de áreas (H6).
export default function ReservasError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="flex max-w-xl flex-col items-start gap-3">
      <p className="text-lg font-medium">No se pudo cargar la información de las áreas comunes.</p>
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
