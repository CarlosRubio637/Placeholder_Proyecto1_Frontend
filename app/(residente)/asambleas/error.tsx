"use client";

// Estado "Error del servidor" de las pantallas de asambleas del residente.
// `retry` vuelve a pedir los datos al servidor; `reset` solo volvería a
// renderizar con los mismos datos (Next 16).
export default function AsambleasError({ retry }: { retry: () => void }) {
  return (
    <div role="alert" className="mx-auto w-full flex max-w-xl flex-col items-start gap-3">
      <p className="text-lg font-medium">No se pudo cargar la información de las asambleas.</p>
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