import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// platformProxy emulates D1/R2/secrets from wrangler.toml via Miniflare in
// `astro dev`; persist keeps local D1/R2 state under .wrangler/state so a
// signed-in session survives a dev-server restart.
export default defineConfig({
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      persist: true,
    },
  }),
  site: 'https://admin.animalsvidadigna.org',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
