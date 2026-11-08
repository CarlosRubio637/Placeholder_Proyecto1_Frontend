import { SV_TIME_ZONE } from "@/lib/fechas";
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
  const residentes = count === 1 ? "residente" : "residentes";
  return `Se publicará para ${count} ${residentes} de ${label}. Un comunicado publicado no se puede editar ni eliminar. ¿Publicar?`;
}

export type Pestana = "vigentes" | "archivados";

export type ComunicadoResumen = {
  id: string;
  title: string;
  category: Categoria;
  publishedAt: string;
  expiresOn: string;
  readAt: string | null;
};

export type ComunicadoDetalle = Omit<ComunicadoResumen, "readAt"> & {
  body: string;
  readAt: string;
};

export type ComunicadosPagina = {
  data: ComunicadoResumen[];
  total: number;
  page: number;
  pageSize: number;
};

export type ComunicadosFiltro = {
  tab: Pestana;
  category: Categoria | null;
  page: number;
};

export const COMUNICADOS_PATH = "/comunicados";
export const RESIDENT_PAGE_SIZE = 10;
export const RESIDENT_MAX_PAGE = 100_000;
export const NOT_FOUND_MESSAGE = "El comunicado no existe.";

export const EMPTY_MESSAGES: Record<Pestana, string> = {
  vigentes: "No tienes comunicados vigentes.",
  archivados: "No hay comunicados archivados.",
};

const PESTANAS: Pestana[] = ["vigentes", "archivados"];

export function categoryLabel(category: Categoria): string {
  return (
    CATEGORY_OPTIONS.find((option) => option.value === category)?.label ??
    category
  );
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseListParams(
  searchParams: Record<string, string | string[] | undefined>,
): ComunicadosFiltro {
  const tab = first(searchParams.tab);
  const category = first(searchParams.category);
  const page = Number(first(searchParams.page) ?? "1");
  return {
    tab: PESTANAS.find((option) => option === tab) ?? "vigentes",
    category:
      CATEGORY_OPTIONS.find((option) => option.value === category)?.value ??
      null,
    page:
      Number.isSafeInteger(page) && page >= 1
        ? Math.min(page, RESIDENT_MAX_PAGE)
        : 1,
  };
}

type ListLink = { tab: Pestana; category: Categoria | null; page?: number };

function listQuery({ tab, category, page = 1 }: ListLink): string {
  const params = new URLSearchParams();
  if (tab !== "vigentes") params.set("tab", tab);
  if (category) params.set("category", category);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function comunicadosHref(filtro: ListLink): string {
  return `${COMUNICADOS_PATH}${listQuery(filtro)}`;
}

export function comunicadoHref(id: string, filtro: ListLink): string {
  return `${COMUNICADOS_PATH}/${encodeURIComponent(id)}${listQuery(filtro)}`;
}

const dateFormatter = new Intl.DateTimeFormat("es-SV", {
  timeZone: SV_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("es-SV", {
  timeZone: SV_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export function fechaCorta(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function fechaVigencia(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

export function lecturaText(iso: string): string {
  const moment = new Date(iso);
  return `Leído el ${dateFormatter.format(moment)} a las ${timeFormatter.format(moment)}`;
}
