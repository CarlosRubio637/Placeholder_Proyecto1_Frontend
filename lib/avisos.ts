// Avisos que la pantalla de login muestra según el parámetro ?aviso=...
export const AVISOS = {
  "cuenta-creada": "Cuenta creada. Inicia sesión.",
  "sesion-expirada": "Tu sesión expiró. Inicia sesión de nuevo.",
} as const;

export type AvisoKey = keyof typeof AVISOS;

export function getAviso(value: string | string[] | undefined) {
  const key = Array.isArray(value) ? value[0] : value;
  return key && key in AVISOS ? AVISOS[key as AvisoKey] : undefined;
}
