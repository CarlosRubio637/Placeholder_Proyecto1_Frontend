import Link from "next/link";
import { getCurrentUser } from "@/lib/api";
import type { Role } from "@/lib/roles";
import { AppShell } from "./app-shell";

// Layout de un grupo de rutas por rol (H38). Si el rol de la sesión no es uno
// de los del grupo, muestra el aviso de permiso en lugar de la página.
//
// La validación real de permisos la hace el backend (RolesGuard, 403); esto
// solo evita mostrar pantallas de otro rol.
export async function RoleLayout({
  role,
  children,
}: {
  role: Role | Role[];
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const allowed = Array.isArray(role) ? role.includes(user.role) : user.role === role;

  return (
    <AppShell user={user}>
      {allowed ? (
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
