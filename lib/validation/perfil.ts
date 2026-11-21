import type { DirectoryPrefs } from "@/lib/perfil";

export const MESSAGES = {
  phone: "Ingresa el teléfono con el formato 0000-0000.",
  nameRequired: "Para aparecer en el directorio debes mostrar tu nombre.",
  forbidden: "No tienes permiso para esta acción.",
  saveFailed: "No se pudieron guardar las preferencias. Intenta de nuevo.",
} as const;

export type PerfilValues = {
  phone: string;
  directory: DirectoryPrefs;
};

export type PerfilField = "phone" | "directory.showName";
export type PerfilErrors = Partial<Record<PerfilField, string>>;

const PHONE_REGEX = /^\d{4}-\d{4}$/;

const PREF_KEYS: (keyof DirectoryPrefs)[] = ["visible", "showName", "showUnit", "showPhone", "showEmail"];

export function readPerfilValues(formData: FormData): PerfilValues {
  const flag = (key: keyof DirectoryPrefs) => formData.get(key) === "on";
  return {
    phone: String(formData.get("phone") ?? "").trim(),
    directory: {
      visible: flag("visible"),
      showName: flag("showName"),
      showUnit: flag("showUnit"),
      showPhone: flag("showPhone"),
      showEmail: flag("showEmail"),
    },
  };
}

export function validatePerfil(values: PerfilValues): PerfilErrors {
  const errors: PerfilErrors = {};
  if (!PHONE_REGEX.test(values.phone.trim())) errors.phone = MESSAGES.phone;
  if (values.directory.visible && !values.directory.showName) {
    errors["directory.showName"] = MESSAGES.nameRequired;
  }
  return errors;
}

export function turnOn(prefs: DirectoryPrefs): DirectoryPrefs {
  return { ...prefs, visible: true, showName: true };
}

export function sameValues(a: PerfilValues, b: PerfilValues): boolean {
  return a.phone.trim() === b.phone.trim() && PREF_KEYS.every((key) => a.directory[key] === b.directory[key]);
}
