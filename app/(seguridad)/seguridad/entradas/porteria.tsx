"use client";

import { useCallback, useEffect, useState } from "react";
import { listarSolicitudes } from "@/app/actions/entradas";
import { SOLICITUDES_POLL_MS, type Solicitud } from "@/lib/entradas";
import type { Torre } from "@/lib/paquetes";
import { BuscarAutorizacion } from "./buscar-autorizacion";
import { SolicitudForm } from "./solicitud-form";
import { SolicitudesTable } from "./solicitudes-table";

type Props = { torres: Torre[]; initialSolicitudes: Solicitud[] };

const successClass =
  "rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100";

// Estado compartido de la pantalla: el aviso de éxito y la lista
// "Esperando respuesta", que se actualiza cada 15 segundos y con Actualizar.
export function Porteria({ torres, initialSolicitudes }: Props) {
  const [aviso, setAviso] = useState<string | undefined>();
  const [solicitudes, setSolicitudes] = useState(initialSolicitudes);
  const [listError, setListError] = useState<string | undefined>();
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const res = await listarSolicitudes();
    setRefreshing(false);
    setNow(Date.now());
    if (res.error) {
      setListError(res.error);
      return;
    }
    setListError(undefined);
    setSolicitudes(res.data ?? []);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => void refresh(), SOLICITUDES_POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  function onSuccess(message: string) {
    setAviso(message);
    void refresh();
  }

  return (
    <>
      {aviso ? (
        <p role="status" className={successClass}>
          {aviso}
        </p>
      ) : null}

      <section aria-labelledby="buscar-titulo" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="buscar-titulo" className="text-lg font-semibold">
            Buscar autorización
          </h2>
          <SolicitudForm torres={torres} onSent={onSuccess} />
        </div>
        <BuscarAutorizacion onEntry={onSuccess} onSearch={() => setAviso(undefined)} />
      </section>

      <section aria-labelledby="solicitudes-titulo" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="solicitudes-titulo" className="text-lg font-semibold">
            Esperando respuesta
          </h2>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
          >
            {refreshing ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
        {listError ? (
          <p role="alert" className="text-sm text-red-600">
            {listError}
          </p>
        ) : null}
        <SolicitudesTable solicitudes={solicitudes} now={now} onEntry={onSuccess} />
      </section>
    </>
  );
}
