import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Match the app's tsconfig (`jsxImportSource: "react"`) so React islands
  // imported by a test compile against the same JSX runtime Astro's Vite
  // integration uses at build time. esbuild's automatic runtime avoids
  // pulling @vitejs/plugin-react in just for tests.
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Vitest never loads Astro's Vite plugin, so the `astro:middleware`
      // virtual module it normally provides does not exist here. See
      // tests/support/astro-middleware-shim.ts.
      'astro:middleware': fileURLToPath(
        new URL('./tests/support/astro-middleware-shim.ts', import.meta.url)
      ),
    },
  },
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
