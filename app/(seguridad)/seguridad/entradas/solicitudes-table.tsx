"use client";

import {
  STATUS_LABELS,
  documentLabel,
  formatHora,
  minutosRestantes,
  puedeEntrar,
  type Solicitud,
} from "@/lib/entradas";
import { RegistrarEntradaButton } from "./registrar-entrada-button";

const thClass = "px-4 py-3 text-left text-sm font-medium";
const tdClass = "px-4 py-3 align-top text-sm";

type Props = {
  solicitudes: Solicitud[];
  now: number;
  onEntry: (message: string) => void;
};

/** Estado como lo ve seguridad: una solicitud aprobada es "Aprobada". */
function estado(solicitud: Solicitud): string {
  if (solicitud.status === "AUTORIZADA") return "Aprobada";
  return STATUS_LABELS[solicitud.status];
}

// Tabla "Esperando respuesta" (H16): solicitudes de hoy, la más reciente primero.
export function SolicitudesTable({ solicitudes, now, onEntry }: Props) {
  if (solicitudes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
        <p className="font-medium">No hay solicitudes esperando respuesta.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
        <caption className="sr-only">Solicitudes de hoy, de la más reciente a la más antigua</caption>
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th scope="col" className={thClass}>Visitante</th>
            <th scope="col" className={thClass}>Unidad</th>
            <th scope="col" className={thClass}>Motivo</th>
            <th scope="col" className={thClass}>Enviada</th>
            <th scope="col" className={thClass}>Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {solicitudes.map((solicitud) => (
            <tr key={solicitud.id}>
              <td className={tdClass}>
                <p className="font-medium">{solicitud.visitorName}</p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {documentLabel(solicitud.documentType, solicitud.documentNumber)}
                </p>
              </td>
              <td className={`${tdClass} whitespace-nowrap`}>{solicitud.unitCode}</td>
              <td className={`${tdClass} max-w-xs break-words`}>{solicitud.reason}</td>
              <td className={`${tdClass} whitespace-nowrap`}>{formatHora(solicitud.createdAt)}</td>
              <td className={tdClass}>
                <div className="flex flex-col items-start gap-2">
                  <span className="font-medium">{estado(solicitud)}</span>
                  {solicitud.status === "PENDIENTE_AUTORIZACION" && solicitud.expiresAt ? (
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Quedan {minutosRestantes(solicitud.expiresAt, now)} min
                    </span>
                  ) : null}
                  {solicitud.status === "RECHAZADA" && solicitud.rejectReason ? (
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Motivo: {solicitud.rejectReason}
                    </span>
                  ) : null}
                  {puedeEntrar(solicitud, now) ? (
                    <RegistrarEntradaButton visitId={solicitud.id} onEntry={onEntry} />
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
