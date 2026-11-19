// Reglas de la pantalla "Portería: entradas" (H16). Deben coincidir con
// SearchVisitsQueryDto y CreateVisitRequestDto del backend. Nombre, documento
// y motivo usan los mismos mensajes y límites de H14.
// Sin dependencias del servidor: las usan los componentes y las Server Functions.

import { MESSAGES as VISIT_MESSAGES, cleanName, validateVisitante } from "@/lib/validation/visita";

export const MESSAGES = {
  ...VISIT_MESSAGES,
  search:
    "Ingresa un código de 6 caracteres o un número de documento (6 a 12 letras, números o guiones).",
  notFound: "No se encontró una autorización con ese código o documento.",
  tower: "Selecciona la torre.",
  unit: "Selecciona la unidad destino.",
  requestSent: (unitCode: string) => `Solicitud enviada a la unidad ${unitCode}`,
  entryRegistered: (time: string) => `Entrada registrada a las ${time}`,
} as const;

const SEARCH_REGEX = /^[A-Z0-9-]{6,12}$/;

/** Búsqueda como la normaliza el backend: sin espacios y en mayúsculas. */
export function cleanSearch(value: string): string {
  return value.trim().toUpperCase();
}

export function validateSearch(value: string): string | undefined {
  return SEARCH_REGEX.test(cleanSearch(value)) ? undefined : MESSAGES.search;
}

export type SolicitudValues = {
  visitorName: string;
  documentType: string;
  documentNumber: string;
  towerId: string;
  unitId: string;
  reason: string;
};

export type SolicitudField = keyof SolicitudValues;
export type SolicitudErrors = Partial<Record<SolicitudField, string>>;

/** Campos que el backend puede indicar en `field`. */
export const FIELD_PATH_REGEX = /^(visitorName|documentType|documentNumber|unitId|reason)$/;

export function cleanSolicitud(values: SolicitudValues): SolicitudValues {
  return {
    visitorName: cleanName(values.visitorName),
    documentType: values.documentType,
    documentNumber: values.documentNumber.trim(),
    towerId: values.towerId,
    unitId: values.unitId,
    reason: values.reason.trim(),
  };
}

/** Errores por campo de valores ya limpios (cleanSolicitud). Vacío si todo es válido. */
export function validateSolicitud(values: SolicitudValues): SolicitudErrors {
  const errors: SolicitudErrors = validateVisitante(values);
  if (!values.towerId) errors.towerId = MESSAGES.tower;
  if (!values.unitId) errors.unitId = MESSAGES.unit;
  return errors;
}
