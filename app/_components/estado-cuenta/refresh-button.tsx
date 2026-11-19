"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

// H2: vuelve a consultar el estado de cuenta.
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium disabled:opacity-60 dark:border-zinc-700"
    >
      {pending ? "Actualizando..." : "Actualizar"}
    </button>
  );
}
