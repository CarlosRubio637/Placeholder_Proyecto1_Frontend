"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cancelarVisita, responderVisita } from "@/app/actions/visitas";
import {
  MESSAGES,
  POLL_MS,
  REJECT_REASON_MAX,
  STATUS_LABELS,
  documentLabel,
  formatFecha,
  horaLabel,
  minutosRestantes,
  type MiVisita,
} from "@/lib/mis-visitas";

type Props = { visitas: MiVisita[]; poll: boolean };

const thClass = "px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500";
const tdClass = "px-4 py-3 align-top text-sm";
const smallButton = "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-zinc-700";
const primaryButton = "rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:opacity-50";

type Pending = { kind: "cancel" | "reject"; visita: MiVisita };

// Tabla de "Mis visitas" (H15) con Cancelar, Aprobar y Rechazar. En Activas
// vuelve a pedir la lista cada 15 segundos.
export function VisitasTabla({ visitas, poll }: Props) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ ok?: string; error?: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!poll) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      router.refresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [poll, router]);

  function open(next: Pending) {
    setPending(next);
    setReason("");
    dialog.current?.showModal();
  }

  async function run(id: string, action: () => Promise<{ ok?: string; error?: string }>) {
    setBusy(id);
    setAviso(null);
    const result = await action();
    setBusy(null);
    setAviso(result);
    router.refresh();
  }

  function confirm() {
    if (!pending) return;
    dialog.current?.close();
    const { kind, visita } = pending;
    if (kind === "cancel") void run(visita.id, () => cancelarVisita(visita.id));
    else void run(visita.id, () => responderVisita(visita.id, "RECHAZAR", reason));
  }

  const reasonTooLong = reason.trim().length > REJECT_REASON_MAX;

  return (
    <div className="flex flex-col gap-3">
      {aviso?.ok ? (
        <p role="status" className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
          {aviso.ok}
        </p>
      ) : null}
      {aviso?.error ? (
        <p role="alert" className="text-sm text-red-600">{aviso.error}</p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th scope="col" className={thClass}>Visitante</th>
              <th scope="col" className={thClass}>Fecha</th>
              <th scope="col" className={thClass}>Hora</th>
              <th scope="col" className={thClass}>Motivo</th>
              <th scope="col" className={thClass}>Código</th>
              <th scope="col" className={thClass}>Estado</th>
              <th scope="col" className={thClass}>Creada por</th>
              <th scope="col" className={thClass}><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {visitas.map((visita) => (
              <tr key={visita.id}>
                <td className={tdClass}>
                  <p className="font-medium">{visita.visitorName}</p>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    {documentLabel(visita.documentType, visita.documentNumber)}
                  </p>
                </td>
                <td className={`${tdClass} whitespace-nowrap tabular-nums`}>{formatFecha(visita.visitDate)}</td>
                <td className={`${tdClass} whitespace-nowrap tabular-nums`}>{horaLabel(visita)}</td>
                <td className={`${tdClass} max-w-xs break-words`}>{visita.reason}</td>
                <td className={`${tdClass} whitespace-nowrap font-mono`}>{visita.code ?? "—"}</td>
                <td className={tdClass}>
                  <p className="font-medium">{STATUS_LABELS[visita.status]}</p>
                  {visita.status === "PENDIENTE_AUTORIZACION" && visita.expiresAt ? (
                    <p className="text-amber-700 dark:text-amber-400">
                      {MESSAGES.waiting(minutosRestantes(visita.expiresAt, now))}
                    </p>
                  ) : null}
                  {visita.status === "RECHAZADA" && visita.rejectReason ? (
                    <p className="text-zinc-600 dark:text-zinc-400">Motivo: {visita.rejectReason}</p>
                  ) : null}
                </td>
                <td className={`${tdClass} whitespace-nowrap`}>{visita.createdBy}</td>
                <td className={`${tdClass} whitespace-nowrap`}>
                  {visita.status === "AUTORIZADA" ? (
                    <button type="button" disabled={busy !== null} onClick={() => open({ kind: "cancel", visita })} className={smallButton}>
                      Cancelar
                    </button>
                  ) : null}
                  {visita.status === "PENDIENTE_AUTORIZACION" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void run(visita.id, () => responderVisita(visita.id, "APROBAR", ""))}
                        className={primaryButton}
                      >
                        {busy === visita.id ? "Enviando…" : "Aprobar"}
                      </button>
                      <button type="button" disabled={busy !== null} onClick={() => open({ kind: "reject", visita })} className={smallButton}>
                        Rechazar
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dialog
        ref={dialog}
        aria-labelledby="visita-dialogo"
        className="m-auto w-full max-w-sm rounded-xl border border-zinc-200 bg-background p-6 text-foreground backdrop:bg-black/50 dark:border-zinc-800"
      >
        {pending?.kind === "cancel" ? (
          <p id="visita-dialogo" className="font-medium">
            {MESSAGES.confirmCancel(pending.visita.visitorName, formatFecha(pending.visita.visitDate))}
          </p>
        ) : pending ? (
          <div className="flex flex-col gap-2">
            <p id="visita-dialogo" className="font-medium">
              ¿Rechazar el ingreso de {pending.visita.visitorName}?
            </p>
            <label htmlFor="motivo-rechazo" className="text-sm font-medium">Motivo (opcional)</label>
            <input
              id="motivo-rechazo"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={REJECT_REASON_MAX + 20}
              aria-invalid={reasonTooLong ? true : undefined}
              className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm aria-invalid:border-red-600 dark:border-zinc-700"
            />
            <p className={`text-xs ${reasonTooLong ? "text-red-600" : "text-zinc-500"}`}>
              {reasonTooLong ? MESSAGES.reason : `${reason.trim().length}/${REJECT_REASON_MAX}`}
            </p>
          </div>
        ) : null}
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={() => dialog.current?.close()} className={smallButton}>
            Volver
          </button>
          <button type="button" onClick={confirm} disabled={reasonTooLong} className={primaryButton}>
            {pending?.kind === "cancel" ? "Cancelar autorización" : "Rechazar"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
