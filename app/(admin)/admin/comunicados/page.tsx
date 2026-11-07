import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/api";

export const metadata: Metadata = {
  title: "Comunicados",
};

const AVISOS: Record<string, string> = {
  "comunicado-publicado": "Comunicado publicado",
};

export default async function ComunicadosPage(props: PageProps<"/admin/comunicados">) {
  const user = await requireRole("ADMINISTRADOR");
  if (!user) return null;

  const { aviso } = await props.searchParams;
  const mensaje = typeof aviso === "string" ? AVISOS[aviso] : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Comunicados</h1>
        <Link
          href="/admin/comunicados/nuevo"
          className="rounded-md bg-foreground px-4 py-2 font-medium text-background"
        >
          Nuevo comunicado
        </Link>
      </div>

      {mensaje ? (
        <p
          role="status"
          className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
        >
          {mensaje}
        </p>
      ) : null}
    </div>
  );
}
