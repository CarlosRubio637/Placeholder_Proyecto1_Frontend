import { formatDate } from "@/lib/areas";
import { CATEGORY_OPTIONS, expiryBounds, type Categoria } from "@/lib/comunicados";

export const LIMITS = {
  titleMin: 5,
  titleMax: 100,
  bodyMin: 10,
  bodyMax: 2000,
} as const;

export const MESSAGES = {
  title: "El título debe tener entre 5 y 100 caracteres.",
  body: "El contenido debe tener entre 10 y 2,000 caracteres.",
  category: "Elige una categoría válida.",
  towerIds: 'Elige al menos una torre o "Todo el condominio".',
  audienceFailed: "No se pudo consultar la audiencia. Intenta de nuevo.",
  forbidden: "No tienes permiso para publicar comunicados.",
  publishFailed: "No se pudo publicar el comunicado. Intenta de nuevo.",
} as const;

export function expiryMessage(today: string): string {
  return `La vigencia debe terminar entre mañana y ${formatDate(expiryBounds(today).max)}.`;
}

export type ComunicadoValues = {
  title: string;
  body: string;
  category: Categoria;
  allTowers: boolean;
  towerIds: string[];
  expiresOn: string;
};

export type ComunicadoField = "title" | "body" | "category" | "towerIds" | "expiresOn";
export type ComunicadoErrors = Partial<Record<ComunicadoField, string>>;

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

export function readComunicadoValues(formData: FormData): ComunicadoValues {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  return {
    title: text("title"),
    body: text("body"),
    category: text("category") as Categoria,
    allTowers: formData.get("allTowers") === "on",
    towerIds: formData.getAll("towerIds").map(String),
    expiresOn: text("expiresOn"),
  };
}

function lengthBetween(value: string, min: number, max: number): boolean {
  const length = value.trim().length;
  return length >= min && length <= max;
}

export function validateComunicado(values: ComunicadoValues, today: string): ComunicadoErrors {
  const errors: ComunicadoErrors = {};
  if (!lengthBetween(values.title, LIMITS.titleMin, LIMITS.titleMax)) {
    errors.title = MESSAGES.title;
  }
  if (!lengthBetween(values.body, LIMITS.bodyMin, LIMITS.bodyMax)) {
    errors.body = MESSAGES.body;
  }
  if (!CATEGORY_OPTIONS.some((option) => option.value === values.category)) {
    errors.category = MESSAGES.category;
  }
  if (!values.allTowers && values.towerIds.length === 0) {
    errors.towerIds = MESSAGES.towerIds;
  }
  const { min, max } = expiryBounds(today);
  if (!DATE_FORMAT.test(values.expiresOn) || values.expiresOn < min || values.expiresOn > max) {
    errors.expiresOn = expiryMessage(today);
  }
  return errors;
}
