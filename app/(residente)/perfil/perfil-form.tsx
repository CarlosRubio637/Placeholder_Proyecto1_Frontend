"use client";

import { useActionState, useState } from "react";
import { guardarPerfil, type GuardarState } from "@/app/actions/perfil";
import { previewCard, VISIBILITY_OPTIONS, type DirectoryPrefs, type Perfil, type VisibilityKey } from "@/lib/perfil";
import { sameValues, turnOn, validatePerfil, type PerfilField, type PerfilValues } from "@/lib/validation/perfil";

const initialState: GuardarState = {};

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 aria-invalid:border-red-600 dark:border-zinc-700 dark:focus:border-zinc-100";

const readOnlyClass =
  "w-full rounded-md border border-zinc-200 bg-zinc-100 px-3 py-2 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300";

function valuesOf(perfil: Perfil): PerfilValues {
  return { phone: perfil.phone, directory: { ...perfil.directory } };
}

export function PerfilForm({ perfil }: { perfil: Perfil }) {
  const [state, formAction, pending] = useActionState(guardarPerfil, initialState);
  const [current, setCurrent] = useState<Perfil>(perfil);
  const [baseline, setBaseline] = useState<PerfilValues>(() => valuesOf(perfil));
  const [values, setValues] = useState<PerfilValues>(() => valuesOf(perfil));
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [seenState, setSeenState] = useState(state);
  const [editedSinceSubmit, setEditedSinceSubmit] = useState(false);

  if (state !== seenState) {
    setSeenState(state);
    setEditedSinceSubmit(false);
    if (state.saved) {
      const saved = valuesOf(state.saved);
      setCurrent(state.saved);
      setBaseline(saved);
      setValues(saved);
      setPhoneTouched(false);
    }
  }

  const clientErrors = validatePerfil(values);
  const hasErrors = Object.keys(clientErrors).length > 0;
  const unchanged = sameValues(values, baseline);
  const serverState = editedSinceSubmit ? initialState : state;
  const card = previewCard(current, values.phone.trim(), values.directory);

  function errorFor(field: PerfilField) {
    const clientError = field === "phone" && !phoneTouched ? undefined : clientErrors[field];
    return clientError ?? serverState.errors?.[field];
  }

  function edit(patch: Partial<PerfilValues>) {
    setValues((prev) => ({ ...prev, ...patch }));
    setEditedSinceSubmit(true);
  }

  function setVisible(visible: boolean) {
    const directory: DirectoryPrefs = visible ? turnOn(values.directory) : { ...values.directory, visible: false };
    edit({ directory });
  }

  function setOption(key: VisibilityKey, checked: boolean) {
    edit({ directory: { ...values.directory, [key]: checked } });
  }

  const phoneError = errorFor("phone");
  const nameError = errorFor("directory.showName");

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
      <section aria-label="Mis datos" className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <form action={formAction} noValidate className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <label htmlFor="fullName" className="text-sm font-medium">
              Nombre completo
            </label>
            <input id="fullName" value={current.fullName} readOnly className={readOnlyClass} />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-medium">
                Correo
              </label>
              <input id="email" value={current.email} readOnly className={readOnlyClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="unitCode" className="text-sm font-medium">
                Unidad
              </label>
              <input id="unitCode" value={current.unitCode ?? ""} readOnly className={readOnlyClass} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="phone" className="text-sm font-medium">
              Teléfono
            </label>
            <input
              id="phone"
              name="phone"
              inputMode="tel"
              value={values.phone}
              onChange={(e) => {
                edit({ phone: e.target.value });
                setPhoneTouched(true);
              }}
              disabled={pending}
              maxLength={20}
              aria-invalid={phoneError ? true : undefined}
              aria-describedby={phoneError ? "phone-error" : "phone-hint"}
              className={inputClass}
            />
            {phoneError ? (
              <p id="phone-error" role="alert" className="text-sm text-red-600">
                {phoneError}
              </p>
            ) : (
              <p id="phone-hint" className="text-sm text-zinc-500">
                Formato 0000-0000
              </p>
            )}
          </div>

          <fieldset disabled={pending} className="flex min-w-0 flex-col gap-3">
            <legend className="sr-only">Privacidad en el directorio</legend>
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                role="switch"
                checked={values.directory.visible}
                onChange={(e) => setVisible(e.target.checked)}
                className="h-5 w-9 accent-emerald-700"
              />
              Aparecer en el directorio
            </label>
            <div className="flex flex-col gap-2 pl-1">
              {VISIBILITY_OPTIONS.map((option) => (
                <label
                  key={option.key}
                  className={`flex items-center gap-2 text-sm ${values.directory.visible ? "" : "text-zinc-400"}`}
                >
                  <input
                    type="checkbox"
                    disabled={!values.directory.visible}
                    checked={values.directory[option.key]}
                    onChange={(e) => setOption(option.key, e.target.checked)}
                    aria-describedby={option.key === "showName" && nameError ? "showName-error" : undefined}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {nameError && (
              <p id="showName-error" role="alert" className="text-sm text-red-600">
                {nameError}
              </p>
            )}
          </fieldset>

          {(["visible", ...VISIBILITY_OPTIONS.map((option) => option.key)] as (keyof DirectoryPrefs)[]).map((key) => (
            <input key={key} type="hidden" name={key} value={values.directory[key] ? "on" : ""} />
          ))}

          <p aria-live="polite" className="text-sm">
            {!editedSinceSubmit && state.saved && <span className="text-emerald-700">Preferencias guardadas</span>}
            {serverState.formError && <span className="text-red-600">{serverState.formError}</span>}
          </p>

          <button
            type="submit"
            disabled={unchanged || hasErrors || pending}
            className="w-full rounded-md bg-foreground px-4 py-2.5 font-medium text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Guardando..." : "Guardar"}
          </button>
        </form>
      </section>

      <aside aria-label="Así te verán tus vecinos" className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Así te verán tus vecinos</h2>
        <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          {card ? (
            <dl className="flex flex-col gap-1 break-words">
              {card.name && (
                <>
                  <dt className="sr-only">Nombre</dt>
                  <dd className="font-semibold">{card.name}</dd>
                </>
              )}
              {card.unit && (
                <>
                  <dt className="sr-only">Unidad</dt>
                  <dd className="text-sm text-zinc-600 dark:text-zinc-400">{card.unit}</dd>
                </>
              )}
              {card.phone && (
                <>
                  <dt className="sr-only">Teléfono</dt>
                  <dd className="text-sm">{card.phone}</dd>
                </>
              )}
              {card.email && (
                <>
                  <dt className="sr-only">Correo</dt>
                  <dd className="text-sm">{card.email}</dd>
                </>
              )}
            </dl>
          ) : (
            <p className="text-sm text-zinc-500">No apareces en el directorio.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
