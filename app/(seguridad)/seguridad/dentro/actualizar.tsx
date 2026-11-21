"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { DENTRO_REFRESH_MS } from "@/lib/dentro-client";

// Botón "Actualizar" de "Quién está dentro" (H18). Además vuelve a consultar
// cada 30 segundos mientras la pantalla está abierta, y al volver a una
// pestaña que estuvo oculta; al salir de la pantalla se detiene.
export function ActualizarDentro() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const refresh = () => startTransition(() => router.refresh());
    const id = setInterval(() => {
      // Con la pestaña oculta no consulta; se pone al día al volver.
      if (document.visibilityState === "visible") refresh();
    }, DENTRO_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
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
