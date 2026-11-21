import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// Destino de apiFetch cuando el backend responde 401: borra la cookie de
// sesión y redirige a /login con el aviso "Tu sesión expiró".
export function GET(request: NextRequest) {
  const loginUrl = new URL("/login", request.nextUrl);
  loginUrl.searchParams.set("aviso", "sesion-expirada");

  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
