"use client";

export default function DirectorioError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3">
      <p className="text-lg font-medium">
        No se pudo cargar el directorio de vecinos.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-md bg-foreground px-4 py-2 font-medium text-background"
      >
        Reintentar
      </button>
    </div>
  );
}
