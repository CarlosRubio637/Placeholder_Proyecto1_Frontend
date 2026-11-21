"use client";

import { useFormStatus } from "react-dom";

// Botón de "Eliminar bloqueo" (H9). Va dentro de un <form action={eliminarBloqueo}>.
export function DeleteBlockButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!confirm("¿Eliminar el bloqueo? Las reservas que ya canceló no se restauran.")) {
          event.preventDefault();
        }
      }}
      className="text-sm text-red-700 underline underline-offset-4 disabled:opacity-60 dark:text-red-400"
    >
      {pending ? "Eliminando..." : "Eliminar bloqueo"}
    </button>
  );
}
