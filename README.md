# Sistema de Administración

Monorepo para gestionar pedidos/agenda de ventas, total de ventas, clientes
frecuentes y balance de cargas.

## Estructura

```
apps/
  api/    Backend Node.js + Express + Supabase (verifica tokens de Supabase Auth)
  web/    Frontend SvelteKit (SPA) + Supabase Auth (Google OAuth)
supabase/
  schema.sql   Tablas y RLS para ejecutar en Supabase SQL Editor
```

## Requisitos

- Node.js 18+ (instalado v26)
- Cuenta/proyecto en [Supabase](https://supabase.com)

## Configuración

1. **Base de datos**: ejecuta `supabase/schema.sql` en el SQL Editor de Supabase.
2. **Variables de entorno**: copia `.env.example` a `apps/api/.env` y completa:
   - `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Project Settings → API)
   - `JWT_SECRET` (string aleatorio largo)
   - `CORS_ORIGIN` (origen del frontend)
3. **Frontend**: crea `apps/web/.env` con:
   - `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY` (Dashboard → Project Settings → API)
   - `PUBLIC_API_URL=http://localhost:4000` en desarrollo
   - La URL pública de la API en producción (Vercel)
4. **Google OAuth**: en Supabase Dashboard → Authentication → Providers, habilita
   **Google** y configura el Client ID/Secret de Google Cloud. Agrega a
   *Authentication → URL Configuration → Redirect URLs*:
   - `http://localhost:5173/auth/callback` (desarrollo)
   - `https://<tu-dominio>/auth/callback` (producción)

## Desarrollo local

```bash
npm install
npm run dev:api   # API en http://localhost:4000
npm run dev:web   # Web en http://localhost:5173
```

## Deploy en Vercel (un solo proyecto, Services)

Un único proyecto de Vercel con el repo completo (Root Directory = raíz). El
`vercel.json` de la raíz define dos servicios en el mismo dominio:

| Servicio | Carpeta     | Ruta pública |
|---|---|---|
| api      | `apps/api`  | `/api/*`     |
| web      | `apps/web`  | `/*`         |

Como comparten dominio, la web llama a `/api/...` en el mismo origen: **no definas
`PUBLIC_API_URL` ni `CORS_ORIGIN` en Vercel**. Variables de entorno del proyecto:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET` (API)
- `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` (web)

Prueba local de todo junto: `vercel dev`.

## Seguridad

- Autenticación gestionada por **Supabase Auth** (Google OAuth); el frontend solo
  usa la `anon key` pública. Los usuarios se crean automáticamente en
  `auth.users` al iniciar sesión por primera vez.
- Todo lo sensible va en `.env` (nunca en el código); `.env` está en `.gitignore`.
- La `SUPABASE_SERVICE_ROLE_KEY` solo vive en el backend y nunca se expone al cliente.
- RLS activado en todas las tablas: solo el backend (service role) accede a los datos.
- Endpoints protegidos: el API verifica el access token de Supabase
  (`Authorization: Bearer <token>`) con `supabase.auth.getUser()`.

## Balance de cargas

`GET /api/balance` devuelve `{ ventas, cargas, balance }` donde:
- **ventas**: suma de pedidos no cancelados
- **cargas**: suma de gastos registrados en la tabla `charges`
- **balance**: ventas − cargas
