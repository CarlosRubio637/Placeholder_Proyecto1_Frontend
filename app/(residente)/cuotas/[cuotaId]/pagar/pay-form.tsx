"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { pagarCuota, type PagoState } from "@/app/actions/pagos";
import {
  formatMoney,
  groupCardNumber,
  PAY_MESSAGES,
  validateCard,
  type CardField,
  type CardValues,
} from "@/lib/estado-cuenta";

const initialState: PagoState = {};
const empty: CardValues = { cardNumber: "", expiry: "", cvv: "", holderName: "" };

function todaySV(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/El_Salvador",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-invalid:border-red-600 dark:border-zinc-700 dark:focus:border-zinc-100";

// H1: datos de la tarjeta. Viven solo en el estado local y se pierden al salir.
// La llave de idempotencia se genera al abrir la pantalla; un doble clic o un
// reenvío usan la misma, así el backend no cobra dos veces. Después de un
// rechazo se genera otra, para poder intentar con otra tarjeta.
export function PayForm({ feeId, amount }: { feeId: string; amount: number }) {
  const [values, setValues] = useState<CardValues>(empty);
  const [touched, setTouched] = useState<Partial<Record<CardField, boolean>>>({});
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [state, formAction, pending] = useActionState(async (prev: PagoState, formData: FormData) => {
    const next = await pagarCuota(prev, formData);
    if (next.rejected || next.formError) setKey(crypto.randomUUID());
    return next;
  }, initialState);
  const [staleState, setStaleState] = useState<PagoState | null>(null);

  const clientErrors = validateCard(values, todaySV());
  const hasErrors = Object.keys(clientErrors).length > 0;
  const serverState = staleState === state ? initialState : state;

  function errorFor(field: CardField) {
    return (touched[field] ? clientErrors[field] : undefined) ?? serverState.errors?.[field];
  }
  function update(field: CardField, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
    setStaleState(state);
  }

  if (state.alreadyPaid) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="font-medium">{PAY_MESSAGES.alreadyPaid}</p>
        <Link href="/estado-de-cuenta" className="rounded-md bg-primary hover:bg-primary-hover px-4 py-2 font-medium text-primary-foreground">
          Ver estado de cuenta
        </Link>
      </div>
    );
  }

  function field(
    name: CardField,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement>,
    format: (value: string) => string = (v) => v,
  ) {
    const error = errorFor(name);
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={`pago-${name}`} className="text-sm font-medium">{label}</label>
        <input
          id={`pago-${name}`}
          name={name}
          value={values[name]}
          onChange={(e) => update(name, format(e.target.value))}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `pago-${name}-error` : undefined}
          autoComplete="off"
          className={inputClass}
          {...props}
        />
        {error ? <p id={`pago-${name}-error`} className="text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  };

  return (
    <form
      action={formAction}
      noValidate
      onSubmit={(event) => {
        // Un segundo clic mientras procesa no envía otra solicitud.
        if (pending) event.preventDefault();
        setTouched({ cardNumber: true, expiry: true, cvv: true, holderName: true });
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="feeId" value={feeId} />
      <input type="hidden" name="idempotencyKey" value={key} />
      {field("cardNumber", "Número de tarjeta", { inputMode: "numeric", placeholder: "4242 4242 4242 4242", maxLength: 19 }, groupCardNumber)}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("expiry", "Vencimiento (MM/AA)", { inputMode: "numeric", placeholder: "12/30", maxLength: 5 }, formatExpiry)}
        {field("cvv", "Código de seguridad", { type: "password", inputMode: "numeric", maxLength: 3 }, (v) => v.replace(/\D/g, "").slice(0, 3))}
      </div>
      {field("holderName", "Nombre del titular", { maxLength: 60, placeholder: "Como aparece en la tarjeta" })}

      {serverState.rejected ? (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
          {serverState.rejected}
        </p>
      ) : null}
      <p aria-live="polite" className="min-h-5 text-sm text-red-600">{serverState.formError}</p>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending || hasErrors}
          className="rounded-md bg-primary hover:bg-primary-hover px-4 py-2 font-medium text-primary-foreground transition-opacity disabled:opacity-60"
        >
          {pending ? PAY_MESSAGES.processing : `Pagar ${formatMoney(amount)}`}
        </button>
        <Link href="/estado-de-cuenta" className="text-sm underline underline-offset-4">Cancelar</Link>
      </div>
      <p className="text-xs text-zinc-500">
        Pasarela de prueba: 4242 4242 4242 4242 aprueba; 4000 0000 0000 0002 rechaza por fondos insuficientes.
      </p>
    </form>
  );
}
