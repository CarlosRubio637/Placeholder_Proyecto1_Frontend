"use client";

import { useSearchParams } from "next/navigation";
import { startTransition, useActionState, useRef } from "react";
import { registrarSalida, type SalidaState } from "@/app/actions/salidas";

const initialState: SalidaState = {};

const secondaryButtonClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium dark:border-zinc-700";

// Botón "Registrar salida" de una fila + confirmación (H17).
export function RegistrarSalida({ id, visitorName }: { id: string; visitorName: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const params = useSearchParams();
  const [state, formAction, pending] = useActionState(registrarSalida, initialState);

  function confirm() {
    if (pending) return;
    startTransition(() => formAction({ id, query: params.toString() }));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label={`Registrar la salida de ${visitorName}`}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium whitespace-nowrap dark:border-zinc-700"
      >
        Registrar salida
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={`salida-${id}-titulo`}
        className="m-auto w-full max-w-md rounded-xl border border-zinc-200 bg-background p-6 text-left text-foreground backdrop:bg-black/50 dark:border-zinc-800"
      >
        <h2 id={`salida-${id}-titulo`} className="text-lg font-semibold break-words">
          ¿Registrar la salida de {visitorName}?
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Se guardará la hora actual y saldrá de la lista de quién está dentro.
        </p>

        {state.formError ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {state.formError}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            disabled={pending}
            className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={pending}
            className="rounded-md bg-primary hover:bg-primary-hover px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Procesando…" : "Confirmar"}
          </button>
        </div>
      </dialog>
    </>
  );
}
