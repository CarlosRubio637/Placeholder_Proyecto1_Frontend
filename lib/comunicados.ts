import type { Torre } from "@/lib/paquetes";

export type Categoria = "CORTE_SERVICIO" | "MANTENIMIENTO" | "AVISO_GENERAL";
export type Audiencia = "TODOS" | "TORRES";

export type ComunicadoPublicado = {
  id: string;
  title: string;
  category: Categoria;
  audience: Audiencia;
  towers: { id: string; name: string }[];
  publishedAt: string;
  expiresOn: string;
  recipientCount: number;
};

export const CATEGORY_OPTIONS: { value: Categoria; label: string }[] = [
  { value: "CORTE_SERVICIO", label: "Corte de servicio" },
  { value: "MANTENIMIENTO", label: "Mantenimiento programado" },
  { value: "AVISO_GENERAL", label: "Aviso general" },
];

export const DEFAULT_CATEGORY: Categoria = "AVISO_GENERAL";

const EXPIRY_MAX_DAYS = 90;
const EXPIRY_DEFAULT_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  return new Date(date.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function expiryBounds(today: string): { min: string; max: string } {
  return { min: addDays(today, 1), max: addDays(today, EXPIRY_MAX_DAYS) };
}

export function defaultExpiry(today: string): string {
  return addDays(today, EXPIRY_DEFAULT_DAYS);
}

export function audienceLabel(towers: Pick<Torre, "name">[] | null): string {
  if (towers === null) return "todo el condominio";
  const names = towers.map((tower) => tower.name);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

export function confirmationQuestion(count: number, label: string): string {
  return `Se publicará para ${count} residentes de ${label}. Un comunicado publicado no se puede editar ni eliminar. ¿Publicar?`;
}
