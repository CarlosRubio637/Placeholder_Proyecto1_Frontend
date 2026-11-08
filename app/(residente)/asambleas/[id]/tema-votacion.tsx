"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { emitirVoto, type EmitirVotoState } from "@/app/actions/votaciones";
import {
  formatFechaLarga,
  type MyUnitVote,
  type Opcion,
  type Tema,
} from "@/lib/votaciones-client";

type Props = { tema: Tema; index: number };

const initialState: EmitirVotoState | null = null;

const inputRadioClass =
  "size-4 border-zinc-400 text-foreground focus:ring-foreground dark:border-zinc-600";

// Componente de un tema (H23). Radios de opciones, botón Votar y diálogo de
// confirmación. Si la unidad ya votó, el formulario se reemplaza por el aviso
// "Ya votaste / Tu unidad ya votó".
export function TemaVotacion({ tema, index }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(emitirVoto, initialState);

  // La opción seleccionada vive en el estado local hasta que el residente
  // pulsa Votar y confirma. No se guarda en ningún lado hasta entonces.
  const [optionId, setOptionId] = useState<string>("");

  // Si el server actualiza el voto en la base, el detalle del Server Component
  // vuelve a pedirse por revalidatePath y myUnitVote llega con valor. Esto se
  // deja como respaldo optimista para mostrar el estado "Ya votaste" al toque.
  const [localVote, setLocalVote] = useState<MyUnitVote | null>(null);
  const alreadyVoted = tema.myUnitVote ?? localVote;

  function openConfirm() {
    if (!optionId || pending) return;
    dialog.current?.showModal();
  }

  function closeConfirm() {
    dialog.current?.close();
  }

  function confirm() {
    closeConfirm();
    const now = new Date().toISOString();
    startTransition(() => {
      void formAction({ topicId: tema.id, optionId });
    });
    // Actualización optimista: deja al tema en "Ya votaste" mientras el server
    // responde. Si el server dice que no, el estado se corrige abajo.
    setLocalVote({ votedAt: now, byMe: true });
  }

  // Si el server rechaza, limpia el estado optimista.
  if (state && state.status !== "ok" && localVote) {
    setLocalVote(null);
  }

  const selectedOption = tema.options.find((option) => option.id === optionId);

  return (
    <section
      aria-labelledby={`tema-${tema.id}-titulo`}
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
    >
      <h2 id={`tema-${tema.id}-titulo`} className="text-lg font-semibold">
        Tema {index + 1}. {tema.question}
      </h2>

      {alreadyVoted ? (
        <AvisoYaVotaste voto={alreadyVoted} />
      ) : (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">
              Elige una opción para el tema {index + 1}
            </legend>
            {tema.options.map((option) => (
              <OpcionRadio
                key={option.id}
                opcion={option}
                name={`tema-${tema.id}`}
                checked={optionId === option.id}
                onChange={() => setOptionId(option.id)}
                disabled={pending}
              />
            ))}
          </fieldset>

          {state && state.status !== "ok" ? (
            <p role="alert" className="text-sm text-red-600">
              {state.message}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openConfirm}
              disabled={!optionId || pending}
              className="rounded-md bg-foreground px-4 py-2 font-medium text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Enviando…" : "Votar"}
            </button>
            {!optionId ? (
              <span className="text-sm text-zinc-500">Elige una opción</span>
            ) : null}
          </div>
        </>
      )}

      <dialog
        ref={dialog}
        aria-labelledby={`tema-${tema.id}-confirmacion`}
        className="m-auto w-full max-w-md rounded-xl border border-zinc-200 bg-background p-6 text-foreground backdrop:bg-black/50 dark:border-zinc-800"
      >
        <h3 id={`tema-${tema.id}-confirmacion`} className="text-lg font-semibold">
          Tu voto es definitivo y secreto. ¿Votar “{selectedOption?.text ?? ""}” en el tema “{tema.question}”?
        </h3>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={closeConfirm}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium dark:border-zinc-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background"
          >
            Votar
          </button>
        </div>
      </dialog>
    </section>
  );
}

function OpcionRadio({
  opcion,
  name,
  checked,
  onChange,
  disabled,
}: {
  opcion: Opcion;
  name: string;
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
}) {
  return (
    <label className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900">
      <input
        type="radio"
        name={name}
        value={opcion.id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={inputRadioClass}
      />
      <span>{opcion.text}</span>
    </label>
  );
}

function AvisoYaVotaste({ voto }: { voto: MyUnitVote }) {
  // "Ya votaste" si el residente mismo emitió el voto; "Tu unidad ya votó" si
  // fue otro residente de la misma unidad. Nunca se revela la opción.
  const texto = voto.byMe ? "Ya votaste" : "Tu unidad ya votó";
  return (
    <p
      role="status"
      className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
    >
      {texto} · {formatFechaLarga(voto.votedAt)}
    </p>
  );
}