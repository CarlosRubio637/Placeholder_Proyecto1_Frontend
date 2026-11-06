"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { guardarAsamblea, type GuardarAsambleaState } from "@/app/actions/asambleas";
import { ahora } from "@/lib/fechas";
import {
  DEFAULT_OPTIONS,
  LIMITS,
  cleanAsamblea,
  validateAsamblea,
  type AsambleaValues,
} from "@/lib/validation/asamblea";
import { EliminarAsamblea } from "./eliminar-asamblea";

// Borrador en pantalla. Cada tema y opción lleva una `key` para React y una
// marca `touched` (el usuario ya pasó por ese campo), que decide cuándo se
// muestra su error. Así los errores siguen al campo aunque se quiten otros.
type OptionDraft = { key: string; text: string; touched: boolean };
type TopicDraft = { key: string; question: string; touched: boolean; options: OptionDraft[] };
type Draft = {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  topics: TopicDraft[];
};

type Props = {
  /** Con id se edita esa asamblea; sin id se crea una nueva. */
  id?: string;
  initial: AsambleaValues;
  /** Asamblea Abierta o Cerrada: se muestra sin poder modificarse. */
  readOnly?: boolean;
};

const initialState: GuardarAsambleaState = {};

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 aria-invalid:border-red-600 read-only:bg-zinc-50 dark:border-zinc-700 dark:focus:border-zinc-100 dark:read-only:bg-zinc-900";
const secondaryButtonClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700";
const cardClass = "rounded-xl border border-zinc-200 p-5 dark:border-zinc-800";

function newOption(text = ""): OptionDraft {
  return { key: crypto.randomUUID(), text, touched: false };
}

function newTopic(question = "", options: readonly string[] = DEFAULT_OPTIONS): TopicDraft {
  return {
    key: crypto.randomUUID(),
    question,
    touched: false,
    options: options.map((text) => newOption(text)),
  };
}

function toDraft(values: AsambleaValues): Draft {
  return {
    title: values.title,
    description: values.description,
    startsAt: values.startsAt,
    endsAt: values.endsAt,
    topics: values.topics.map((topic) => newTopic(topic.question, topic.options)),
  };
}

function toValues(draft: Draft): AsambleaValues {
  return {
    title: draft.title,
    description: draft.description,
    startsAt: draft.startsAt,
    endsAt: draft.endsAt,
    topics: draft.topics.map((topic) => ({
      question: topic.question,
      options: topic.options.map((option) => option.text),
    })),
  };
}

export function AsambleaForm({ id, initial, readOnly = false }: Props) {
  const [state, formAction, pending] = useActionState(guardarAsamblea, initialState);
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [touched, setTouched] = useState<{ title?: boolean; description?: boolean }>({});
  // Cambios hechos después del último envío: ocultan el error que mandó el servidor.
  const [dirty, setDirty] = useState(false);
  // "Ahora" para validar el inicio; se refresca cada 30 s mientras el formulario está abierto.
  const [now, setNow] = useState(() => ahora());
  const focusId = useRef<string | null>(null);

  useEffect(() => {
    if (readOnly) return;
    const timer = setInterval(() => setNow(ahora()), 30_000);
    return () => clearInterval(timer);
  }, [readOnly]);

  // Después de agregar un tema u opción, el foco pasa al campo nuevo.
  useEffect(() => {
    if (focusId.current) {
      document.getElementById(focusId.current)?.focus();
      focusId.current = null;
    }
  });

  const clean = cleanAsamblea(toValues(draft));
  const clientErrors = validateAsamblea(clean, now);
  const hasErrors = Object.keys(clientErrors).length > 0;
  const serverErrors = dirty ? undefined : state.errors;

  function errorFor(key: string, show: boolean) {
    if (show && clientErrors[key]) return clientErrors[key];
    return serverErrors?.[key];
  }

  function edit(update: (current: Draft) => Draft) {
    setDraft(update);
    setDirty(true);
  }

  function setField(field: "title" | "description" | "startsAt" | "endsAt", value: string) {
    edit((current) => ({ ...current, [field]: value }));
  }

  function updateTopic(index: number, update: (topic: TopicDraft) => TopicDraft) {
    edit((current) => ({
      ...current,
      topics: current.topics.map((topic, i) => (i === index ? update(topic) : topic)),
    }));
  }

  // Pasar por un campo (blur) no cuenta como cambio: no oculta el error del servidor.
  function touchTopic(index: number, update: (topic: TopicDraft) => TopicDraft) {
    setDraft((current) => ({
      ...current,
      topics: current.topics.map((topic, i) => (i === index ? update(topic) : topic)),
    }));
  }

  function addTopic() {
    if (draft.topics.length >= LIMITS.topicsMax) return;
    focusId.current = `topic-${draft.topics.length}-question`;
    edit((current) => ({ ...current, topics: [...current.topics, newTopic()] }));
  }

  function removeTopic(index: number) {
    if (draft.topics.length <= LIMITS.topicsMin) return;
    edit((current) => ({
      ...current,
      topics: current.topics.filter((_, i) => i !== index),
    }));
  }

  function addOption(topicIndex: number) {
    const topic = draft.topics[topicIndex];
    if (topic.options.length >= LIMITS.optionsMax) return;
    focusId.current = `topic-${topicIndex}-option-${topic.options.length}`;
    updateTopic(topicIndex, (t) => ({ ...t, options: [...t.options, newOption()] }));
  }

  function removeOption(topicIndex: number, optionIndex: number) {
    if (draft.topics[topicIndex].options.length <= LIMITS.optionsMin) return;
    updateTopic(topicIndex, (t) => ({
      ...t,
      options: t.options.filter((_, j) => j !== optionIndex),
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly || pending) return;

    const current = ahora();
    setNow(current);
    if (Object.keys(validateAsamblea(clean, current)).length > 0) {
      // Muestra todos los errores pendientes.
      setTouched({ title: true, description: true });
      setDraft((d) => ({
        ...d,
        topics: d.topics.map((topic) => ({
          ...topic,
          touched: true,
          options: topic.options.map((option) => ({ ...option, touched: true })),
        })),
      }));
      return;
    }

    setDirty(false);
    startTransition(() => formAction({ id, ...clean }));
  }

  const atMaxTopics = draft.topics.length >= LIMITS.topicsMax;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid items-start gap-6 lg:grid-cols-2"
    >
      {/* ——— Datos de la asamblea ——— */}
      <section aria-labelledby="asamblea-heading" className={`${cardClass} flex flex-col gap-5`}>
        <h2 id="asamblea-heading" className="text-lg font-semibold">
          Asamblea
        </h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="title" className="text-sm font-medium">
            Título
          </label>
          <input
            id="title"
            name="title"
            value={draft.title}
            readOnly={readOnly}
            onChange={(e) => setField("title", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, title: true }))}
            maxLength={LIMITS.titleMax}
            placeholder="Ej.: Elección de mesa directiva 2027"
            aria-invalid={errorFor("title", !!touched.title) ? true : undefined}
            aria-describedby={errorFor("title", !!touched.title) ? "title-error" : "title-hint"}
            className={inputClass}
          />
          <Feedback id="title" error={errorFor("title", !!touched.title)} hint={readOnly ? undefined : "5 a 100 caracteres"} />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="description" className="text-sm font-medium">
              Descripción
            </label>
            <span className="text-xs text-zinc-500 tabular-nums">
              {clean.description.length.toLocaleString("es-SV")}/
              {LIMITS.descriptionMax.toLocaleString("es-SV")}
            </span>
          </div>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={draft.description}
            readOnly={readOnly}
            onChange={(e) => setField("description", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, description: true }))}
            maxLength={LIMITS.descriptionMax}
            aria-invalid={errorFor("description", !!touched.description) ? true : undefined}
            aria-describedby={
              errorFor("description", !!touched.description)
                ? "description-error"
                : "description-hint"
            }
            className={`${inputClass} resize-y`}
          />
          <Feedback
            id="description"
            error={errorFor("description", !!touched.description)}
            hint={readOnly ? undefined : "Opcional, máximo 1,000"}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="startsAt" className="text-sm font-medium">
              Inicio
            </label>
            <input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              value={draft.startsAt}
              readOnly={readOnly}
              onChange={(e) => setField("startsAt", e.target.value)}
              aria-invalid={errorFor("startsAt", !readOnly) ? true : undefined}
              aria-describedby={errorFor("startsAt", !readOnly) ? "startsAt-error" : "startsAt-hint"}
              className={inputClass}
            />
            <Feedback
              id="startsAt"
              error={errorFor("startsAt", !readOnly)}
              hint={readOnly ? undefined : "Al menos 1 h después de ahora"}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="endsAt" className="text-sm font-medium">
              Cierre
            </label>
            <input
              id="endsAt"
              name="endsAt"
              type="datetime-local"
              value={draft.endsAt}
              readOnly={readOnly}
              onChange={(e) => setField("endsAt", e.target.value)}
              aria-invalid={errorFor("endsAt", !readOnly) ? true : undefined}
              aria-describedby={errorFor("endsAt", !readOnly) ? "endsAt-error" : "endsAt-hint"}
              className={inputClass}
            />
            <Feedback
              id="endsAt"
              error={errorFor("endsAt", !readOnly)}
              hint={readOnly ? undefined : "1 h a 14 días después del inicio"}
            />
          </div>
        </div>

        {readOnly ? null : (
          <>
            <p aria-live="polite" className="text-sm text-red-600">
              {state.formError}
              {state.conflict ? (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="font-medium underline underline-offset-4"
                  >
                    Recargar
                  </button>
                </>
              ) : null}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={hasErrors || pending}
                className="rounded-md bg-foreground px-4 py-2 font-medium text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Guardando…" : "Guardar"}
              </button>
              {id ? <EliminarAsamblea id={id} title={initial.title} /> : null}
              <Link href="/admin/asambleas" className="text-sm underline underline-offset-4">
                Cancelar
              </Link>
            </div>
          </>
        )}
      </section>

      {/* ——— Agenda ——— */}
      <section aria-labelledby="agenda-heading" className={`${cardClass} flex flex-col gap-5`}>
        <div>
          <h2 id="agenda-heading" className="text-lg font-semibold">
            Agenda ({draft.topics.length} de {LIMITS.topicsMax} temas)
          </h2>
          {clientErrors.topics || serverErrors?.topics ? (
            <p id="topics-error" className="mt-1 text-sm text-red-600">
              {clientErrors.topics ?? serverErrors?.topics}
            </p>
          ) : null}
        </div>

        {draft.topics.map((topic, i) => {
          const questionKey = `topics.${i}.question`;
          const optionsKey = `topics.${i}.options`;
          const optionsTouched = topic.options.some((option) => option.touched);
          const optionsError = errorFor(optionsKey, optionsTouched);
          const questionError = errorFor(questionKey, topic.touched);
          const atMaxOptions = topic.options.length >= LIMITS.optionsMax;
          const atMinOptions = topic.options.length <= LIMITS.optionsMin;

          return (
            <fieldset
              key={topic.key}
              aria-describedby={optionsError ? `topic-${i}-options-error` : undefined}
              className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <legend className="px-1 text-sm font-semibold">Tema {i + 1}</legend>

              <div className="flex flex-col gap-1">
                <label htmlFor={`topic-${i}-question`} className="text-sm font-medium">
                  Pregunta
                </label>
                <input
                  id={`topic-${i}-question`}
                  value={topic.question}
                  readOnly={readOnly}
                  onChange={(e) => updateTopic(i, (t) => ({ ...t, question: e.target.value }))}
                  onBlur={() => touchTopic(i, (t) => ({ ...t, touched: true }))}
                  maxLength={LIMITS.questionMax}
                  placeholder="Ej.: ¿Qué planilla integra la mesa directiva 2027?"
                  aria-invalid={questionError ? true : undefined}
                  aria-describedby={
                    questionError ? `topic-${i}-question-error` : `topic-${i}-question-hint`
                  }
                  className={inputClass}
                />
                <Feedback
                  id={`topic-${i}-question`}
                  error={questionError}
                  hint={readOnly ? undefined : "5 a 200 caracteres"}
                />
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">
                  Opciones <span className="font-normal text-zinc-500">(2 a 6, sin repetirse)</span>
                </p>
                <ul className="flex flex-col gap-2">
                  {topic.options.map((option, j) => {
                    const optionError = errorFor(`topics.${i}.options.${j}`, option.touched);
                    return (
                      <li key={option.key} className="flex flex-col gap-1">
                        <div className="flex items-start gap-2">
                          <label htmlFor={`topic-${i}-option-${j}`} className="sr-only">
                            Opción {j + 1} del tema {i + 1}
                          </label>
                          <input
                            id={`topic-${i}-option-${j}`}
                            value={option.text}
                            readOnly={readOnly}
                            onChange={(e) =>
                              updateTopic(i, (t) => ({
                                ...t,
                                options: t.options.map((o, k) =>
                                  k === j ? { ...o, text: e.target.value } : o,
                                ),
                              }))
                            }
                            onBlur={() =>
                              touchTopic(i, (t) => ({
                                ...t,
                                options: t.options.map((o, k) =>
                                  k === j ? { ...o, touched: true } : o,
                                ),
                              }))
                            }
                            maxLength={LIMITS.optionMax}
                            placeholder={`Opción ${j + 1}`}
                            aria-invalid={optionError ? true : undefined}
                            aria-describedby={optionError ? `topic-${i}-option-${j}-error` : undefined}
                            className={inputClass}
                          />
                          {readOnly ? null : (
                            <button
                              type="button"
                              onClick={() => removeOption(i, j)}
                              disabled={atMinOptions}
                              aria-label={`Quitar la opción ${j + 1} del tema ${i + 1}`}
                              className={`${secondaryButtonClass} shrink-0`}
                            >
                              Quitar
                            </button>
                          )}
                        </div>
                        {optionError ? (
                          <p id={`topic-${i}-option-${j}-error`} className="text-sm text-red-600">
                            {optionError}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                {optionsError ? (
                  <p id={`topic-${i}-options-error`} className="text-sm text-red-600">
                    {optionsError}
                  </p>
                ) : null}
              </div>

              {readOnly ? null : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => addOption(i)}
                    disabled={atMaxOptions}
                    className={secondaryButtonClass}
                  >
                    Agregar opción (máx. {LIMITS.optionsMax})
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTopic(i)}
                    disabled={draft.topics.length <= LIMITS.topicsMin}
                    aria-label={`Quitar el tema ${i + 1}`}
                    className={`${secondaryButtonClass} text-red-700 dark:text-red-400`}
                  >
                    Quitar tema
                  </button>
                </div>
              )}
            </fieldset>
          );
        })}

        {readOnly ? null : (
          <div>
            <button
              type="button"
              onClick={addTopic}
              disabled={atMaxTopics}
              className={secondaryButtonClass}
            >
              Agregar tema
            </button>
            {atMaxTopics ? (
              <p className="mt-1 text-sm text-zinc-500">
                Llegaste al máximo de {LIMITS.topicsMax} temas.
              </p>
            ) : null}
          </div>
        )}
      </section>
    </form>
  );
}

// Muestra el error del campo; si no hay, la ayuda en gris.
function Feedback({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error) {
    return (
      <p id={`${id}-error`} className="text-sm text-red-600">
        {error}
      </p>
    );
  }
  if (!hint) return null;
  return (
    <p id={`${id}-hint`} className="text-sm text-zinc-500">
      {hint}
    </p>
  );
}
