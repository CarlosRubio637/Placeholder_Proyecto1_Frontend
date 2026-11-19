"use client";

export default function ComunicadoError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3">
      <p className="text-lg font-medium">No se pudo abrir el comunicado.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-md bg-primary hover:bg-primary-hover px-4 py-2 font-medium text-primary-foreground"
      >
        Reintentar
      </button>
    </div>
  );
}
