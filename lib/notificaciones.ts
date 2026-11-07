import type { Role } from "@/lib/roles";

// Bandeja de notificaciones (H31). Los valores deben coincidir con el enum
// SourceModule del backend (H30).
export const SOURCE_MODULES = [
  "CUOTAS",
  "RESERVAS",
  "INCIDENCIAS",
  "VISITAS",
  "PAQUETERIA",
  "VOTACIONES",
  "COMUNICADOS",
] as const;

export type SourceModule = (typeof SOURCE_MODULES)[number];

export const SOURCE_MODULE_LABELS: Record<SourceModule, string> = {
  CUOTAS: "Cuotas",
  RESERVAS: "Reservas",
  INCIDENCIAS: "Incidencias",
  VISITAS: "Visitas",
  PAQUETERIA: "Paquetería",
  VOTACIONES: "Votaciones",
  COMUNICADOS: "Comunicados",
};

export function isSourceModule(value: unknown): value is SourceModule {
  return typeof value === "string" && (SOURCE_MODULES as readonly string[]).includes(value);
}

/** Notificaciones por página de la bandeja. */
export const PAGE_SIZE = 20;

/** Cada cuánto el encabezado vuelve a consultar el contador de No leídas. */
export const UNREAD_POLL_MS = 30_000;

export type Notification = {
  id: string;
  title: string;
  message: string;
  sourceModule: SourceModule;
  referenceType: string | null;
  referenceId: string | null;
  /** null = No leída. Fecha ISO. */
  readAt: string | null;
  /** Fecha ISO. */
  createdAt: string;
};

export type NotificationPage = {
  data: Notification[];
  total: number;
  page: number;
  pageSize: number;
};

export type NotificationFilters = {
  /** Sin valor = todos los módulos. */
  sourceModule?: SourceModule;
  /** true = solo No leídas. */
  unread: boolean;
  page: number;
};

/** Texto de la insignia: oculta con 0, "99+" si pasa de 99. */
export function badgeText(count: number | null): string | null {
  if (!count || count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}

// Pantalla del registro de origen según `referenceType` y el rol.
//
// Cada historia que agregue una pantalla de detalle suma aquí su ruta. Si no
// hay ruta para el rol, la notificación solo se marca como leída.
const REFERENCE_ROUTES: Record<string, Partial<Record<Role, (id: string) => string>>> = {
  incident: {
    RESIDENTE: (id) => `/incidencias/${id}`,
  },
};

export function referenceHref(
  role: Role,
  referenceType: string | null,
  referenceId: string | null,
): string | null {
  if (!referenceType || !referenceId) return null;
  return REFERENCE_ROUTES[referenceType]?.[role]?.(referenceId) ?? null;
}
