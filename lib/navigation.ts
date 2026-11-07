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
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  RESIDENTE: [
    { href: "/", label: "Inicio" },
    { href: "/incidencias", label: "Mis incidencias" },
    { href: "/paquetes", label: "Mis paquetes" },
  ],
  ADMINISTRADOR: [
    { href: "/", label: "Inicio" },
    { href: "/admin/areas", label: "Áreas comunes" },
    { href: "/admin/asambleas", label: "Asambleas" },
  ],
  SEGURIDAD: [
    { href: "/", label: "Inicio" },
    { href: "/seguridad/paquetes", label: "Paquetes" },
  ],
};