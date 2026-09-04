# Repo map and conventions (as of origin/main 56503c0, 2026-09-03)

Paths are relative to the repo root **before** the monorepo move (Phase 1 moves
the site to `apps/web/`; every path below then gains that prefix).

## Toolchain and versions (`package.json`)

- `astro ^5.18.1`, `@astrojs/cloudflare ^12.6.13`, `@astrojs/react ^4.4.2`, `@astrojs/preact ^4.1.3`, `@astrojs/markdoc ^0.15.11`, `@astrojs/sitemap ^3.7.1`, `@keystatic/astro ^5.0.6`, `@keystatic/core ^0.5.48`, `@markdoc/markdoc ^0.5.6`, `preact ^10.29.0`, `react ^19.2.4`, `resend ^6.9.4`, `tailwindcss ^4.2.1`, `typescript ^5.9.3`; dev: `@biomejs/biome ^2.4.7`, `vitest ^4.1.0`, `wrangler ^4.75.0`.
- Scripts: `dev`, `prebuild` (`npx tsx scripts/generate-settings.ts`), `build` (`astro build`), `preview:worker`, `deploy`, `test` (`vitest run`), `sync-images`.
- `pnpm.onlyBuiltDependencies: ["esbuild","sharp","workerd"]`; `pnpm.overrides: {"@preact/preset-vite":"2.9.4"}`.
- No `pnpm-workspace.yaml`, no `turbo.json` on main. The unmerged `design-system` branch adds `pnpm-workspace.yaml` (`packages: ['.', 'packages/*']`) and `packages/design-system` (React 19, Vite lib mode, Storybook 10, Tailwind 4, exports `Badge, Button, Card, Section, Field, Input, CatCard, CatTraits, ContactCta, Hero, StatsSection, Footer, Header`; React is a plain dependency, no peerDependencies; no turbo.json).

## Biome (`biome.json`)

- Filenames: kebab-case, error level (`style.useFilenamingConvention`, `requireAscii`).
- `nursery.useSortedClasses` error on `className` and `clsx/cva/tw/twMerge/cn/twJoin`.
- Formatter: 2 spaces, LF, lineWidth 80, single quotes (JSX double), semicolons always, trailing commas es5, arrowParentheses always.
- `assist.actions.source.organizeImports: on`. `vcs.useIgnoreFile: true`.

## Vitest (`vitest.config.ts`)

```ts
export default defineConfig({
  esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
  test: { include: ['tests/**/*.test.ts'] },
});
```
Tests are flat in `tests/`, kebab-case, one concern per file, relative imports
(`../src/lib/...`), `describe/it/expect`, pure-function testing (route handlers
are not invoked; their logic is extracted). Example header from `tests/adopt-api.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { validateAdoptionForm } from '../src/lib/validation';
describe('Adoption API validation logic', () => {
  it('validates valid adoption submission data', () => { ... });
});
```

## Cloudflare (`wrangler.toml`)

`name = "animals-vida-digna"`, `main = "dist/_worker.js/index.js"`,
`compatibility_date = "2025-08-15"`, `compatibility_flags = ["nodejs_compat"]`,
`workers_dev = false`, `preview_urls = true`, `[assets] binding="ASSETS" directory="./dist"`,
`[observability] enabled=true`, `[[routes]] pattern="animalsvidadigna.org" custom_domain=true`,
`[[ratelimits]] name="FORM_RATE_LIMITER" namespace_id="1001" simple.limit=5 period=60`.

`tests/wrangler-config.test.ts` asserts: `main` path; assets binding; observability on;
**no `unsafe` key; no `r2_buckets` entry** (must be relaxed when R2 is added);
rate-limit binding sanity; every declared binding name is referenced in `src/`;
`checkRateLimit(context)` is called in `contact.ts` and `adopt.ts`.

`tests/worker-bundle-no-keystatic.test.ts` walks the built module graph and asserts
the contact/adopt API routes never import the Keystatic reader or `node:fs`.

## Binding access pattern (`src/lib/rate-limit.ts:43-57`)

```ts
function extractRuntimeEnv(locals: unknown): Record<string, unknown> | undefined {
  if (!locals || typeof locals !== 'object' || !('runtime' in locals)) return undefined;
  const runtime = (locals as { runtime?: unknown }).runtime;
  if (!runtime || typeof runtime !== 'object' || !('env' in runtime)) return undefined;
  const env = (runtime as { env?: unknown }).env;
  return env && typeof env === 'object' ? (env as Record<string, unknown>) : undefined;
}
```
`checkRateLimit` fails open with `console.warn/error`. `src/env.d.ts` is a single
line (`/// <reference types="astro/client" />`) — no `App.Locals` typing yet.

## API response envelope (`src/pages/api/contact.ts`)

Success `200 { "success": true }`; validation `400 { "success": false, "errors": {...} }`;
rate-limited `{ "success": false, "error": "rate_limited" }`; server `500 { "success": false, "error": "server_error" }`.

## i18n

`src/i18n/index.ts`: `type Locale = 'ca' | 'es'`, `locales`, `defaultLocale`,
`t(locale, key)`, `getLocaleFromUrl(url)`, `getAlternateUrl(url, targetLocale)`.
`src/i18n/content.ts`: `getLocalizedField(entry, field, locale)` reads `entry[`${field}_${locale}`]`;
`getLocalizedCat(entry, locale)` returns `{ name, slug, race, shortDescription, description,
specialNeeds, observations, status, age, gender, size, personality, goodWith, healthStatus,
vaccinated, microchipped, sterilized, weight, rescueDate, adoptionDate, featured, order,
coverImage: {src, alt} | null, gallery: {src, alt}[], seo: {title, description} | null }`.

## Cat data consumers (Keystatic reader)

| File | Calls |
|---|---|
| `src/pages/cats/index.astro:16,19` | `reader.collections.cats.list()` / `.read(slug)` |
| `src/pages/es/cats/index.astro:16,19` | same |
| `src/pages/cat/[slug].astro:17,24` | `.list()` in `getStaticPaths`, `.read(slug, { resolveLinkedFiles: true })` |
| `src/pages/es/cat/[slug].astro:17,20,32` | same + slug_es lookup |
| `src/components/landing/FeaturedCatsSection.astro:14` | `reader.collections.cats.all()` |
| `src/pages/index.astro:5`, `es/index.astro:5`, `contact.astro:5`, `es/contact.astro:5` | import `reader` for settings/landing only |

`src/lib/cat-routes.ts`: `generateCatPathsCa(entries)`, `generateCatPathsEs(entries)` (tests in `tests/cats-routes.test.ts`).
`src/lib/cat-filters.ts`: pure filter logic for the Preact `CatFilters.tsx` island (props-driven).
`src/components/cats/`: `CatCard.astro`, `CatFilters.tsx` (preact), `CatGallery.astro` (Tobii lightbox), `CatTraits.astro`.

## Images

`src/lib/image-utils.ts`: `DEFAULT_WIDTHS = [320, 640, 960, 1280]`, `DEFAULT_SIZES`,
`imageUrl(src, width, isDev)` → `/cdn-cgi/image/format=auto,fit=cover,width=W,quality=80/<src>`
(raw path in dev), `generateSrcset(src, widths, isDev)`.
`src/components/OptimizedImage.astro` props: `src, alt, widths?, sizes?, class?, loading?, width?, height?, fetchpriority?`.
Used by: `landing/{ColoniesSection,HeroSection,AboutSection}.astro`, `cats/{CatGallery,CatCard}.astro`,
`pages/cat/[slug].astro:95`, `pages/es/cat/[slug].astro:103`. Tests: `tests/optimized-image.test.ts`.
`public/images/` holds only `hero_image.webp` and `logo.webp`; **no cat images exist in the repo**
(the three sample cats have `coverImage.src: null`, `gallery: []`).
`scripts/sync-images.ts` uploads `public/images/**` to bucket `animals-vida-digna-images` via wrangler (to be deleted).

## Markdoc

`src/lib/markdoc.ts`: `renderMarkdoc(asyncContent)` accepts a Keystatic async content
function or `{ node }` and returns HTML string (`''` on null/error). For D1-stored
Markdoc **source text**, use `@markdoc/markdoc` directly: `Markdoc.transform(Markdoc.parse(src))` → `Markdoc.renderers.html(...)`.

## Settings generation

`scripts/generate-settings.ts` (prebuild) reads the Keystatic settings singleton and writes
`src/generated/settings.ts` (`siteSettings.contactEmail`), imported by `api/contact.ts` and `api/adopt.ts`. Unchanged by this plan.

## SEO

`src/lib/seo.ts`: `buildCanonicalUrl(pathname, site)`, `buildCatSchema({...})`, `buildOrganizationSchema`.
`public/robots.txt` → `Sitemap: https://animalsvidadigna.org/sitemap-index.xml` (generated by `@astrojs/sitemap` from **prerendered** pages only).
Tests: `tests/seo-meta.test.ts`, `tests/json-ld.test.ts`.

## Commit style

`type(scope): imperative summary` — types seen: feat, fix, docs, chore, perf, test; scopes are areas (`keystatic`, `forms`, `deploy`) or plan ids. Use scopes `monorepo`, `db`, `web`, `admin`, `images`, `docs` for this plan.

## GitHub

Ruleset "Main branch protection": PR required, 1 approving review, no bypass actors, block force-push/deletion. `.github/` holds only a stale issue-template config. No workflows.
