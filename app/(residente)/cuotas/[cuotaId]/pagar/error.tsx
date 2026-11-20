"use client";

// Estado "Error del servidor" de Pagar cuota (H1). Reintentar usa retry(), que vuelve
// a pedir los datos al servidor; reset() solo redibuja.
export default function PagarCuotaError({ retry }: { retry: () => void }) {
  return (
    <div role="alert" className="flex max-w-xl flex-col items-start gap-3">
      <p className="text-lg font-medium">No se pudo procesar el pago. Intenta de nuevo.</p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Revisa tu conexión. Si el problema sigue, avisa a soporte.
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
