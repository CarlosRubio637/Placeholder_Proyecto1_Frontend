// Fechas de las asambleas (H22).
//
// El condominio está en El Salvador: UTC-6 todo el año, sin horario de verano.
// El formulario trabaja con valores "datetime-local" (YYYY-MM-DDTHH:mm, sin
// zona) y siempre los interpreta como hora de El Salvador, así la pantalla se
// ve igual sin importar la zona horaria del navegador o del servidor. Al
// enviar al backend se convierten a un instante ISO (UTC).

export const SV_TIME_ZONE = "America/El_Salvador";
const SV_OFFSET = "-06:00";
const SV_OFFSET_MS = 6 * 60 * 60 * 1000;

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

/** Momento actual. Vive aquí para que las reglas de validación reciban "ahora" como dato. */
export const ahora = () => Date.now();

const LOCAL_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** "2026-11-15T08:00" (hora de El Salvador) → milisegundos UTC, o null si no es válido. */
export function localToMs(local: string): number | null {
  if (!LOCAL_REGEX.test(local)) return null;
  const ms = Date.parse(`${local}:00${SV_OFFSET}`);
  return Number.isNaN(ms) ? null : ms;
}

/** Milisegundos UTC → "YYYY-MM-DDTHH:mm" en hora de El Salvador. */
export function msToLocal(ms: number): string {
  return new Date(ms - SV_OFFSET_MS).toISOString().slice(0, 16);
}

/** Fecha ISO del backend → valor para <input type="datetime-local">. */
export function isoToLocal(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? "" : msToLocal(ms);
}

/** Valores por defecto del formulario: inicio mañana a las 08:00 y cierre 2 días después. */
export function defaultSchedule(nowMs: number = ahora()) {
  const wall = new Date(nowMs - SV_OFFSET_MS); // reloj de pared de El Salvador, leído como UTC
  const start = new Date(
    Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate() + 1, 8, 0),
  );
  const end = new Date(start.getTime() + 2 * DAY_MS);
  return {
    startsAt: start.toISOString().slice(0, 16),
    endsAt: end.toISOString().slice(0, 16),
  };
}

const formatter = new Intl.DateTimeFormat("es-SV", {
  timeZone: SV_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

/** Fecha ISO → texto para mostrar, p. ej. "15/11/2026, 08:00 a. m.". Solo en Server Components. */
export function formatFecha(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? "—" : formatter.format(ms);
}
