# Plataforma de gestión de condominios (frontend)

Aplicación web para administrar un condominio de tres torres: cuotas y pagos, reservas de áreas comunes, incidencias, control de visitas, paquetería, asambleas con votación, comunicados, directorio de residentes, notificaciones y reportes para la administración. La usan tres roles: Administrador, Residente y Personal de seguridad.

Este repositorio contiene el frontend. El backend y la documentación completa del sistema están en [Placeholder_Proyecto1_Backend](https://github.com/CarlosRubio637/Placeholder_Proyecto1_Backend).

**Proyecto asignado:** Proyecto 1: Plataforma de gestión de condominios/edificios
**Equipo:** Placeholder
**Curso:** Ingeniería de Software, UCA, ciclo 02/2026, Sección 01

## Ambiente desplegado

| Componente | URL |
|---|---|
| Frontend | https://placeholder-proyecto1-frontend.vercel.app |
| Documentación de la API (Swagger) | https://placeholderproyecto1backend-production.up.railway.app/api/docs |

El backend está en Railway y el frontend en Vercel, ambos desplegados desde `main`.

Los usuarios de prueba se entregan en Moodle, no en este repositorio.

## Integrantes

| Nombre | Carnet | Usuario de GitHub | Rol en el equipo | Historias |
|---|---|---|---|---|
| Carlos Oswaldo Rubio Cuéllar | 00000822 | [CarlosRubio637](https://github.com/CarlosRubio637) | DevOps | H1, H2, H6, H7, H8, H9, H38 |
| Alison Michelle Maltez Valencia | 00100121 | [MichiiMaltz11](https://github.com/MichiiMaltz11) | Scrum Master | H10, H11, H12, H13, H15, H16, H30, H39 |
| Francisco Alejandro Erroa Ramos | 00300722 | [ferroa](https://github.com/ferroa) | Líder de backend | H14, H31, H32, H33, H34, H35, H36, H37 |
| Luis Andree Hernandez Maltez | 00012321 | [LuisHMaltez](https://github.com/LuisHMaltez) | QA | H17, H18, H19, H20, H21, H22, H23, H24 |
| André Alberto Calidonio Campos | 00363918 | [acalidonio](https://github.com/acalidonio) | Líder de frontend | H3, H4, H5, H25, H26, H27, H28, H29 |

## Stack

| Tecnología | Versión | Uso |
|---|---|---|
| Next.js (App Router) | 16 | Páginas, Server Components, Server Actions y route handlers |
| React | 19 | Interfaz |
| TypeScript | 5 | Tipado estático |
| Tailwind CSS | 4 | Estilos |
| Vitest y Testing Library | 4 | Pruebas de componentes y de utilidades |

## Instalación local

Requisitos: Node.js 22 o superior (la imagen de Docker usa Node 24) y el backend corriendo en local. Los pasos del backend y de la base de datos están en [Instalación local](https://github.com/CarlosRubio637/Placeholder_Proyecto1_Backend/blob/main/docs/05-instalacion-local.md).

1. Copiar el archivo de variables: `cp .env.example .env.local`.
2. Revisar `API_URL` en `.env.local`. En local apunta al backend: `http://localhost:3000/api/v1/`.
3. Instalar las dependencias: `npm ci`.
4. Levantar el servidor de desarrollo en otro puerto, porque el backend ya usa el 3000: `npm run dev -- -p 3001`.
5. Abrir http://localhost:3001 e iniciar sesión con un usuario del seed del backend.

Para correr la imagen de producción:

```
docker build -t condominio-frontend .
docker run -p 3001:3000 -e API_URL=http://host.docker.internal:3000/api/v1/ condominio-frontend
```

`API_URL` se lee al arrancar el servidor, no al construir la imagen, así que la misma imagen sirve para local y para el despliegue.

### Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `API_URL` | URL base de la API, con el prefijo `api/v1` y la barra final. Solo la usa el servidor de Next; el navegador nunca llama al backend directamente. | `http://localhost:3000/api/v1/` |

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (salida `standalone`) |
| `npm start` | Sirve el build de producción |
| `npm run lint` | ESLint |
| `npm test` | Pruebas con Vitest, una sola corrida |
| `npm run test:watch` | Pruebas en modo observación |

Las pruebas viven junto a lo que prueban, con el sufijo `.test.ts` o `.test.tsx`. Cada archivo agrupa sus casos en un `describe` con el ID y el título de la historia, y cada caso empieza con el criterio de aceptación que cubre, por ejemplo `it("AC3: ...")`.

## Estructura

```
app/
  (admin)/admin/     pantallas del Administrador
  (residente)/       pantallas del Residente
  (seguridad)/       pantallas del Personal de seguridad
  (comun)/           pantallas que comparten varios roles
  actions/           Server Actions (formularios y cambios de datos)
  archivos/          route handler que sirve archivos protegidos del backend
  _components/       layout con menú lateral y componentes compartidos
  login/, registro/, sesion/, notificaciones/
lib/
  *-api.ts           llamadas al backend desde el servidor
  *.ts               tipos, formatos y reglas de cada módulo
  validation/        validaciones de formularios
  navigation.ts      menú lateral por rol
  session.ts         cookie de sesión
proxy.ts             redirige a /login si no hay sesión
```

Cada grupo de rol tiene un `layout.tsx` que muestra "No tienes permiso" a los otros roles, y cada página vuelve a validar el rol con `requireRole` antes de consultar datos. El backend responde 403 de todas formas.

## Documentación

La documentación completa está en el repositorio del backend:

1. [Guía de uso](https://github.com/CarlosRubio637/Placeholder_Proyecto1_Backend/blob/main/docs/01-guia-de-uso.md)
2. [Arquitectura](https://github.com/CarlosRubio637/Placeholder_Proyecto1_Backend/blob/main/docs/02-arquitectura.md)
3. [Modelo de datos](https://github.com/CarlosRubio637/Placeholder_Proyecto1_Backend/blob/main/docs/03-modelo-de-datos.md)
4. [API](https://github.com/CarlosRubio637/Placeholder_Proyecto1_Backend/blob/main/docs/04-api.md)
5. [Instalación local](https://github.com/CarlosRubio637/Placeholder_Proyecto1_Backend/blob/main/docs/05-instalacion-local.md)
6. [Despliegue](https://github.com/CarlosRubio637/Placeholder_Proyecto1_Backend/blob/main/docs/06-despliegue.md)
7. [Forma de trabajo](https://github.com/CarlosRubio637/Placeholder_Proyecto1_Backend/blob/main/docs/07-forma-de-trabajo.md)
8. [Historias por módulo](https://github.com/CarlosRubio637/Placeholder_Proyecto1_Backend/blob/main/docs/08-historias.md)
9. [Problemas conocidos](https://github.com/CarlosRubio637/Placeholder_Proyecto1_Backend/blob/main/docs/09-problemas-conocidos.md)
