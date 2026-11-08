import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import type { Role } from "@/lib/roles";

// Ruta interna que borra la cookie de sesión y manda a /login con el aviso
// "Tu sesión expiró". Existe porque un Server Component no puede borrar
// cookies; solo un Route Handler o un Server Function pueden hacerlo.
export const SESSION_EXPIRED_PATH = "/sesion/expirada";

function buildApiUrl(path: string) {
  const base = process.env.API_URL;
  if (!base) {
    throw new Error("Falta la variable de entorno API_URL.");
  }
  return new URL(path.replace(/^\//, ""), base.replace(/\/?$/, "/"));
}

// Llama al backend desde el servidor (Server Components y Server Functions).
// - Agrega el token de la sesión como "Authorization: Bearer ...".
// - Si el backend responde 401 con una sesión activa, la sesión expiró:
//   borra la cookie y redirige a /login con el aviso correspondiente.
// - `path` es relativo a API_URL, por ejemplo "auth/me".
export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = await getSession();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(buildApiUrl(path), {
    cache: "no-store",
    ...init,
    headers,
  });

  if (res.status === 401 && token) {
    redirect(SESSION_EXPIRED_PATH);
  }
  return res;
}

export type CurrentUser = {
  id: string;
  email: string;
  role: Role;
  // null si la cuenta todavía no tiene perfil (por ejemplo, el usuario demo).
  fullName: string | null;
  unit: { id: string; code: string } | null;
};

// Usuario de la sesión según GET /auth/me. `cache` evita repetir la llamada
// cuando el layout y la página la piden en la misma petición.
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  if (!(await getSession())) {
    redirect("/login");
  }
  const res = await apiFetch("auth/me");
  if (!res.ok) {
    throw new Error(`auth/me respondió ${res.status}`);
  }
  return res.json();
});

// Llamar al inicio de CADA página dentro de un grupo de rol:
//
//   const user = await requireRole("ADMINISTRADOR");
//   if (!user) return null;
//
// Next ejecuta la página aunque el layout del grupo muestre "No tienes
// permiso", y su contenido viaja en la respuesta (RSC payload). Con esta
// validación la página no consulta datos ni envía nada si el rol no coincide;
// el aviso lo pone el layout. El backend igual responde 403 por rol.
export async function requireRole(role: Role): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user.role === role ? user : null;
}

// Igual que requireRole, para las páginas que comparten varios roles (H6).
export async function requireAnyRole(roles: Role[]): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return roles.includes(user.role) ? user : null;
}
