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
    { href: "/reservas", label: "Áreas comunes" },
    { href: "/incidencias", label: "Mis incidencias" },
    { href: "/paquetes", label: "Mis paquetes" },
    { href: "/visitas", label: "Mis visitas" },
    { href: "/asambleas", label: "Asambleas activas" },
    { href: "/comunicados", label: "Comunicados" },
    { href: "/perfil", label: "Mi perfil y privacidad" },
    NOTIFICACIONES,
  ],
  ADMINISTRADOR: [
    { href: "/", label: "Inicio" },
    { href: "/admin/areas", label: "Áreas comunes" },
    { href: "/admin/incidencias", label: "Incidencias" },
    { href: "/admin/cuotas/generar", label: "Generar cuotas" },
    { href: "/admin/asambleas", label: "Asambleas" },
    { href: "/admin/reportes/morosidad", label: "Morosidad" },
    { href: "/admin/morosidad", label: "Unidades morosas" },
    { href: "/admin/reportes/incidencias", label: "Incidencias abiertas" },
    { href: "/admin/reportes/areas", label: "Uso de áreas comunes" },
    { href: "/admin/reportes/participacion", label: "Participación en votaciones" },
    { href: "/admin/comunicados", label: "Comunicados" },
    NOTIFICACIONES,
  ],
  SEGURIDAD: [
    { href: "/", label: "Inicio" },
    { href: "/seguridad/entradas", label: "Entradas" },
    { href: "/seguridad/paquetes", label: "Paquetes" },
    { href: "/seguridad/dentro", label: "Quién está dentro" },
    NOTIFICACIONES,
  ],
};