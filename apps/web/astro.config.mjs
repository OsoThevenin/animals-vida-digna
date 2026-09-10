import cloudflare from '@astrojs/cloudflare';
import markdoc from '@astrojs/markdoc';
import preact from '@astrojs/preact';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

const integrations = [];

// Keystatic ships in every build, production included: the admin UI at
// /keystatic is how shelter volunteers edit content, so it has to exist on the
// deployed Worker. It was previously dev-only, which is why storage was stuck
// in 'local' mode -- see src/lib/keystatic-storage.ts.
//
// react() and markdoc() are Keystatic's own dependencies (its UI is React, its
// rich-text fields are Markdoc); the public site itself renders with preact.
integrations.push(react(), markdoc(), keystatic());

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
  adapter: cloudflare({
    platformProxy: { enabled: true, persist: true },
  }),
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
