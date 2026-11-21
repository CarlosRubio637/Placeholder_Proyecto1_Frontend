import { NextResponse, type NextRequest } from "next/server";
import { apiFetch } from "@/lib/api";
import { EXPORT_PATH } from "@/lib/exportar-reporte";

// Sirve archivos protegidos del backend con el token de la sesión:
//
//   /archivos/incidencias/fotos/<fotoId>  →  GET API_URL/incidencias/fotos/<fotoId>
//     Fotos de incidencias, para usarlas en <img src="/archivos/...">.
//   /archivos/admin/reportes/<reporte>/exportar?format=pdf&…  →  GET API_URL/admin/reportes/<reporte>/exportar?…
//     Exportación de reportes (H36). Reenvía el query string y el nombre del archivo.
//
// Solo se permiten estas rutas para que esto no sea un proxy abierto a
// cualquier GET de la API. Cada historia que sirva archivos suma su ruta.
const ALLOWED_PREFIXES = ["incidencias/fotos/"];

export async function GET(request: NextRequest, ctx: RouteContext<"/archivos/[...ruta]">) {
  const { ruta } = await ctx.params;
  const path = ruta.map(encodeURIComponent).join("/");

  if (EXPORT_PATH.test(path)) {
    return exportar(`${path}${request.nextUrl.search}`);
  }

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

// H36: el archivo pasa tal cual, con Content-Disposition para que el
// navegador lo guarde con su nombre. Un 400 (formato, filtros o más de 5,000
// filas) pasa con su mensaje para mostrarlo; otros errores, solo el estado.
async function exportar(pathWithQuery: string) {
  const res = await apiFetch(pathWithQuery);

  if (res.status === 400) {
    return NextResponse.json(await res.json().catch(() => ({})), { status: 400 });
  }
  if (!res.ok || !res.body) {
    return new NextResponse(null, { status: res.status === 403 ? 403 : 502 });
  }

  const headers = new Headers({
    "Content-Type": res.headers.get("Content-Type") ?? "application/octet-stream",
    // Las cifras cambian: cada exportación se genera de nuevo.
    "Cache-Control": "no-store",
  });
  const disposition = res.headers.get("Content-Disposition");
  if (disposition) headers.set("Content-Disposition", disposition);

  return new NextResponse(res.body, { status: 200, headers });
}
