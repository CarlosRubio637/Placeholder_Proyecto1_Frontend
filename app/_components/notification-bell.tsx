"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { UNREAD_POLL_MS, badgeText } from "@/lib/notificaciones";
import { useNotificationsStore } from "@/lib/stores/notifications-store";

// Ícono de la bandeja con el contador de No leídas (H31). Consulta el conteo
// al cambiar de pantalla y cada 30 segundos.
export function NotificationBell() {
  const pathname = usePathname();
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const refreshUnread = useNotificationsStore((state) => state.refreshUnread);

  useEffect(() => {
    void refreshUnread();
  }, [pathname, refreshUnread]);

  useEffect(() => {
    const timer = setInterval(() => void refreshUnread(), UNREAD_POLL_MS);
    return () => clearInterval(timer);
  }, [refreshUnread]);

  const badge = badgeText(unreadCount);
  const label = unreadCount
    ? `Notificaciones, ${unreadCount} sin leer`
    : "Notificaciones";

  return (
    <Link
      href="/notificaciones"
      aria-label={label}
      title={label}
      className="relative inline-flex size-9 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
      >
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {badge ? (
        <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs leading-5 font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
