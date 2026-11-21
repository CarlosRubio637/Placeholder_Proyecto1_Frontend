"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

// Botón "Actualizar" de H20: vuelve a consultar la misma pantalla sin cambiar
// de ruta. router.refresh() le dice a Next que ejecute otra vez los Server
// Components, así se llama a getMisPaquetes de nuevo.
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
