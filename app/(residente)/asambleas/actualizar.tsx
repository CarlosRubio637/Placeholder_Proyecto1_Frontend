"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** Botón "Actualizar" (H23): vuelve a consultar sin cambiar de ruta. */
export function Actualizar() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700"
    >
      {pending ? "Actualizando…" : "Actualizar"}
    </button>
  );
}
