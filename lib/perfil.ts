export type DirectoryPrefs = {
  visible: boolean;
  showName: boolean;
  showUnit: boolean;
  showPhone: boolean;
  showEmail: boolean;
};

export type Perfil = {
  fullName: string;
  email: string;
  unitCode: string | null;
  phone: string;
  directory: DirectoryPrefs;
};

export type VisibilityKey = "showName" | "showUnit" | "showPhone" | "showEmail";

export const VISIBILITY_OPTIONS: { key: VisibilityKey; label: string }[] = [
  { key: "showName", label: "Nombre completo" },
  { key: "showUnit", label: "Unidad (torre y número)" },
  { key: "showPhone", label: "Teléfono" },
  { key: "showEmail", label: "Correo" },
];

export type PreviewCard = {
  name?: string;
  unit?: string;
  phone?: string;
  email?: string;
};

export function previewCard(perfil: Perfil, phone: string, prefs: DirectoryPrefs): PreviewCard | null {
  if (!prefs.visible) return null;
  const card: PreviewCard = {};
  if (prefs.showName) card.name = perfil.fullName;
  if (prefs.showUnit && perfil.unitCode) card.unit = perfil.unitCode;
  if (prefs.showPhone) card.phone = phone;
  if (prefs.showEmail) card.email = perfil.email;
  return card;
}
