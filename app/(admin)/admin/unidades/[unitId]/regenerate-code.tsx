"use client";

import { useActionState, useState } from "react";
import { regenerarCodigo, type CodigoState } from "@/app/actions/pagos";
import { STATEMENT_MESSAGES } from "@/lib/estado-cuenta";

const initialState: CodigoState = {};

// H2: código de registro vigente con Regenerar (pide confirmación) y Copiar.
export function RegenerateCode({ unitId, code }: { unitId: string; code: string }) {
  const [state, formAction, pending] = useActionState(regenerarCodigo, initialState);
  const [copied, setCopied] = useState(false);
  const current = state.code ?? code;

  async function copy() {
    try {
      await navigator.clipboard.writeText(current);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-md border border-zinc-300 px-3 py-2 font-mono text-lg tracking-widest dark:border-zinc-700">
          {current}
        </span>
        <button
          type="button"
          onClick={copy}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium dark:border-zinc-700"
        >
          {copied ? "Copiado" : "Copiar"}
        </button>
        <form
          action={formAction}
          onSubmit={(event) => {
            if (!confirm(STATEMENT_MESSAGES.regenerateConfirm)) event.preventDefault();
          }}
        >
          <input type="hidden" name="unitId" value={unitId} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-60"
          >
            {pending ? "Generando..." : "Regenerar código"}
          </button>
        </form>
      </div>
      {state.code ? (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
          Código nuevo generado. El anterior ya no sirve para registrarse.
        </p>
      ) : null}
      {state.error ? <p role="alert" className="text-sm text-red-600">{state.error}</p> : null}
    </div>
  );
}
