"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

// Botón "Actualizar" de Mis visitas (H15): vuelve a consultar la página en el
// servidor sin perder la pestaña ni la página (están en la URL).
export function ActualizarButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium disabled:opacity-60 dark:border-zinc-700"
    >
      {pending ? "Actualizando…" : "Actualizar"}
    </button>
  );
}
