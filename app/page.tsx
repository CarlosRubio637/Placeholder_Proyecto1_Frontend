import { AppShell } from "@/app/_components/app-shell";
import { getCurrentUser } from "@/lib/api";
import { ROLE_LABELS, isRole } from "@/lib/roles";

// Inicio: común a los tres roles. El menú lateral muestra las opciones del rol.
export default async function Home() {
  const user = await getCurrentUser();

  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-semibold">
        Hola, {user.fullName ?? user.email}
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        {isRole(user.role)
          ? `Entraste como ${ROLE_LABELS[user.role].toLowerCase()}. Usa el menú para ir a tus opciones.`
          : "Tu cuenta no tiene un rol asignado. Contacta a la administración."}
      </p>
    </AppShell>
  );
}
