// Tipos y utilidades de votación (H23) que se pueden usar desde el cliente.
// Están separados de lib/votaciones.ts (que depende de apiFetch y next/headers,
// solo para el servidor).

export type MyUnitVote = {
  /** Fecha ISO. */
  votedAt: string;
  /** true si la unidad votó desde mi propia sesión (el residente actual). */
  byMe: boolean;
};

export type Opcion = { id: string; text: string };

export type Tema = {
  id: string;
  question: string;
  options: Opcion[];
  myUnitVote: MyUnitVote | null;
};

// DD/MM/AAAA HH:mm con AM/PM, en hora de El Salvador.
const DATE_TIME_LONG = new Intl.DateTimeFormat("es-SV", {
  timeZone: "America/El_Salvador",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export function formatFechaLarga(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? "—" : DATE_TIME_LONG.format(ms);
}