import type { Metadata } from "next";
import { RegistroForm } from "./registro-form";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

export default function RegistroPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <main className="w-full max-w-xl rounded-xl border border-zinc-200 p-8 dark:border-zinc-800">
        <h1 className="text-2xl font-semibold">Crear cuenta de residente</h1>
        <p className="mt-2 mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Usa el código de 8 caracteres que te entregó la administración.
        </p>
        <RegistroForm />
      </main>
    </div>
  );
}
