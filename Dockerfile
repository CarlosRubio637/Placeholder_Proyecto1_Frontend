# syntax=docker/dockerfile:1

# ===========================================================================
# Dockerfile multi-stage para el frontend Next.js.
#
# Usa la salida `standalone` de Next (next.config.ts): la imagen final solo
# lleva el servidor y las dependencias que la app usa.
#
# API_URL se lee en tiempo de ejecución (las llamadas al backend se hacen en
# el servidor), así que la misma imagen sirve para cualquier ambiente:
#   docker build -t condominio-frontend .
#   docker run -p 3001:3000 -e API_URL=https://<api>/api/v1/ condominio-frontend
# ===========================================================================

# --- Etapa 1: dependencias -------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# --- Etapa 2: build --------------------------------------------------------
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Etapa 3: runtime ------------------------------------------------------
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# La imagen de Node ya trae el usuario `node` sin privilegios.
USER node

EXPOSE 3000

CMD ["node", "server.js"]
