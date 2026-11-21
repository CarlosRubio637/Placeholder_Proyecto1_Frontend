"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

const buttonClass =
  "rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900";

// Botón Actualizar del resumen (H37): vuelve a pedir las cuatro tarjetas.
export function Actualizar() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      {pending ? (
        <span role="status" className="text-sm text-zinc-500">
          Cargando…
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
        className={buttonClass}
      >
        Actualizar
      </button>
    </div>
  );
}
