import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // Adapter de Vercel: genera la funcion serverless del servicio "web".
    adapter: adapter()
  }
};

export default config;

