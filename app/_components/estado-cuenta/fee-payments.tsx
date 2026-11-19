"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { cargarPagosCuota } from "@/app/actions/pagos";
import {
  formatDateTime,
  formatMoney,
  PAYMENT_STATUS_LABEL,
  type FeePayment,
} from "@/lib/estado-cuenta";

// H2: al expandir una cuota se cargan sus pagos, del más reciente al más antiguo.
export function FeePayments({ feeId, colSpan }: { feeId: string; colSpan: number }) {
  const [open, setOpen] = useState(false);
  const [payments, setPayments] = useState<FeePayment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      startTransition(async () => {
        const result = await cargarPagosCuota(feeId);
        setPayments(result.data ?? null);
        setError(result.error ?? null);
      });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={`pagos-${feeId}`}
        className="text-sm underline underline-offset-4"
      >
        {open ? "Ocultar pagos" : "Ver pagos"}
      </button>
      {open ? (
        <PaymentsRow id={`pagos-${feeId}`} colSpan={colSpan}>
          {pending ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Cargando pagos…</p>
          ) : error ? (
            <p role="alert" className="text-sm text-red-600">{error}</p>
          ) : !payments || payments.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Esta cuota no tiene pagos.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-1 pr-4">Fecha y hora</th>
                  <th className="py-1 pr-4">Transacción</th>
                  <th className="py-1 pr-4">Monto</th>
                  <th className="py-1 pr-4">Tarjeta</th>
                  <th className="py-1 pr-4">Estado</th>
                  <th className="py-1 pr-4">Motivo</th>
                  <th className="py-1"><span className="sr-only">Recibo</span></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-1 pr-4 whitespace-nowrap tabular-nums">{formatDateTime(p.createdAt)}</td>
                    <td className="py-1 pr-4 font-mono">{p.transactionNumber}</td>
                    <td className="py-1 pr-4 tabular-nums">{formatMoney(p.amount)}</td>
                    <td className="py-1 pr-4 tabular-nums">•••• {p.cardLast4}</td>
                    <td className="py-1 pr-4">{PAYMENT_STATUS_LABEL[p.status]}</td>
                    <td className="py-1 pr-4">{p.failureReason ?? "—"}</td>
                    <td className="py-1">
                      {p.status === "APROBADO" ? (
                        <Link href={`/pagos/${p.id}/recibo`} className="underline underline-offset-4">
                          Ver recibo
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </PaymentsRow>
      ) : null}
    </>
  );
}

// Los pagos se muestran debajo del botón, dentro de la celda de la cuota.
function PaymentsRow({ id, children }: { id: string; colSpan: number; children: React.ReactNode }) {
  return (
    <div id={id} className="mt-3 rounded-md bg-zinc-50 p-3 dark:bg-zinc-900">
      {children}
    </div>
  );
}
