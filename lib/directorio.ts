export type Vecino = {
  fullName: string;
  unitCode?: string;
  phone?: string;
  email?: string;
};

export type DirectorioPagina = {
  data: Vecino[];
  total: number;
  page: number;
  pageSize: number;
};

export type Busqueda =
  | { mode: "nombre"; name: string }
  | { mode: "unidad"; towerId: string; unitNumber: string };

export type BusquedaForm = {
  mode: Busqueda["mode"];
  name: string;
  towerId: string;
  unitNumber: string;
};

export type BusquedaErrors = {
  name?: string;
  towerId?: string;
  unitNumber?: string;
};

export const DIRECTORIO_PATH = "/directorio";
export const DIRECTORIO_PAGE_SIZE = 20;
export const MAX_PAGE = 100_000;
export const NAME_MIN = 3;
export const NAME_MAX = 80;

export const DIRECTORIO_MESSAGES = {
  nameShort: `Escribe al menos ${NAME_MIN} caracteres del nombre.`,
  towerId: "Selecciona la torre.",
  unitNumber: "Ingresa el número de unidad de 3 dígitos.",
  initial: "Busca a un vecino por su nombre o su unidad.",
  empty: "No se encontraron residentes que coincidan con la búsqueda.",
} as const;

const UNIT_NUMBER = /^\d{3}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIGITS = /^\d+$/;
const DIACRITICS = new RegExp(String.raw`\p{Diacritic}`, "gu");

export function searchName(text: string): string {
  return text
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function busquedaErrors(form: BusquedaForm): BusquedaErrors {
  if (form.mode === "nombre") {
    const typed = form.name.trim() !== "";
    return typed && searchName(form.name).length < NAME_MIN
      ? { name: DIRECTORIO_MESSAGES.nameShort }
      : {};
  }
  const typedUnit = form.unitNumber !== "";
  return {
    ...(typedUnit &&
      form.towerId === "" && { towerId: DIRECTORIO_MESSAGES.towerId }),
    ...(typedUnit &&
      !UNIT_NUMBER.test(form.unitNumber) && {
        unitNumber: DIRECTORIO_MESSAGES.unitNumber,
      }),
  };
}

export function busquedaFrom(form: BusquedaForm): Busqueda | null {
  if (form.mode === "nombre") {
    const name = form.name.trim();
    return searchName(name).length >= NAME_MIN && name.length <= NAME_MAX
      ? { mode: "nombre", name }
      : null;
  }
  return form.towerId !== "" && UNIT_NUMBER.test(form.unitNumber)
    ? { mode: "unidad", towerId: form.towerId, unitNumber: form.unitNumber }
    : null;
}

export function formFrom(busqueda: Busqueda | null): BusquedaForm {
  const empty: BusquedaForm = {
    mode: "nombre",
    name: "",
    towerId: "",
    unitNumber: "",
  };
  return busqueda ? { ...empty, ...busqueda } : empty;
}

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function parsePage(value: string): number {
  if (!DIGITS.test(value)) return 1;
  const page = Number(value);
  return page >= 1 ? Math.min(page, MAX_PAGE) : 1;
}

export function parseDirectorioParams(
  searchParams: Record<string, string | string[] | undefined>,
): { busqueda: Busqueda | null; page: number } {
  const towerId = firstParam(searchParams.towerId);
  const form: BusquedaForm = {
    mode: towerId ? "unidad" : "nombre",
    name: firstParam(searchParams.name),
    towerId: UUID.test(towerId) ? towerId : "",
    unitNumber: firstParam(searchParams.unitNumber),
  };
  return {
    busqueda: busquedaFrom(form),
    page: parsePage(firstParam(searchParams.page)),
  };
}

export function busquedaParams(busqueda: Busqueda): [string, string][] {
  return busqueda.mode === "nombre"
    ? [["name", busqueda.name]]
    : [
        ["towerId", busqueda.towerId],
        ["unitNumber", busqueda.unitNumber],
      ];
}

export function directorioHref(busqueda: Busqueda, page = 1): string {
  const params = new URLSearchParams(busquedaParams(busqueda));
  if (page > 1) params.set("page", String(page));
  return `${DIRECTORIO_PATH}?${params}`;
}

export function lastPageOf(total: number): number {
  return Math.max(1, Math.ceil(total / DIRECTORIO_PAGE_SIZE));
}
