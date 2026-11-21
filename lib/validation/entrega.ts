// Reglas del formulario "Entregar paquete" (H21). Deben coincidir con
// DeliverPackageDto del backend, que reutiliza las de H14 (visitas):
// nombre con letras y espacios, DUI 00000000-0 y pasaporte de 6 a 12 letras
// o números.
// Este archivo no importa nada del servidor: lo usa un componente de cliente.

export type DocType = "DUI" | "PASAPORTE";

export const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: "DUI", label: "DUI" },
  { value: "PASAPORTE", label: "Pasaporte" },
];

// Igual que el backend: cualquier letra (con tildes, ñ, ç, etc.) y espacios.
// Con new RegExp porque el target de TypeScript (ES2017) no acepta \p{L} en
// una regex literal.
export const NAME_REGEX = new RegExp("^[\\p{L} ]+$", "u");
export const DUI_REGEX = /^\d{8}-\d$/;
export const PASSPORT_REGEX = /^[A-Za-z0-9]{6,12}$/;

export const ENTREGA_MESSAGES = {
  name: "Ingresa el nombre de quien recoge (3 a 80 letras).",
  dui: "Ingresa el DUI con el formato 00000000-0.",
  passport: "Ingresa un pasaporte de 6 a 12 letras o números.",
  success: "Paquete entregado",
} as const;

export type EntregaValues = {
  pickedUpByName: string;
  pickedUpByDocType: DocType;
  pickedUpByDocNumber: string;
};

export type EntregaErrors = Partial<Record<keyof EntregaValues, string>>;

export const ENTREGA_FIELD_REGEX = /^(pickedUpByName|pickedUpByDocType|pickedUpByDocNumber)$/;

/** Quita espacios de más (al inicio, al final y repetidos en medio). */
export function cleanEntrega(values: EntregaValues): EntregaValues {
  return {
    pickedUpByName: values.pickedUpByName.trim().replace(/\s+/g, " "),
    pickedUpByDocType: values.pickedUpByDocType,
    pickedUpByDocNumber: values.pickedUpByDocNumber.trim(),
  };
}

export function validateEntrega(values: EntregaValues): EntregaErrors {
  const errors: EntregaErrors = {};
  const { pickedUpByName: name, pickedUpByDocType: type, pickedUpByDocNumber: doc } = values;

  if (name.length < 3 || name.length > 80 || !NAME_REGEX.test(name)) {
    errors.pickedUpByName = ENTREGA_MESSAGES.name;
  }
  if (type === "DUI" && !DUI_REGEX.test(doc)) {
    errors.pickedUpByDocNumber = ENTREGA_MESSAGES.dui;
  }
  if (type === "PASAPORTE" && !PASSPORT_REGEX.test(doc)) {
    errors.pickedUpByDocNumber = ENTREGA_MESSAGES.passport;
  }
  return errors;
}