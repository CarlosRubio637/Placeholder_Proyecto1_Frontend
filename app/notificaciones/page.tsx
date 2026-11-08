import type { Metadata } from "next";
import { AppShell } from "@/app/_components/app-shell";
import { getCurrentUser } from "@/lib/api";
import { isRole } from "@/lib/roles";
import { BandejaNotificaciones } from "./bandeja-notificaciones";

export const metadata: Metadata = {
  title: "Notificaciones",
};

// Bandeja centralizada de notificaciones (H31). Común a los tres roles, por
// eso vive fuera de los grupos por rol; el backend filtra por el usuario del
// token. La lista se consulta desde el cliente al abrir la pantalla.
export default async function NotificacionesPage() {
  const user = await getCurrentUser();

  return (
    <AppShell user={user}>
      {isRole(user.role) ? (
        <BandejaNotificaciones role={user.role} />
      ) : (
        <p className="text-lg font-medium">No tienes permiso para ver esta página.</p>
      )}
    </AppShell>
  );
}
