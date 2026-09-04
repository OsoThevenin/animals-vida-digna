/**
 * `astro:middleware` is a virtual module Astro's Vite plugin only provides
 * inside an Astro dev/build context — Vitest never loads that plugin, so
 * importing it directly fails with "Cannot find module 'astro:middleware'".
 * `defineMiddleware` itself is just an identity function (see
 * astro/dist/core/middleware/index.js), so this shim reproduces exactly
 * that and is aliased onto the virtual specifier in vitest.config.ts —
 * letting tests import src/middleware.ts unmodified.
 */
export function defineMiddleware<T>(fn: T): T {
  return fn;
}
