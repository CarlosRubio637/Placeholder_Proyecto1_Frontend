// Constantes de "Quién está dentro" (H18) y de la salida (H17) que también
// usan los componentes de cliente. Este archivo no importa nada del servidor.

export const DENTRO_PATH = "/seguridad/dentro";
/** Cada cuánto se vuelve a consultar la lista mientras está abierta. */
export const DENTRO_REFRESH_MS = 30_000;
export const DENTRO_SEARCH_MAX = 80;

/** Claves de los avisos en la URL; el texto vive aquí, nunca en la URL. */
export const AVISO_SALIDA = "salida";
export const ALERTAS = {
  "sin-entrada": "Este visitante no tiene una entrada activa.",
  "no-existe": "La visita no existe.",
} as const;
export type AlertaKey = keyof typeof ALERTAS;

/** "HH:mm" en 24 horas. */
export const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Parámetros de aviso que se quitan de la URL una vez mostrados. */
export const AVISO_PARAMS = ["aviso", "alerta", "hora"] as const;
