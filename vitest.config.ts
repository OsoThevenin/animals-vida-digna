import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Match the project's tsconfig.json (`jsxImportSource: "preact"`) so any
  // .tsx island imported by a test compiles against Preact's JSX runtime,
  // the same way Astro's Vite integration compiles it at build time.
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
