import { apiFetch } from "@/lib/api";

// Portería: quién está dentro (H18). Solo para Server Components: usa
// apiFetch, que lee la cookie de sesión.

export const DENTRO_PATH = "/seguridad/dentro";
export const DENTRO_PAGE_SIZE = 50;
/** Cada cuánto se vuelve a consultar la lista mientras está abierta. */
export const DENTRO_REFRESH_MS = 30_000;

export type DocumentType = "DUI" | "PASAPORTE";

export type VisitaDentro = {
  id: string;
  visitorName: string;
  documentType: DocumentType;
  documentNumber: string;
  unitCode: string;
  reason: string;
  entryAt: string;
  /** Calculado por el servidor al momento de la consulta. */
  minutesInside: number;
};

export type ListaDentro = {
  totalInside: number;
  data: VisitaDentro[];
  total: number;
  page: number;
  pageSize: number;
};

export type FiltrosDentro = {
  towerId?: string;
  search?: string;
  page: number;
};

export async function getDentro(filtros: FiltrosDentro): Promise<ListaDentro> {
  const params = new URLSearchParams();
  if (filtros.towerId) params.set("towerId", filtros.towerId);
  if (filtros.search) params.set("search", filtros.search);
  params.set("page", String(filtros.page));
  params.set("pageSize", String(DENTRO_PAGE_SIZE));

  const res = await apiFetch(`seguridad/visitas/dentro?${params.toString()}`);
  if (!res.ok) throw new Error(`GET seguridad/visitas/dentro respondió ${res.status}`);
  return res.json();
}

/** "DUI 01234567-8" o "Pasaporte C1112223". */
export function formatDocumento(type: DocumentType, number: string): string {
  return `${type === "DUI" ? "DUI" : "Pasaporte"} ${number}`;
}

/** 506 → "8 h 26 min"; 0 → "0 h 00 min". */
export function formatTiempoDentro(minutes: number): string {
  const safe = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(safe / 60);
  const rest = String(safe % 60).padStart(2, "0");
  return `${hours} h ${rest} min`;
}

const SV = "America/El_Salvador";
const hora = new Intl.DateTimeFormat("es-SV", {
  timeZone: SV,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const dia = new Intl.DateTimeFormat("es-SV", {
  timeZone: SV,
  day: "2-digit",
  month: "2-digit",
});
const fechaClave = new Intl.DateTimeFormat("en-CA", { timeZone: SV });

/**
 * Hora de entrada en El Salvador: "14:05" si fue hoy y "18/11 21:00" si fue
 * otro día (una visita sin salida registrada sigue en la lista).
 */
export function formatEntrada(iso: string, now: Date = new Date()): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "—";
  const sameDay = fechaClave.format(ms) === fechaClave.format(now);
  return sameDay ? hora.format(ms) : `${dia.format(ms)} ${hora.format(ms)}`;
}
