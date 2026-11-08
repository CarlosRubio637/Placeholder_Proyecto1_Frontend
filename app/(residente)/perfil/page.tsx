import type { Metadata } from "next";
import { requireRole } from "@/lib/api";
import { fetchPerfil } from "@/lib/perfil-api";
import { PerfilForm } from "./perfil-form";

export const metadata: Metadata = {
  title: "Mi perfil y privacidad",
};

export default async function PerfilPage() {
  const user = await requireRole("RESIDENTE");
  if (!user) return null;

  const perfil = await fetchPerfil();

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Mi perfil y privacidad</h1>
      <PerfilForm perfil={perfil} />
    </div>
  );
}
