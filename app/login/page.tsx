import type { Metadata } from "next";
import Link from "next/link";
import { getAviso } from "@/lib/avisos";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const { aviso } = await props.searchParams;
  const mensaje = getAviso(aviso);

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <main className="w-full max-w-sm rounded-xl border border-zinc-200 border-t-4 border-t-primary bg-white p-8 shadow-sm dark:border-zinc-800 dark:border-t-primary dark:bg-zinc-900">
        <h1 className="mb-6 text-2xl font-semibold">Iniciar sesión</h1>
        {mensaje ? (
          <p
            role="status"
            className="mb-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
          >
            {mensaje}
          </p>
        ) : null}
        <LoginForm />
        <p className="mt-4 text-sm">
          ¿Eres residente y no tienes cuenta?{" "}
          <Link href="/registro" className="underline underline-offset-4">
            Crear cuenta
          </Link>
        </p>
      </main>
    </div>
  );
}
