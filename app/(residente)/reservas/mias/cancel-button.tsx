"use client";

import { useActionState } from "react";
import { cancelarReserva, type CancelarState } from "@/app/actions/reservas";
import { MY_RESERVATIONS_MESSAGES } from "@/lib/reservas";

const initialState: CancelarState = {};

// H8: botón Cancelar con la confirmación de la card.
export function CancelButton({ id, code, tab }: { id: string; code: string; tab: string }) {
  const [state, formAction, pending] = useActionState(cancelarReserva, initialState);
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!confirm(MY_RESERVATIONS_MESSAGES.confirm(code))) event.preventDefault();
      }}
      className="flex flex-col items-start gap-1"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="tab" value={tab} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-red-300 px-3 py-1 text-sm font-medium text-red-700 disabled:opacity-60 dark:border-red-800 dark:text-red-400"
      >
        {pending ? "Cancelando..." : "Cancelar"}
      </button>
      {state.error ? (
        <p role="alert" className="text-xs text-red-600">{state.error}</p>
      ) : null}
    </form>
  );
}
