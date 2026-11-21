import type { Metadata } from "next";
import { requireRole } from "@/lib/api";
import { AreaForm } from "../_components/area-form";

export const metadata: Metadata = {
  title: "Nueva área",
};

// H9: registrar un área común.
export default async function NuevaAreaPage() {
  const user = await requireRole("ADMINISTRADOR");
  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Nueva área</h1>
      <AreaForm />
    </div>
  );
}
