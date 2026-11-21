"use client";

export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-lg font-medium">No se pudo cargar tu perfil. Intenta de nuevo.</p>
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
