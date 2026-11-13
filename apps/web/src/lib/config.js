// Base URL de la API.
// - Produccion (Vercel Services): web y API comparten dominio, asi que se usa
//   una URL relativa ('') y las llamadas van a /api/... en el mismo origen.
// - Desarrollo local: PUBLIC_API_URL=http://localhost:4000 (apps/web/.env);
//   si no esta definida, cae a localhost:4000.
// En Vercel NO definas PUBLIC_API_URL.
export const API_URL =
  import.meta.env.PUBLIC_API_URL ?? (import.meta.env.DEV ? 'http://localhost:4000' : '');
