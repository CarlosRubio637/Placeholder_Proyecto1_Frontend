"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registro, type RegistroState } from "@/app/actions/registro";
import type { RegistroField } from "@/lib/validation/registro";

const initialState: RegistroState = {};

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 aria-invalid:border-red-600 dark:border-zinc-700 dark:focus:border-zinc-100";

type FieldProps = {
  name: RegistroField;
  label: string;
  hint?: string;
  state: RegistroState;
} & React.InputHTMLAttributes<HTMLInputElement>;

function Field({ name, label, hint, state, ...inputProps }: FieldProps) {
  const error = state.errors?.[name];
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;
  const values = state.values as Partial<Record<RegistroField, string>> | undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={values?.[name]}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={inputClass}
        {...inputProps}
      />
      {error ? (
        <p id={`${name}-error`} className="text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${name}-hint`} className="text-sm text-zinc-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function RegistroForm() {
  const [state, formAction, pending] = useActionState(registro, initialState);

  return (
    // `key` vuelve a montar el formulario con los valores devueltos por el
    // servidor después de cada intento (React limpia el form al enviarlo).
    <form
      key={JSON.stringify(state.values ?? {})}
      action={formAction}
      noValidate
      className="flex flex-col gap-4"
    >
      <Field
        state={state}
        name="fullName"
        label="Nombre completo"
        hint="2 a 80 caracteres"
        autoComplete="name"
        maxLength={80}
      />
      <Field
        state={state}
        name="email"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        maxLength={254}
      />
      <Field
        state={state}
        name="phone"
        label="Teléfono"
        hint="Formato 0000-0000"
        type="tel"
        autoComplete="tel"
        inputMode="numeric"
        maxLength={9}
        placeholder="0000-0000"
      />
      <Field
        state={state}
        name="unitCode"
        label="Código de unidad"
        hint="8 caracteres en mayúsculas"
        autoComplete="off"
        maxLength={8}
        spellCheck={false}
        className={`${inputClass} font-mono uppercase`}
        onInput={(event) => {
          event.currentTarget.value = event.currentTarget.value.toUpperCase();
        }}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          state={state}
          name="password"
          label="Contraseña"
          hint="8 a 72, con minúscula, mayúscula y número"
          type="password"
          autoComplete="new-password"
          maxLength={72}
        />
        <Field
          state={state}
          name="confirmPassword"
          label="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          maxLength={72}
        />
      </div>

      <p aria-live="polite" className="min-h-5 text-sm text-red-600">
        {state.formError}
      </p>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-foreground px-4 py-2 font-medium text-background transition-opacity disabled:opacity-60"
      >
        {pending ? "Creando cuenta..." : "Crear cuenta"}
      </button>

      <Link href="/login" className="text-sm underline underline-offset-4">
        Ya tengo cuenta
      </Link>
    </form>
  );
}
