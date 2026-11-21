"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useRef } from "react";
import { eliminarAsamblea, type EliminarAsambleaState } from "@/app/actions/asambleas";

const initialState: EliminarAsambleaState = {};

// Botón "Eliminar" con confirmación: ¿Eliminar la asamblea <título>?
// Solo se muestra mientras la asamblea está Programada.
export function EliminarAsamblea({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(eliminarAsamblea, initialState);

  function close() {
    dialog.current?.close();
    // Si la asamblea ya cambió de estado, se vuelve a pedir la lista.
    if (state.stale) router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label={`Eliminar la asamblea ${title}`}
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
      >
        Eliminar
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={`eliminar-${id}-titulo`}
        className="m-auto w-full max-w-md rounded-xl border border-zinc-200 bg-background p-6 text-foreground backdrop:bg-black/50 dark:border-zinc-800"
      >
        <h2 id={`eliminar-${id}-titulo`} className="text-lg font-semibold break-words">
          ¿Eliminar la asamblea {title}?
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Se borrarán también sus temas y opciones. Esta acción no se puede deshacer.
        </p>

        <p role="alert" className="mt-3 min-h-5 text-sm text-red-600">
          {state.error}
        </p>

        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={close}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium dark:border-zinc-700"
          >
            {state.stale ? "Cerrar" : "Cancelar"}
          </button>
          {state.stale ? null : (
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => action(id))}
              className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Eliminando…" : "Eliminar"}
            </button>
          )}
        </div>
      </dialog>
    </>
  );
}
