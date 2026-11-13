import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [sveltekit()],
  // Fuerza a Vite a leer las variables PUBLIC_* desde apps/web/.env,
  // incluso cuando el dev server arranca desde la raiz del monorepo.
  envDir: fileURLToPath(new URL('.', import.meta.url))
});
