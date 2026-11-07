import { apiFetch } from "@/lib/api";
import type { FeeGenerationsPage } from "@/lib/cuotas";

export const HISTORY_PAGE_SIZE = 10;

export async function fetchGeneraciones(page: number): Promise<FeeGenerationsPage> {
  const res = await apiFetch(`cuotas/generaciones?page=${page}&pageSize=${HISTORY_PAGE_SIZE}`);
  if (!res.ok) {
    throw new Error(`GET cuotas/generaciones respondió ${res.status}`);
  }
  return res.json();
}
