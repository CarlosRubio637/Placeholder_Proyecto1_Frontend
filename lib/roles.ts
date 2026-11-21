// Roles del sistema (H38). Deben coincidir con el enum Role del backend.
export const ROLES = ["RESIDENTE", "ADMINISTRADOR", "SEGURIDAD"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  RESIDENTE: "Residente",
  ADMINISTRADOR: "Administrador",
  SEGURIDAD: "Personal de seguridad",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
