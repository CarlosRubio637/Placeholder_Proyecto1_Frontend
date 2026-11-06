import type { NextConfig } from "next";

// H10 sube hasta 3 fotos de 5 MB (15 MB) en un solo formulario. Se deja 1 MB
// de margen para los campos de texto y los encabezados del multipart.
const UPLOAD_BODY_LIMIT = "16mb";

const nextConfig: NextConfig = {
  experimental: {
    // Límite del cuerpo de los Server Actions (por defecto 1 MB).
    serverActions: {
      bodySizeLimit: UPLOAD_BODY_LIMIT,
    },
    // proxy.ts hace que Next guarde el cuerpo en memoria; por defecto solo
    // hasta 10 MB, y lo que pase de ahí se corta sin error.
    proxyClientMaxBodySize: UPLOAD_BODY_LIMIT,
  },
};

export default nextConfig;
