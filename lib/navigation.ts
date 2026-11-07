import type { Role } from "@/lib/roles";

export type NavItem = {
  href: string;
  label: string;
};

// Opciones del menú lateral por rol (H38): cada rol ve solo las suyas.
//
// Cada historia que agregue una pantalla suma aquí su opción, en el rol que
// corresponde. Las rutas van dentro del grupo de su rol:
//   - Residente:      app/(residente)/<ruta>         → /<ruta>
//   - Administrador:  app/(admin)/admin/<ruta>       → /admin/<ruta>
//   - Seguridad:      app/(seguridad)/seguridad/<ruta> → /seguridad/<ruta>
// Las pantallas comunes a los tres roles (Inicio, Notificaciones) van fuera
// de los grupos.
const NOTIFICACIONES: NavItem = { href: "/notificaciones", label: "Notificaciones" };

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  RESIDENTE: [
    { href: "/", label: "Inicio" },
    { href: "/incidencias/nueva", label: "Reportar incidencia" },
    NOTIFICACIONES,
  ],
  ADMINISTRADOR: [{ href: "/", label: "Inicio" }, NOTIFICACIONES],
  SEGURIDAD: [{ href: "/", label: "Inicio" }, NOTIFICACIONES],
};
