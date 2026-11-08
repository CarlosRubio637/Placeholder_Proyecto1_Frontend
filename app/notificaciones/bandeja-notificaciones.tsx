"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  listarNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
  type ActionResult,
  type NotificationError,
} from "@/app/actions/notificaciones";
import {
  SOURCE_MODULES,
  SOURCE_MODULE_LABELS,
  isSourceModule,
  referenceHref,
  type Notification,
  type NotificationPage,
  type SourceModule,
} from "@/lib/notificaciones";
import type { Role } from "@/lib/roles";
import { useNotificationsStore } from "@/lib/stores/notifications-store";

const ERROR_MESSAGES: Record<NotificationError, string> = {
  server: "Ocurrió un error en el servidor. Intenta más tarde.",
  forbidden: "No tienes permiso para ver esta página.",
  "not-found": "La notificación no existe.",
};

const dateFormat = new Intl.DateTimeFormat("es", {
  dateStyle: "medium",
  timeStyle: "short",
});

const buttonClass =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900";

type Loaded = { key: string; result: ActionResult<NotificationPage> };

export function BandejaNotificaciones({ role }: { role: Role }) {
  const router = useRouter();
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const refreshUnread = useNotificationsStore((state) => state.refreshUnread);

  // Filtros y página en estado local (H31).
  const [sourceModule, setSourceModule] = useState<SourceModule | "">("");
  const [unread, setUnread] = useState(false);
  const [page, setPage] = useState(1);
  // Se incrementa con "Actualizar" y después de "Marcar todas" para volver a consultar.
  const [reloadToken, setReloadToken] = useState(0);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [actionError, setActionError] = useState<string>();
  const [pendingId, setPendingId] = useState<string>();
  const [markingAll, setMarkingAll] = useState(false);
  const confirmDialog = useRef<HTMLDialogElement>(null);

  // La consulta actual; mientras su resultado no llegue, la bandeja está Cargando.
  const queryKey = JSON.stringify({ sourceModule, unread, page, reloadToken });
  const loading = loaded?.key !== queryKey;

  useEffect(() => {
    let cancelled = false;
    listarNotificaciones({ sourceModule: sourceModule || undefined, unread, page }).then(
      (result) => {
        if (!cancelled) setLoaded({ key: queryKey, result });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [queryKey, sourceModule, unread, page]);

  function changeModule(value: string) {
    setSourceModule(isSourceModule(value) ? value : "");
    setPage(1);
    setActionError(undefined);
  }

  function changeUnread(value: boolean) {
    setUnread(value);
    setPage(1);
    setActionError(undefined);
  }

  function reload() {
    setActionError(undefined);
    setReloadToken((token) => token + 1);
    void refreshUnread();
  }

  async function open(notification: Notification) {
    if (pendingId) return;
    const href = referenceHref(role, notification.referenceType, notification.referenceId);
    setActionError(undefined);

    if (notification.readAt === null) {
      setPendingId(notification.id);
      const result = await marcarLeida(notification.id);
      setPendingId(undefined);
      if (!result.ok) {
        setActionError(ERROR_MESSAGES[result.error]);
        return;
      }
      // Pasa a Leída en la lista sin volver a consultar.
      setLoaded((current) =>
        current?.result.ok
          ? {
              ...current,
              result: {
                ok: true,
                data: {
                  ...current.result.data,
                  data: current.result.data.data.map((item) =>
                    item.id === notification.id ? { ...item, readAt: result.data.readAt } : item,
                  ),
                },
              },
            }
          : current,
      );
      void refreshUnread();
    }

    if (href) router.push(href);
  }

  async function confirmMarkAll() {
    confirmDialog.current?.close();
    setMarkingAll(true);
    setActionError(undefined);
    const result = await marcarTodasLeidas();
    setMarkingAll(false);
    if (!result.ok) {
      setActionError(ERROR_MESSAGES[result.error]);
      return;
    }
    reload();
  }

  const result = loaded?.result;
  const filtersActive = sourceModule !== "" || unread;
  const totalPages = result?.ok
    ? Math.max(1, Math.ceil(result.data.total / result.data.pageSize))
    : 1;

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Notificaciones</h1>
        <div className="flex gap-2">
          <button type="button" onClick={reload} disabled={loading} className={buttonClass}>
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => confirmDialog.current?.showModal()}
            disabled={unreadCount === 0 || markingAll}
            className={buttonClass}
          >
            {markingAll ? "Marcando…" : "Marcar todas como leídas"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Módulo de origen</span>
          <select
            value={sourceModule}
            onChange={(event) => changeModule(event.target.value)}
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          >
            <option value="">Todos</option>
            {SOURCE_MODULES.map((module) => (
              <option key={module} value={module}>
                {SOURCE_MODULE_LABELS[module]}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="flex flex-col gap-1 text-sm">
          <legend className="mb-1 font-medium">Estado</legend>
          <div className="flex gap-4 py-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="estado"
                checked={!unread}
                onChange={() => changeUnread(false)}
              />
              Todas
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="estado"
                checked={unread}
                onChange={() => changeUnread(true)}
              />
              No leídas
            </label>
          </div>
        </fieldset>
      </div>

      {actionError ? (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
        >
          {actionError}
        </p>
      ) : null}

      {loading ? (
        <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
          Cargando…
        </p>
      ) : !result?.ok ? (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
        >
          {ERROR_MESSAGES[result?.error ?? "server"]}
        </p>
      ) : result.data.data.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">
          {filtersActive ? "No hay notificaciones con esos filtros." : "No tienes notificaciones."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {result.data.data.map((notification) => {
            const isUnread = notification.readAt === null;
            return (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => open(notification)}
                  disabled={pendingId === notification.id}
                  className={`flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-zinc-50 disabled:opacity-60 dark:hover:bg-zinc-900 ${
                    isUnread ? "bg-sky-50 dark:bg-sky-950/40" : ""
                  }`}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    {isUnread ? (
                      <span aria-hidden="true" className="size-2 rounded-full bg-sky-600" />
                    ) : null}
                    <span className={isUnread ? "font-semibold" : "font-medium"}>
                      {notification.title}
                    </span>
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
                        isUnread
                          ? "bg-sky-100 text-sky-900 dark:bg-sky-900 dark:text-sky-100"
                          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {isUnread ? "No leída" : "Leída"}
                    </span>
                  </span>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {notification.message}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {SOURCE_MODULE_LABELS[notification.sourceModule] ?? notification.sourceModule}
                    {" · "}
                    <time dateTime={notification.createdAt}>
                      {dateFormat.format(new Date(notification.createdAt))}
                    </time>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {result?.ok && !loading && (result.data.total > 0 || page > 1) ? (
        <nav aria-label="Paginación" className="flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            onClick={() => setPage((current) => current - 1)}
            disabled={page <= 1}
            className={buttonClass}
          >
            Anterior
          </button>
          <span>
            Página {page} de {totalPages} · {result.data.total} en total
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={page >= totalPages}
            className={buttonClass}
          >
            Siguiente
          </button>
        </nav>
      ) : null}

      <dialog
        ref={confirmDialog}
        aria-labelledby="confirmar-titulo"
        className="m-auto max-w-sm rounded-lg border border-zinc-200 bg-white p-6 text-zinc-900 backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
      >
        <h2 id="confirmar-titulo" className="text-lg font-semibold">
          ¿Marcar todas como leídas?
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Todas tus notificaciones No leídas pasarán a Leída.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => confirmDialog.current?.close()}
            className={buttonClass}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmMarkAll}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Marcar todas
          </button>
        </div>
      </dialog>
    </div>
  );
}
