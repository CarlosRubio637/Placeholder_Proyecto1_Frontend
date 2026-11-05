import Link from "next/link";
import { getCurrentUser } from "@/lib/api";
import type { Role } from "@/lib/roles";
import { AppShell } from "./app-shell";

// Layout de un grupo de rutas por rol (H38). Si el rol de la sesión no es el
// del grupo, muestra el aviso de permiso en lugar de la página.
//
// La validación real de permisos la hace el backend (RolesGuard, 403); esto
// solo evita mostrar pantallas de otro rol.
export async function RoleLayout({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <AppShell user={user}>
      {user.role === role ? (
        children
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-lg font-medium">No tienes permiso para ver esta página.</p>
          <Link href="/" className="underline underline-offset-4">
            Ir a Inicio
          </Link>
        </div>
      )}
    </AppShell>
  );
}
