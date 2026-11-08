"use client";

// Estado "Error del servidor" del panel de morosidad (H32). Reintentar usa
// retry(), que vuelve a pedir los datos al servidor; reset() solo redibuja.
export default function MorosidadError({ retry }: { retry: () => void }) {
  return (
    <div role="alert" className="flex max-w-xl flex-col items-start gap-3">
      <p className="text-lg font-medium">No se pudo cargar el reporte de morosidad.</p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Revisa tu conexión e intenta de nuevo. Si el problema sigue, avisa a soporte.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium dark:border-zinc-700"
      >
        Reintentar
      </button>
    </div>
  );
}
