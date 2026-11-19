import {
  CATEGORY_OPTIONS,
  audienceLabel,
  fechaCorta,
  firstParam,
  horaCorta,
  parsePage,
  type Audiencia,
  type Categoria,
} from "@/lib/comunicados";

export type Estado = "VIGENTE" | "ARCHIVADO";

export type ComunicadoAdmin = {
  id: string;
  title: string;
  category: Categoria;
  audience: Audiencia;
  towers: { id: string; name: string }[];
  publishedAt: string;
  expiresOn: string;
  status: Estado;
  readCount: number;
  recipientCount: number;
  readPct: number;
};

export type ComunicadoAdminDetalle = ComunicadoAdmin & { body: string };

export type ComunicadosAdminPagina = {
  data: ComunicadoAdmin[];
  total: number;
  page: number;
  pageSize: number;
};

export type Destinatario = {
  fullName: string | null;
  unitCode: string;
  readAt: string | null;
};

export type LecturasPagina = {
  announcement: ComunicadoAdminDetalle;
  data: Destinatario[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminFiltro = {
  status: Estado | null;
  category: Categoria | null;
  page: number;
};

export type LecturasFiltro = { read: boolean | null; page: number };

type SearchParams = Record<string, string | string[] | undefined>;

export const ADMIN_COMUNICADOS_PATH = "/admin/comunicados";
export const ADMIN_PAGE_SIZE = 20;
export const READERS_PAGE_SIZE = 50;

export const STATUS_LABELS: Record<Estado, string> = {
  VIGENTE: "Vigente",
  ARCHIVADO: "Archivado",
};

export const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as Estado[]).map(
  (value) => ({ value, label: STATUS_LABELS[value] }),
);

export const READ_OPTIONS: { value: "true" | "false"; label: string }[] = [
  { value: "true", label: "Leído" },
  { value: "false", label: "No leído" },
];

const READ_VALUES = new Map<string, boolean>([
  ["true", true],
  ["false", false],
]);

export const LIST_EMPTY = "Todavía no hay comunicados publicados.";
export const LIST_EMPTY_FILTERED = "No hay comunicados con estos filtros.";

export function readersEmptyMessage(
  read: boolean | null,
  recipientCount: number,
): string {
  if (read === null || recipientCount === 0)
    return "Este comunicado no tuvo destinatarios.";
  return read
    ? "Nadie ha leído este comunicado todavía."
    : "Todos los destinatarios ya leyeron este comunicado.";
}

export function parseStatus(value: string | undefined): Estado | null {
  return STATUS_OPTIONS.find((option) => option.value === value)?.value ?? null;
}

export function parseCategory(value: string | undefined): Categoria | null {
  return (
    CATEGORY_OPTIONS.find((option) => option.value === value)?.value ?? null
  );
}

export function parseRead(value: string | undefined): boolean | null {
  return READ_VALUES.get(value ?? "") ?? null;
}

export function parseAdminListParams(searchParams: SearchParams): AdminFiltro {
  return {
    status: parseStatus(firstParam(searchParams.status)),
    category: parseCategory(firstParam(searchParams.category)),
    page: parsePage(firstParam(searchParams.page)),
  };
}

export function parseReadsParams(searchParams: SearchParams): {
  filtro: LecturasFiltro;
  lista: AdminFiltro;
} {
  return {
    filtro: {
      read: parseRead(firstParam(searchParams.read)),
      page: parsePage(firstParam(searchParams.page)),
    },
    lista: parseAdminListParams({
      status: searchParams.status,
      category: searchParams.category,
      page: searchParams.listPage,
    }),
  };
}

function listEntries(
  { status, category, page }: AdminFiltro,
  pageKey: string,
): [string, string][] {
  const entries: [string, string][] = [];
  if (status) entries.push(["status", status]);
  if (category) entries.push(["category", category]);
  if (page > 1) entries.push([pageKey, String(page)]);
  return entries;
}

function withQuery(path: string, entries: [string, string][]): string {
  const query = new URLSearchParams(entries).toString();
  return query ? `${path}?${query}` : path;
}

export function adminComunicadosHref(filtro: AdminFiltro): string {
  return withQuery(ADMIN_COMUNICADOS_PATH, listEntries(filtro, "page"));
}

export function lecturasHref(
  id: string,
  { read, page }: LecturasFiltro,
  lista: AdminFiltro,
): string {
  const entries: [string, string][] = [];
  if (read !== null) entries.push(["read", String(read)]);
  if (page > 1) entries.push(["page", String(page)]);
  return withQuery(`${ADMIN_COMUNICADOS_PATH}/${encodeURIComponent(id)}`, [
    ...entries,
    ...listEntries(lista, "listPage"),
  ]);
}

export function lastPageOf(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function audienciaText(
  comunicado: Pick<ComunicadoAdmin, "audience" | "towers">,
): string {
  if (comunicado.audience === "TODOS") return "Todo el condominio";
  return audienceLabel(comunicado.towers);
}

export function lecturasText(readCount: number, recipientCount: number) {
  const residentes = recipientCount === 1 ? "residente" : "residentes";
  return `${readCount} de ${recipientCount} ${residentes}`;
}

export function porcentajeText(readPct: number): string {
  return `${readPct.toFixed(1)} %`;
}

export function lecturaFecha(iso: string): string {
  return `${fechaCorta(iso)} ${horaCorta(iso)}`;
}
