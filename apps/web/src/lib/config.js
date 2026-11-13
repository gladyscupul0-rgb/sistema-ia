// Base URL de la API.
// - Produccion (Vercel Services): web y API comparten dominio, asi que se usa
//   una URL relativa ('') y las llamadas van a /api/... en el mismo origen.
// - Desarrollo local: PUBLIC_API_URL=http://localhost:4000 (apps/web/.env);
//   si no esta definida, cae a localhost:4000.
// En Vercel NO definas PUBLIC_API_URL.
import { env } from '$env/dynamic/public';
import { dev } from '$app/environment';

export const API_URL = env.PUBLIC_API_URL ?? (dev ? 'http://localhost:4000' : '');
