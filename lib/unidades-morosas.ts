export const UNIDADES_MOROSAS_PATH = "/admin/morosidad";
export const UNIDADES_MOROSAS_PAGE_SIZE = 20;
export const SEARCH_MAX = 20;
export const BUSQUEDA_DEBOUNCE_MS = 500;
const MAX_PAGE = 100_000;

export type UnidadesMorosasResumen = {
  overdueUnits: number;
  overdueActiveUnits: number;
  overdueAmount: number;
  activeUnits: number;
  overduePercent: number;
};

export type UnidadMorosa = {
  unitId: string;
  unitCode: string;
  towerName: string;
  residents: string[];
  overdueFees: number;
  overdueAmount: number;
  overdueSince: string;
  daysOverdue: number;
};

export type UnidadesMorosasReporte = {
  summary: UnidadesMorosasResumen;
  data: UnidadMorosa[];
  total: number;
  page: number;
  pageSize: number;
};

export type FiltrosMorosas = {
  towerId: string | undefined;
  search: string | undefined;
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function normalizarBusqueda(value: string | undefined): string | undefined {
  const trimmed = value?.trim().slice(0, SEARCH_MAX);
  return trimmed ? trimmed : undefined;
}

export function parseUnidadesMorosasParams(searchParams: SearchParams): {
  filtros: FiltrosMorosas;
  page: number;
} {
  const page = Number.parseInt(first(searchParams.page) ?? "1", 10);
  return {
    filtros: {
      towerId: first(searchParams.torre) || undefined,
      search: normalizarBusqueda(first(searchParams.buscar)),
    },
    page: Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1,
  };
}

export function unidadesMorosasHref(filtros: FiltrosMorosas, page = 1): string {
  const params = new URLSearchParams();
  if (filtros.towerId) params.set("torre", filtros.towerId);
  if (filtros.search) params.set("buscar", filtros.search);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${UNIDADES_MOROSAS_PATH}?${query}` : UNIDADES_MOROSAS_PATH;
}

export function estadoDeCuentaHref(unitId: string): string {
  return `/admin/unidades/${encodeURIComponent(unitId)}`;
}

export function lastPageOf(total: number): number {
  return Math.max(1, Math.ceil(total / UNIDADES_MOROSAS_PAGE_SIZE));
}

export function formatDia(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return year && month && day ? `${day}/${month}/${year}` : isoDate;
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatMonto(value: number): string {
  return money.format(value);
}

export function formatPorcentaje(value: number): string {
  return `${value.toFixed(1)} %`;
}
