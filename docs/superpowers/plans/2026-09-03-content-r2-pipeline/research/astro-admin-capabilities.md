# Astro 5 capabilities for the admin app (researched 2026-09-03)

**Version pin that matters:** the repo is on `astro ^5.18` + `@astrojs/cloudflare ^12.6`.
In that line the Cloudflare runtime is `context.locals.runtime.{env,cf,caches,ctx}`.
Astro 6 / adapter 13 replaced it with `cloudflare:workers` imports and
`Astro.locals.cfContext` — **do not copy Astro 6 snippets from docs.astro.build**.
https://docs.astro.build/en/guides/integrations-guide/cloudflare/#removed-astrolocalsruntime-api

## 1. Astro Actions (type-safe RPC with zod validation)

Supported on the Cloudflare adapter ("server islands, actions, and sessions").
https://docs.astro.build/en/guides/actions/

```ts
// src/actions/index.ts
import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro/zod';

export const server = {
  uploadImage: defineAction({
    accept: 'form', // multipart/form-data; File fields validate with z.instanceof(File)
    input: z.object({ catId: z.string(), file: z.instanceof(File) }),
    handler: async (input, context) => {
      const env = context.locals.runtime.env; // Cloudflare bindings (adapter v12)
      if (!context.locals.user) {
        throw new ActionError({ code: 'UNAUTHORIZED', message: 'Not signed in.' });
      }
      await env.IMAGES_BUCKET.put(`cats/${input.catId}/x.webp`, input.file.stream(), {
        httpMetadata: { contentType: input.file.type },
      });
      return { ok: true };
    },
  }),
};
```

Calling from a React island:

```ts
import { actions, isInputError } from 'astro:actions';
const { data, error } = await actions.uploadImage(formData);
if (isInputError(error)) { /* error.fields.file, error.fields.catId */ }
else if (error) { /* error.code, error.message */ }
```

- `ActionError` codes include `UNAUTHORIZED`, `FORBIDDEN`, `BAD_REQUEST`, `NOT_FOUND`, `PAYLOAD_TOO_LARGE`.
- `context.locals` is available inside handlers (ActionAPIContext excludes only `props`, `redirect`, `callAction`, `getActionResult`).
- Astro documents no body-size cap for Actions; the Workers platform request body limit applies (100 MB). Keep uploads ≤ 10 MB by resizing client-side.
- After a successful action in an island, navigate with `navigate()` from `astro:transitions/client` — do not `context.rewrite()` after the body was read (`RewriteWithBodyUsed`).

## 2. Per-route SSR in a static-by-default project

Leave `output` unset (static default). Mark dynamic pages/endpoints with
`export const prerender = false;`. Docs: "Start with the default 'static' mode
until you are sure that most or all of your pages will be rendered on demand."
https://docs.astro.build/en/guides/on-demand-rendering/

## 3. React + Preact islands side by side

When two JSX integrations are installed, `include` is **required**:

```js
// astro.config.mjs
preact({ include: ['**/preact/*'] }),
react({ include: ['**/react/*'] }),
```

- A single `.tsx` file cannot import both React and Preact components; only `.astro` templates can nest both.
- `tsconfig.json` `jsxImportSource` targets one framework; files of the other need `/** @jsxImportSource preact */`.
https://docs.astro.build/en/guides/integrations-guide/preact/#combining-multiple-jsx-frameworks

The admin app in this plan is **React-only** (design-system is React), so it does not need `include` filters; the site app stays Preact + React(Keystatic) as today.

## 4. Middleware

```ts
// src/middleware.ts
import { defineMiddleware, sequence } from 'astro:middleware';

const requireSession = defineMiddleware(async (context, next) => {
  if (context.url.pathname.startsWith('/login') || context.url.pathname.startsWith('/api/auth')) {
    return next();
  }
  if (!context.locals.user) return context.redirect('/login');
  return next();
});

export const onRequest = sequence(requireSession);
```

Route matching is manual (`pathname.startsWith`). Type `App.Locals` in `src/env.d.ts`:

```ts
/// <reference types="astro/client" />
type Runtime = import('@astrojs/cloudflare').Runtime<Env>; // Env from `wrangler types`
declare namespace App {
  interface Locals extends Runtime {
    user: { id: string; email: string } | null;
    session: { id: string; expiresAt: Date } | null;
  }
}
```
https://docs.astro.build/en/guides/middleware/

## 5. `platformProxy` — bindings in `astro dev`

```js
adapter: cloudflare({ platformProxy: { enabled: true, persist: true } })
```
`astro dev` then emulates D1/R2/KV/secrets from `wrangler.toml` via Miniflare;
`persist: true` keeps local D1/R2 state under `.wrangler/state`. Apply migrations
locally with `wrangler d1 migrations apply <DB_NAME> --local`, remotely with `--remote`.
(Adapter v12 option; confirmed by the installed adapter's types, not by the Astro 6 docs page.)

## 6. View transitions / `<ClientRouter />`

`import { ClientRouter } from 'astro:transitions'` in `<head>` gives SPA-like
navigation. Islands lose state on navigation unless `transition:persist` is set.
Optional for the admin; not required by any task.
https://docs.astro.build/en/guides/view-transitions/

## 7. Cache API on Workers (why the plan does NOT cache HTML)

- `caches.default.delete(url)` purges only the **local data centre**, not globally.
- A Worker's own response is **not** edge-cached merely because it sets `Cache-Control: s-maxage`; that needs a Cache Rule or the Cache API.
- Therefore cross-Worker invalidation (admin saves → site cache) is unreliable without the zone purge API.
- Decision: render cat pages on demand from D1 on every request (a few ms; well within 10 ms CPU and 100k req/day), and set `Cache-Control: no-store` semantics for HTML. Revisit only if traffic warrants.
https://developers.cloudflare.com/workers/runtime-apis/cache/

## 8. Images on the Cloudflare adapter

Astro's `<Image>`/`getImage()` default to sharp, which cannot run in workerd.
The adapter's `imageService` options: `'cloudflare'` (uses `/cdn-cgi/image/`),
`'cloudflare-binding'` (Images binding — **Paid**, do not use), `'passthrough'`,
`'compile'` (build-time only for prerendered routes). This plan keeps the
existing hand-built `<img srcset>` in `OptimizedImage.astro` and builds
`/cdn-cgi/image/` URLs on the `images.` subdomain itself; `imageService` stays
at the adapter default.

## 9. Client-side resize before upload

Chosen: **`browser-image-compression`** (~20 KB gzipped, actively maintained, Web Worker path):

```ts
import imageCompression from 'browser-image-compression';

const webp = await imageCompression(file, {
  maxWidthOrHeight: 2000,
  fileType: 'image/webp',
  initialQuality: 0.82,
  useWebWorker: true,
});
```
`pica` is lower-level (Lanczos, manual canvas plumbing) — more control, more code; not needed here.
https://www.npmjs.com/package/browser-image-compression

## Gotchas

1. Use adapter-v12 `locals.runtime.env`; ignore Astro-6 `cloudflare:workers` snippets.
2. `cache.delete()` is per-PoP; do not design around it.
3. Never `context.rewrite()` after reading a request body (Actions).
4. Two JSX frameworks in one app need `include` filters; keep the admin React-only.
5. `Env` type comes from `wrangler types` → `worker-configuration.d.ts` (gitignored; generate in `postinstall`/`dev` scripts).
6. Astro server islands have a 1 MB body limit (`security.serverIslandBodySizeLimit`); irrelevant for Actions.
