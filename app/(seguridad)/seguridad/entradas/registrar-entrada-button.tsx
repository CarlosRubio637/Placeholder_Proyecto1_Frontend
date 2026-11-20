"use client";

import { useState } from "react";
import { registrarEntrada } from "@/app/actions/entradas";

type Props = { visitId: string; onEntry: (message: string) => void };

// Botón "Registrar entrada" (H16). Se deshabilita mientras espera la respuesta.
export function RegistrarEntradaButton({ visitId, onEntry }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function onClick() {
    if (pending) return;
    setPending(true);
    setError(undefined);
    const res = await registrarEntrada(visitId);
    setPending(false);
    if (res.ok) onEntry(res.ok);
    else setError(res.error);
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={pending}
        className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Registrando…" : "Registrar entrada"}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
