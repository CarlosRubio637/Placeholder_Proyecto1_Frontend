import { NextResponse, type NextRequest } from "next/server";
import { apiFetch } from "@/lib/api";

// Sirve archivos protegidos del backend (por ahora, fotos de incidencias) con
// el token de la sesión, para usarlos en <img src="/archivos/...">:
//
//   /archivos/incidencias/fotos/<fotoId>  →  GET API_URL/incidencias/fotos/<fotoId>
//
// Solo se permiten estas rutas para que esto no sea un proxy abierto a
// cualquier GET de la API. Cada historia que sirva archivos suma su prefijo.
const ALLOWED_PREFIXES = ["incidencias/fotos/"];

export async function GET(_request: NextRequest, ctx: RouteContext<"/archivos/[...ruta]">) {
  const { ruta } = await ctx.params;
  const path = ruta.map(encodeURIComponent).join("/");

  if (!ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return new NextResponse(null, { status: 404 });
  }

  // apiFetch redirige a /sesion/expirada si el backend responde 401.
  const res = await apiFetch(path);
  if (!res.ok || !res.body) {
    return new NextResponse(null, { status: res.status === 403 ? 403 : 404 });
  }

  return new NextResponse(res.body, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/octet-stream",
      // Es contenido privado de la sesión: el navegador puede guardarlo, un
      // proxy o CDN intermedio no.
      "Cache-Control": "private, max-age=3600",
    },
  });
}
