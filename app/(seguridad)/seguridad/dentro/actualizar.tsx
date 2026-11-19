"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

/** Cada cuánto se vuelve a consultar la lista (H18). */
const REFRESH_MS = 30_000;

// Botón "Actualizar" de "Quién está dentro" (H18). Además vuelve a consultar
// cada 30 segundos mientras la pantalla está abierta; al salir se detiene.
export function ActualizarDentro() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const id = setInterval(() => {
      // Si la pestaña está oculta no consulta; lo hará al volver a verse.
      if (document.visibilityState === "visible") {
        startTransition(() => router.refresh());
      }
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700"
    >
      {pending ? "Actualizando…" : "Actualizar"}
    </button>
  );
}
