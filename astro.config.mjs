import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

const integrations = [];

if (process.env.NODE_ENV !== 'production') {
  const react = (await import('@astrojs/react')).default;
  const markdoc = (await import('@astrojs/markdoc')).default;
  const keystatic = (await import('@keystatic/astro')).default;
  integrations.push(react(), markdoc(), keystatic());
}

integrations.push(preact());

integrations.push(
  sitemap({
    i18n: {
      defaultLocale: 'ca',
      locales: {
        ca: 'ca',
        es: 'es',
      },
    },
  })
);

export default defineConfig({
  adapter: cloudflare(),
  site: 'https://animalsvidadigna.org',
  i18n: {
    defaultLocale: 'ca',
    locales: ['ca', 'es'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations,
  vite: {
    plugins: [tailwindcss()],
  },
});
