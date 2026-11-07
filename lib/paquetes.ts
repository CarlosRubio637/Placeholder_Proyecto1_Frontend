import { apiFetch } from "@/lib/api";

// Tipos y consultas del módulo de paquetería (H19). Solo para Server
// Components y Server Functions: usa apiFetch, que lee la cookie de sesión.

export const PAQUETES_PATH = "/seguridad/paquetes";
export const PAGE_SIZE = 20;

export type PackageStatus = "PENDIENTE_ENTREGA" | "ENTREGADO";

export type Torre = { id: string; name: string; letter: string };
export type UnidadRef = { id: string; code: string };
export type Unidad = UnidadRef & { number: string };

export type Paquete = {
  id: string;
  code: string;
  unit: UnidadRef;
  courier: string;
  trackingNumber: string | null;
  notes: string | null;
  status: PackageStatus;
  receivedAt: string;
};

export type PaqueteLista = {
  data: Paquete[];
  total: number;
  page: number;
  pageSize: number;
};

export async function getTorres(): Promise<Torre[]> {
  const res = await apiFetch("torres");
  if (!res.ok) throw new Error(`GET torres respondió ${res.status}`);
  return res.json();
}

export async function getUnidades(towerId: string): Promise<Unidad[]> {
  const res = await apiFetch(`unidades?towerId=${encodeURIComponent(towerId)}`);
  if (!res.ok) throw new Error(`GET unidades respondió ${res.status}`);
  return res.json();
}

export type PaquetesFiltros = {
  status?: PackageStatus;
  page: number;
  search?: string;
};

export async function getPaquetes(filtros: PaquetesFiltros): Promise<PaqueteLista> {
  const params = new URLSearchParams();
  if (filtros.status) params.set("status", filtros.status);
  if (filtros.search) params.set("search", filtros.search);
  params.set("page", String(filtros.page));
  params.set("pageSize", String(PAGE_SIZE));
  const res = await apiFetch(`seguridad/paquetes?${params.toString()}`);
  if (!res.ok) throw new Error(`GET paquetes respondió ${res.status}`);
  return res.json();
}

// DD/MM/AAAA HH:mm, en hora de El Salvador.
const formatter = new Intl.DateTimeFormat("es-SV", {
  timeZone: "America/El_Salvador",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatRecibido(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "—";
  // Intl pone ", " entre fecha y hora; la vista usa un solo espacio.
  return formatter.format(ms).replace(", ", " ");
}
