import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/api";
import {
  FEE_STATUS_LABEL,
  formatDay,
  formatMoney,
  PAY_MESSAGES,
  periodLabel,
} from "@/lib/estado-cuenta";
import { fetchFee } from "@/lib/estado-cuenta-api";
import { PayForm } from "./pay-form";

export const metadata: Metadata = {
  title: "Pagar cuota",
};

// H1: pago de una cuota Pendiente o Morosa con la pasarela simulada.
export default async function PagarCuotaPage(props: PageProps<"/cuotas/[cuotaId]/pagar">) {
  const user = await requireRole("RESIDENTE");
  if (!user) return null;

  const { cuotaId } = await props.params;
  const fee = await fetchFee(cuotaId);

  if (!fee) {
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <h1 className="text-2xl font-semibold">Pagar cuota</h1>
        <p role="alert" className="text-red-600">{PAY_MESSAGES.notFound}</p>
        <Link href="/estado-de-cuenta" className="underline underline-offset-4">Ver estado de cuenta</Link>
      </div>
    );
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Pagar cuota</h1>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <dt className="text-zinc-600 dark:text-zinc-400">Concepto</dt>
        <dd className="font-medium">{fee.concept}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Periodo</dt>
        <dd className="font-medium capitalize">{periodLabel(fee.period)}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Vencimiento</dt>
        <dd className="font-medium tabular-nums">{formatDay(fee.dueDate)}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Estado</dt>
        <dd className="font-medium">{FEE_STATUS_LABEL[fee.status]}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Monto total</dt>
        <dd className="text-lg font-semibold tabular-nums">{formatMoney(fee.amount)}</dd>
      </dl>

      {fee.status === "PAGADO" ? (
        <div className="flex flex-col items-start gap-3">
          <p role="status" className="font-medium">{PAY_MESSAGES.alreadyPaid}</p>
          <Link href="/estado-de-cuenta" className="rounded-md bg-primary hover:bg-primary-hover px-4 py-2 font-medium text-primary-foreground">
            Ver estado de cuenta
          </Link>
        </div>
      ) : (
        <PayForm feeId={fee.id} amount={fee.amount} />
      )}
    </div>
  );
}
