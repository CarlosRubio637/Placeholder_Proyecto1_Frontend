import Link from "next/link";
import { logout } from "@/app/actions/auth";
import type { CurrentUser } from "@/lib/api";
import { NAV_BY_ROLE } from "@/lib/navigation";
import { ROLE_LABELS, isRole } from "@/lib/roles";
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
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
        <Link href="/" className="font-semibold">
          Condominio Placeholder
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span>
            {user.fullName ?? user.email}
            {role ? (
              <span className="text-zinc-500"> · {ROLE_LABELS[role]}</span>
            ) : null}
            {user.unit ? (
              <span className="text-zinc-500"> · {user.unit.code}</span>
            ) : null}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="border-b border-zinc-200 p-3 md:w-56 md:border-r md:border-b-0 dark:border-zinc-800">
          <SidebarNav items={items} />
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
