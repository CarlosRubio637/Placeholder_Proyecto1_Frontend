import { apiFetch } from "@/lib/api";
import type { Perfil } from "@/lib/perfil";

export async function fetchPerfil(): Promise<Perfil> {
  const res = await apiFetch("perfil");
  if (!res.ok) {
    throw new Error(`GET perfil respondió ${res.status}`);
  }
  return res.json();
}
