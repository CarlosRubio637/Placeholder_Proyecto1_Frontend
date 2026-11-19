import Link from "next/link";
import { logout } from "@/app/actions/auth";
import type { CurrentUser } from "@/lib/api";
import { NAV_BY_ROLE } from "@/lib/navigation";
import { ROLE_LABELS, isRole } from "@/lib/roles";
import { NotificationBell } from "./notification-bell";
import { SidebarNav } from "./sidebar-nav";

// Estructura común de las pantallas con sesión: encabezado con el usuario,
// menú lateral con las opciones de su rol y el contenido de la página.
export function AppShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const role = isRole(user.role) ? user.role : undefined;
  const items = role ? NAV_BY_ROLE[role] : [];

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-primary-hover bg-primary px-6 py-3 text-white dark:border-primary-hover">
        <Link href="/" className="flex items-center gap-2 font-semibold">
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
            <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16" />
            <path d="M15 10h4a1 1 0 0 1 1 1v10" />
            <path d="M3 21h18" />
            <path d="M8 8h3M8 12h3M8 16h3" />
          </svg>
          Condominio Placeholder
        </Link>
        <div className="flex items-center gap-4 text-sm [&>a:hover]:bg-white/15">
          <NotificationBell />
          <span>
            {user.fullName ?? user.email}
            {role ? (
              <span className="text-white/75"> · {ROLE_LABELS[role]}</span>
            ) : null}
            {user.unit ? (
              <span className="text-white/75"> · {user.unit.code}</span>
            ) : null}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-white/50 px-3 py-1.5 hover:bg-white/15 dark:border-white/50"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="border-b border-zinc-200 p-3 md:w-56 md:shrink-0 md:border-r md:border-b-0 md:border-zinc-800 md:bg-zinc-800 md:text-zinc-100 dark:border-zinc-800">
          <SidebarNav items={items} />
        </aside>
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
