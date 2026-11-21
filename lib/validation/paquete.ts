// Reglas del formulario "Registrar llegada de paquete" (H19). Deben coincidir
// con el DTO de POST /seguridad/paquetes del backend.

export const LIMITS = {
  courierMin: 2,
  courierMax: 40,
  trackingMin: 4,
  trackingMax: 40,
  notesMax: 200,
} as const;

export const TRACKING_REGEX = /^[A-Za-z0-9-]+$/;

export const MESSAGES = {
  unit: "Selecciona la unidad destino.",
  courier: "Ingresa la empresa de mensajería (2 a 40 caracteres).",
  tracking: "La guía solo admite letras, números y guiones (4 a 40).",
  notes: "Las observaciones no pueden superar los 200 caracteres.",
  unitNotFound: "La unidad no existe.",
  unitWithoutResidents: "La unidad no tiene residentes registrados.",
  saved: (code: string, unit: string) => `Paquete ${code} registrado para ${unit}`,
} as const;

export type PaqueteValues = {
  towerId: string;
  unitId: string;
  courier: string;
  trackingNumber: string;
  notes: string;
};

export type PaqueteErrors = Partial<Record<"unitId" | "courier" | "trackingNumber" | "notes", string>>;

export const FIELD_PATH_REGEX = /^(unitId|courier|trackingNumber|notes)$/;

export function cleanPaquete(values: PaqueteValues): PaqueteValues {
  return {
    towerId: values.towerId.trim(),
    unitId: values.unitId.trim(),
    courier: values.courier.trim(),
    trackingNumber: values.trackingNumber.trim(),
    notes: values.notes.trim(),
  };
}

export function validatePaquete(values: PaqueteValues): PaqueteErrors {
  const errors: PaqueteErrors = {};
  if (!values.unitId) errors.unitId = MESSAGES.unit;
  if (values.courier.length < LIMITS.courierMin || values.courier.length > LIMITS.courierMax) {
    errors.courier = MESSAGES.courier;
  }
  if (values.trackingNumber) {
    const t = values.trackingNumber;
    if (t.length < LIMITS.trackingMin || t.length > LIMITS.trackingMax || !TRACKING_REGEX.test(t)) {
      errors.trackingNumber = MESSAGES.tracking;
    }
  }
  if (values.notes.length > LIMITS.notesMax) {
    errors.notes = MESSAGES.notes;
  }
  return errors;
}
