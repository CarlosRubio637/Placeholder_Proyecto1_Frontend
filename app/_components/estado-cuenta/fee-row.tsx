"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { cargarPagosCuota } from "@/app/actions/pagos";
import {
  FEE_STATUS_LABEL,
  formatDateTime,
  formatDay,
  formatMoney,
  PAYMENT_STATUS_LABEL,
  periodLabel,
  type FeePayment,
  type FeeStatus,
  type StatementFee,
} from "@/lib/estado-cuenta";

const STATUS_STYLE: Record<FeeStatus, string> = {
  PENDIENTE: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  PAGADO: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  MOROSO: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

// H2: fila de una cuota. "Ver pagos" la expande con una fila completa debajo
// que carga sus pagos, del más reciente al más antiguo.
export function FeeRow({ fee, readOnly, columns }: { fee: StatementFee; readOnly: boolean; columns: number }) {
  const [open, setOpen] = useState(false);
  const [payments, setPayments] = useState<FeePayment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const detailId = `pagos-${fee.id}`;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      startTransition(async () => {
        const result = await cargarPagosCuota(fee.id);
        setPayments(result.data ?? null);
        setError(result.error ?? null);
      });
    }
  }

  return (
    <>
      <tr className="align-top">
        <td className="px-4 py-3 whitespace-nowrap capitalize">{periodLabel(fee.period)}</td>
        <td className="px-4 py-3">{fee.concept}</td>
        <td className="px-4 py-3 whitespace-nowrap tabular-nums">{formatMoney(fee.amount)}</td>
        <td className="px-4 py-3 whitespace-nowrap tabular-nums">{formatDay(fee.dueDate)}</td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[fee.status]}`}>
            {FEE_STATUS_LABEL[fee.status]}
          </span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls={detailId}
            className="text-sm underline underline-offset-4"
          >
            {open ? "Ocultar pagos" : "Ver pagos"}
          </button>
        </td>
        {readOnly ? null : (
          <td className="px-4 py-3">
            {fee.status !== "PAGADO" ? (
              <Link
                href={`/cuotas/${fee.id}/pagar`}
                className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
              >
                Pagar
              </Link>
            ) : null}
          </td>
        )}
      </tr>
      {open ? (
        <tr id={detailId}>
          <td colSpan={columns} className="bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
            {pending ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Cargando pagos…</p>
            ) : error ? (
              <p role="alert" className="text-sm text-red-600">{error}</p>
            ) : !payments || payments.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Esta cuota no tiene pagos.</p>
            ) : (
              <div className="overflow-x-auto">
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
                        <td className="py-1 pr-4 whitespace-nowrap font-mono">{p.transactionNumber}</td>
                        <td className="py-1 pr-4 whitespace-nowrap tabular-nums">{formatMoney(p.amount)}</td>
                        <td className="py-1 pr-4 whitespace-nowrap tabular-nums">•••• {p.cardLast4}</td>
                        <td className="py-1 pr-4">{PAYMENT_STATUS_LABEL[p.status]}</td>
                        <td className="py-1 pr-4">{p.failureReason ?? "—"}</td>
                        <td className="py-1 whitespace-nowrap">
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
              </div>
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
}
