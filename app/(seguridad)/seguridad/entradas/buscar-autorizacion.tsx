"use client";

import { useState } from "react";
import { buscarVisita } from "@/app/actions/entradas";
import {
  STATUS_LABELS,
  documentLabel,
  formatHora,
  puedeEntrar,
  type VisitaPorteria,
} from "@/lib/entradas";
import { formatDateEs } from "@/lib/validation/visita";
import { validateSearch } from "@/lib/validation/entrada";
import { RegistrarEntradaButton } from "./registrar-entrada-button";

const inputClass =
  "w-full max-w-sm rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 aria-invalid:border-red-600 dark:border-zinc-700 dark:focus:border-zinc-100";

type Props = { onEntry: (message: string) => void };

// Busca una autorización de hoy por código o documento y muestra cada
// resultado con su estado; si está Autorizada y vigente, el botón de entrada.
export function BuscarAutorizacion({ onEntry }: Props) {
  const [query, setQuery] = useState("");
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [results, setResults] = useState<VisitaPorteria[]>([]);
  const [error, setError] = useState<string | undefined>();

  const invalid = validateSearch(query);
  const showInvalid = touched && invalid;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (invalid || pending) return;
    setPending(true);
    const res = await buscarVisita(query);
    setPending(false);
    setResults(res.data ?? []);
    setError(res.error);
  }

  function entered(message: string) {
    setResults([]);
    setQuery("");
    setTouched(false);
    onEntry(message);
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-1">
        <label htmlFor="buscar-visita" className="text-sm font-medium">
          Código o número de documento
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="buscar-visita"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => setTouched(query.length > 0)}
            placeholder="Ej. K7M2QX o 01234567-8"
            autoComplete="off"
            aria-invalid={showInvalid ? true : undefined}
            aria-describedby={showInvalid ? "buscar-visita-error" : undefined}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-foreground px-4 py-2 font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Buscando…" : "Buscar"}
          </button>
        </div>
        {showInvalid ? (
          <p id="buscar-visita-error" className="text-sm text-red-600">
            {invalid}
          </p>
        ) : null}
      </form>

      {error && !showInvalid ? (
        <p role="status" className="rounded-md border border-dashed border-zinc-300 px-4 py-3 text-sm dark:border-zinc-700">
          {error}
        </p>
      ) : null}

      {results.map((visita) => (
        <article
          key={visita.id}
          aria-label={`Autorización de ${visita.visitorName}`}
          className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">{visita.visitorName}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {documentLabel(visita.documentType, visita.documentNumber)}
              </p>
            </div>
            <span className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs font-medium dark:border-zinc-700">
              {STATUS_LABELS[visita.status]}
            </span>
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div>
              <dt className="inline text-zinc-500">Unidad: </dt>
              <dd className="inline">{visita.unitCode}</dd>
            </div>
            <div>
              <dt className="inline text-zinc-500">Fecha: </dt>
              <dd className="inline">{formatDateEs(visita.visitDate)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="inline text-zinc-500">Motivo: </dt>
              <dd className="inline break-words">{visita.reason}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="inline text-zinc-500">Vigencia: </dt>
              <dd className="inline">
                {formatHora(visita.validFrom)} a {formatHora(visita.validUntil)}
              </dd>
            </div>
          </dl>
          {puedeEntrar(visita) ? (
            <RegistrarEntradaButton visitId={visita.id} onEntry={entered} />
          ) : visita.status === "AUTORIZADA" ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              La autorización no es válida en este horario.
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
