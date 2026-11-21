import type { Metadata } from "next";
import Link from "next/link";
import { requireAnyRole } from "@/lib/api";
import {
  FEE_STATUS_LABEL,
  formatDateTime,
  formatMoney,
  PAY_MESSAGES,
  PAYMENT_STATUS_LABEL,
  periodLabel,
} from "@/lib/estado-cuenta";
import { fetchReceipt } from "@/lib/estado-cuenta-api";
import { PrintButton } from "./print-button";

export const metadata: Metadata = {
  title: "Recibo de pago",
};

// H1: recibo de un pago. Entran el Residente de la unidad y el Administrador.
export default async function ReciboPage(props: PageProps<"/pagos/[pagoId]/recibo">) {
  const user = await requireAnyRole(["RESIDENTE", "ADMINISTRADOR"]);
  if (!user) return null;

  const { pagoId } = await props.params;
  const query = await props.searchParams;
  const receipt = await fetchReceipt(pagoId);

  if (!receipt) {
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <h1 className="text-2xl font-semibold">Recibo de pago</h1>
        <p role="alert" className="text-red-600">El pago no existe.</p>
      </div>
    );
  }

  const approved = receipt.status === "APROBADO";
  const back = user.role === "RESIDENTE" ? "/estado-de-cuenta" : "/";

  return (
    <div className="flex max-w-xl flex-col gap-6">
      {query.aviso === "pago-aprobado" ? (
        <p role="status" className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 print:hidden dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
          {PAY_MESSAGES.approved}
        </p>
      ) : null}
      <h1 className="text-2xl font-semibold">Recibo de pago</h1>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <dt className="text-zinc-600 dark:text-zinc-400">Transacción</dt>
        <dd className="font-mono font-medium">{receipt.transactionNumber}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Fecha y hora</dt>
        <dd className="font-medium tabular-nums">{formatDateTime(receipt.createdAt)}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Unidad</dt>
        <dd className="font-medium">{receipt.unit.code}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Concepto</dt>
        <dd className="font-medium">{receipt.fee.concept}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Periodo</dt>
        <dd className="font-medium capitalize">{periodLabel(receipt.fee.period)}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Monto</dt>
        <dd className="font-medium tabular-nums">{formatMoney(receipt.amount)}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Tarjeta</dt>
        <dd className="font-medium tabular-nums">•••• {receipt.cardLast4}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Titular</dt>
        <dd className="font-medium">{receipt.holderName}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Estado</dt>
        <dd className="font-medium">
          {approved ? FEE_STATUS_LABEL.PAGADO : `${PAYMENT_STATUS_LABEL[receipt.status]}: ${receipt.failureReason ?? ""}`}
        </dd>
      </dl>
      <div className="flex items-center gap-4 print:hidden">
        <PrintButton />
        <Link href={back} className="text-sm underline underline-offset-4">
          {user.role === "RESIDENTE" ? "Ver estado de cuenta" : "Ir al inicio"}
        </Link>
      </div>
    </div>
  );
}
