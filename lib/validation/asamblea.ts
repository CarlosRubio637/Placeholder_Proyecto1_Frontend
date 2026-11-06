// Reglas del formulario "Convocar asamblea" (H22). Deben coincidir con el DTO
// de POST/PUT /admin/asambleas del backend.

import { DAY_MS, HOUR_MS, localToMs } from "@/lib/fechas";

export const LIMITS = {
  titleMin: 5,
  titleMax: 100,
  descriptionMax: 1000,
  topicsMin: 1,
  topicsMax: 10,
  questionMin: 5,
  questionMax: 200,
  optionsMin: 2,
  optionsMax: 6,
  optionMin: 1,
  optionMax: 80,
  /** El inicio debe ser al menos 1 hora después de ahora. */
  startLeadMs: HOUR_MS,
  /** El cierre va de 1 hora a 14 días después del inicio. */
  durationMinMs: HOUR_MS,
  durationMaxMs: 14 * DAY_MS,
} as const;

export const DEFAULT_OPTIONS = ["A favor", "En contra"] as const;

export const MESSAGES = {
  title: "El título debe tener entre 5 y 100 caracteres.",
  description: "La descripción no puede superar los 1,000 caracteres.",
  startRequired: "Indica la fecha y hora de inicio.",
  startsAt: "El inicio debe ser al menos 1 hora después de ahora.",
  endRequired: "Indica la fecha y hora de cierre.",
  endsAt: "El cierre debe estar entre 1 hora y 14 días después del inicio.",
  topics: "La agenda necesita entre 1 y 10 temas.",
  question: "La pregunta debe tener entre 5 y 200 caracteres.",
  options: "Cada tema necesita entre 2 y 6 opciones distintas.",
  option: "Cada opción debe tener entre 1 y 80 caracteres.",
  optionRepeated: "Esta opción está repetida en el tema.",
  started: "La asamblea ya inició; no se puede modificar.",
  saved: "Asamblea programada",
  deleted: "Asamblea eliminada",
} as const;

export type TopicValues = { question: string; options: string[] };

export type AsambleaValues = {
  title: string;
  description: string;
  /** Valor datetime-local (hora de El Salvador). */
  startsAt: string;
  endsAt: string;
  topics: TopicValues[];
};

/**
 * Errores por campo. Las llaves usan la misma ruta que el backend manda en
 * `field`: "title", "description", "startsAt", "endsAt", "topics",
 * "topics.0.question", "topics.0.options" (el tema completo) y
 * "topics.0.options.1" (una opción).
 */
export type AsambleaErrors = Record<string, string>;

/** Ruta de campo válida, tanto de nuestras reglas como del `field` del backend. */
export const FIELD_PATH_REGEX =
  /^(title|description|startsAt|endsAt|topics)(\.\d+(\.(question|options)(\.\d+)?)?)?$/;

/** Quita espacios al inicio y al final de todos los textos. */
export function cleanAsamblea(values: AsambleaValues): AsambleaValues {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    startsAt: values.startsAt,
    endsAt: values.endsAt,
    topics: values.topics.map((topic) => ({
      question: topic.question.trim(),
      options: topic.options.map((option) => option.trim()),
    })),
  };
}

/** Recibe valores ya limpios (cleanAsamblea) y el instante actual en milisegundos. */
export function validateAsamblea(values: AsambleaValues, now: number): AsambleaErrors {
  const errors: AsambleaErrors = {};

  if (values.title.length < LIMITS.titleMin || values.title.length > LIMITS.titleMax) {
    errors.title = MESSAGES.title;
  }
  if (values.description.length > LIMITS.descriptionMax) {
    errors.description = MESSAGES.description;
  }

  const start = localToMs(values.startsAt);
  const end = localToMs(values.endsAt);
  if (start === null) {
    errors.startsAt = MESSAGES.startRequired;
  } else if (start < now + LIMITS.startLeadMs) {
    errors.startsAt = MESSAGES.startsAt;
  }
  if (end === null) {
    errors.endsAt = MESSAGES.endRequired;
  } else if (start !== null) {
    const duration = end - start;
    if (duration < LIMITS.durationMinMs || duration > LIMITS.durationMaxMs) {
      errors.endsAt = MESSAGES.endsAt;
    }
  }

  if (values.topics.length < LIMITS.topicsMin || values.topics.length > LIMITS.topicsMax) {
    errors.topics = MESSAGES.topics;
  }

  values.topics.forEach((topic, i) => {
    const { question, options } = topic;
    if (question.length < LIMITS.questionMin || question.length > LIMITS.questionMax) {
      errors[`topics.${i}.question`] = MESSAGES.question;
    }

    let optionsInvalid = options.length < LIMITS.optionsMin || options.length > LIMITS.optionsMax;
    const seen = new Set<string>();
    options.forEach((text, j) => {
      if (text.length < LIMITS.optionMin || text.length > LIMITS.optionMax) {
        errors[`topics.${i}.options.${j}`] = MESSAGES.option;
        return;
      }
      const normalized = text.toLocaleLowerCase("es");
      if (seen.has(normalized)) {
        errors[`topics.${i}.options.${j}`] = MESSAGES.optionRepeated;
        optionsInvalid = true;
      } else {
        seen.add(normalized);
      }
    });
    if (optionsInvalid) errors[`topics.${i}.options`] = MESSAGES.options;
  });

  return errors;
}
