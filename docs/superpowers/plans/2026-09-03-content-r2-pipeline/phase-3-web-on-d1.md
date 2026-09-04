# Phase 3 — Public site reads D1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/cats`, `/es/cats`, `/cat/[slug]`, `/es/cat/[slug]` render on demand from D1, the home pages' featured cats come from D1 through a server island, every cat image is an R2 URL built by `@avd/content/image-url`, cat pages are listed in a dynamic `sitemap-cats.xml`, the Keystatic `cats` collection and `src/content/cats/` are gone, and Lighthouse mobile stays ≥ 95 on all four categories.

**Architecture:** `apps/web` keeps its existing static/prerendered pages (landing, contact, static pages, Keystatic-backed settings/landing/pages) unchanged, and switches only the cat surfaces — the two listing pages, the two detail pages, the home pages' featured-cats block, and a new sitemap route — to on-demand rendering (`export const prerender = false`) reading `packages/content`'s repository functions through a local `requireDb(locals)` helper. Keystatic keeps serving `settings`, `landing` and `pages`; only the `cats` collection and its filesystem content are removed. Images move from site-relative `public/images/cats/**` paths resolved through `/cdn-cgi/image/` on the site's own origin, to R2 keys resolved through `/cdn-cgi/image/` on `images.animalsvidadigna.org` via `@avd/content/image-url`.

**Tech Stack:** Astro 5.18 + `@astrojs/cloudflare` 12 (`platformProxy` for local D1 in dev), Preact islands, `@avd/content` (Drizzle/D1 repository, localisation, image-URL helpers from Phase 2), `@markdoc/markdoc` (direct `parse`/`transform`/`renderers.html` for D1-stored Markdoc source), Vitest, Biome.

**Spec:** `docs/superpowers/specs/2026-09-03-content-r2-pipeline-design.md` — the *Interface contract* section (Repository API, Localisation, Image URLs, Public site) is binding for this phase.

## Global Constraints

- Free tiers only: Workers Free (3 MB compressed script, 10 ms CPU, 100k req/day), D1 Free (5M reads/100k writes per day, hard-enforced), R2 Free (10 GB), Images Free (5,000 unique transformations/month). Never add the Images binding or the Workers Paid plan.
- `astro ^5.18`, `@astrojs/cloudflare ^12.6` — use `context.locals.runtime.env`; never Astro 6 / adapter 13 APIs.
- `compatibility_flags = ["nodejs_compat"]` on both Workers.
- Biome: kebab-case filenames, single quotes, semicolons, lineWidth 80, sorted Tailwind classes.
- Tests: Vitest, flat `tests/*.test.ts` per app/package, pure-function style; TDD (failing test first) on every task.
- Lighthouse ≥ 95 on all four mobile categories for `/`, `/cats`, `/cat/<slug>` in both locales must still hold after Phase 3.
- Commit style `type(scope): summary` with scopes `monorepo`, `content`, `web`, `admin`, `images`, `docs`.
- No secrets in git. Runtime secrets via `wrangler secret put`; local copies in `.dev.vars` (gitignored).

---

## Assumed starting state (Phases 1–2 already merged)

- The site lives at `apps/web` (all paths below are relative to the repo root and carry that prefix).
- `packages/content` (`@avd/content`) exports, and this phase treats as given:
  - `createDb(d1: D1Database): Db`
  - `listPublishedCats(db: Db): Promise<CatWithImages[]>`
  - `listFeaturedCats(db: Db, limit?: number): Promise<CatWithImages[]>`
  - `getCatBySlug(db: Db, locale: 'ca' | 'es', slug: string): Promise<CatWithImages | null>`
  - `localizeCat(cat: CatWithImages, locale: 'ca' | 'es'): LocalizedCat` from `@avd/content/localize`
  - `imageUrl`, `imageSrcset`, `originalImageUrl`, `DEFAULT_WIDTHS`, `DEFAULT_SIZES`, `DEFAULT_IMAGES_ORIGIN` from `@avd/content/image-url`
  - `CatWithImages` has `slugCa`, `slugEs`, `updatedAt` (ISO string) among its columns; `LocalizedCat` has the shape `getLocalizedCat` returns today (see below) with `coverImage: { key, alt, width, height } | null` and `gallery: { key, alt, width, height }[]`.
- `apps/web/wrangler.toml` has the `DB` binding (D1 database `avd-content`) and D1 is seeded in production.
- `apps/web`'s Keystatic config still serves `settings`, `landing` and `pages` — only the `cats` collection is this phase's concern.

`LocalizedCat` (per the Localisation contract, "the same shape `getLocalizedCat` returns today"):

```ts
interface LocalizedCat {
  name: string;
  slug: string;
  race: string;
  shortDescription: string;
  description: string; // Markdoc source text (D1 stores source, not a resolved node)
  specialNeeds: string;
  observations: string;
  status: string;
  age: number | null;
  gender: string;
  size: string;
  personality: string[];
  goodWith: string[];
  healthStatus: string;
  vaccinated: boolean;
  microchipped: boolean;
  sterilized: boolean;
  weight: number | null;
  rescueDate: string | null;
  adoptionDate: string | null;
  featured: boolean;
  order: number;
  coverImage: { key: string; alt: string; width: number; height: number } | null;
  gallery: { key: string; alt: string; width: number; height: number }[];
  seo: { title: string; description: string } | null;
}
```

## Contract addition this phase relies on

`OptimizedImage.astro` keeps its existing `src` prop (site-relative static asset, used by the landing hero/about/colonies sections and the logo, still going through `/cdn-cgi/image/` on the site's own origin via `src/lib/image-utils.ts`) and adds:

```ts
interface Props {
  src?: string;
  r2Key?: string;
  alt: string;
  widths?: number[];
  sizes?: string;
  class?: string;
  loading?: 'lazy' | 'eager';
  width?: number;
  height?: number;
  fetchpriority?: 'high' | 'low' | 'auto';
}
```

Exactly one of `src` / `r2Key` must be given (the component throws otherwise). When `r2Key` is given, the component resolves URLs through `@avd/content/image-url`'s `imageUrl`/`imageSrcset`, using `import.meta.env.PUBLIC_IMAGES_ORIGIN ?? DEFAULT_IMAGES_ORIGIN` as the origin.

## Known, deliberate limitation carried over unchanged

`LanguageSwitcher.tsx` (rendered inside `Header.astro` on every page) computes the alternate-locale URL generically from the current path via `getAlternateUrl(url, targetLocale)` — a `/es` prefix add/strip — without knowing about per-page slug differences. This was already slightly wrong for cat detail pages before this phase (the CA route used the Keystatic slug, the ES route used `slug_es`, and the header ignores that). This phase does **not** fix `LanguageSwitcher`/`getAlternateUrl` — only the page-level canonical/hreflang `<link>` tags (built explicitly in each `[slug].astro` from `slugCa`/`slugEs`) are made correct. Fixing the header's language switcher for cat pages is out of scope; note it as a known follow-up if asked.

---

### Task 1: Local D1 in dev + `requireDb(locals)` + `App.Locals` typing

Phase 2 (`phase-2-content-package.md` Task 8) already created `apps/web/src/lib/db.ts` and `apps/web/tests/db.test.ts`, with a defensive `getDb(locals: unknown): Db | undefined` (narrows `locals.runtime.env.DB` by hand, the same style as `src/lib/rate-limit.ts`'s `extractRuntimeEnv`, returning `undefined` rather than throwing when the binding is missing). Every page task in this phase (4–7) renders on demand inside a real Cloudflare Worker context, where the `DB` binding is always present — for them, a missing binding is a misconfiguration to fail loudly on, not a value to silently thread through as `undefined`. This task adds a throwing wrapper on top of Phase 2's `getDb`, and leaves `getDb` itself untouched.

**Files:**
- Modify: `apps/web/astro.config.mjs`
- Modify: `apps/web/src/lib/db.ts` (Phase 2 creates this; add `requireDb` alongside the existing `getDb`)
- Modify: `apps/web/src/env.d.ts`
- Modify: `apps/web/tests/db.test.ts` (Phase 2 creates this; append the `requireDb` cases)

**Interfaces:**
- Consumes: `getDb(locals: unknown): Db | undefined` (Phase 2, unchanged), `Db` from `@avd/content/cats`.
- Produces: `requireDb(locals: unknown): Db` — used by every later task in this phase to read D1. Throws `Error('D1 binding "DB" is not available')` when `getDb` returns `undefined`.

- [ ] **Step 1: Write the failing test**

Append to the existing `apps/web/tests/db.test.ts` (Phase 2's five `getDb` cases — undefined locals, no runtime, no env, no DB binding, and the happy path — stay exactly as Phase 2 wrote them; add a new `describe` block below them):

```ts
// apps/web/tests/db.test.ts (append)
import { requireDb } from '../src/lib/db';

describe('requireDb', () => {
  it('returns the Db when the DB binding is present', () => {
    const fakeD1 = {} as unknown;
    const db = requireDb({ runtime: { env: { DB: fakeD1 } } });
    expect(db).toBeDefined();
  });

  it('throws when the DB binding is not available', () => {
    expect(() => requireDb({})).toThrow('D1 binding "DB" is not available');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web exec vitest run tests/db.test.ts`
Expected: FAIL — `requireDb is not a function` / `does not provide an export named 'requireDb'` (Phase 2's five `getDb` tests still pass; only the two new cases fail).

- [ ] **Step 3: Write minimal implementation**

Append to the existing `apps/web/src/lib/db.ts` (Phase 2's `extractRuntimeEnv` and `getDb` stay exactly as Phase 2 wrote them):

```ts
// apps/web/src/lib/db.ts (append, below Phase 2's getDb)

/**
 * Same as getDb, but throws instead of returning undefined. Every on-demand
 * page/island in Phase 3 runs inside a real Cloudflare Worker context where
 * the DB binding is always configured, so a missing binding here means
 * misconfiguration (wrangler.toml, or platformProxy in dev) -- fail loudly
 * rather than let `undefined` propagate into a repository call.
 */
export function requireDb(locals: unknown): Db {
  const db = getDb(locals);
  if (!db) {
    throw new Error('D1 binding "DB" is not available');
  }
  return db;
}
```

Type `App.Locals` so `locals.runtime.env` type-checks at call sites (Task 4 onward pass `Astro.locals` directly). `Env` comes from `wrangler types`, which writes `worker-configuration.d.ts` (gitignored) from `apps/web/wrangler.toml`'s bindings:

```ts
// apps/web/src/env.d.ts
/// <reference types="astro/client" />

type CloudflareRuntime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends CloudflareRuntime {}
}
```

Run once (and any time `wrangler.toml`'s bindings change) to generate `Env`:

```bash
pnpm --filter web exec wrangler types
```

Enable `platformProxy` so `astro dev` emulates the `DB` binding locally via Miniflare, and set up local D1 for development:

```js
// apps/web/astro.config.mjs
export default defineConfig({
  adapter: cloudflare({
    platformProxy: { enabled: true, persist: true },
  }),
  // ...unchanged: site, i18n, integrations, vite
});
```

```bash
pnpm --filter web exec wrangler d1 migrations apply avd-content --local
pnpm --filter @avd/content run seed:generate
wrangler d1 execute avd-content --local --file ../../packages/content/seed.sql
```

`packages/content/seed.sql` is gitignored (Phase 2 Task 9) — a fresh clone has no such file, so `seed:generate` must run first. Expected output of `seed:generate`: `Wrote <absolute-path-to>/packages/content/seed.sql` (Phase 2 Task 7's script logs `` `Wrote ${OUT_FILE}` `` with the resolved absolute path). Run the `wrangler d1 execute` command from `apps/web` too — its `--file` path is relative to the current working directory, hence `../../packages/content/seed.sql`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web exec vitest run tests/db.test.ts`
Expected: PASS (Phase 2's five `getDb` tests plus the two new `requireDb` tests, seven total)

- [ ] **Step 5: Commit**

```bash
git add apps/web/astro.config.mjs apps/web/src/lib/db.ts apps/web/src/env.d.ts apps/web/tests/db.test.ts
git commit -m "feat(web): add requireDb(locals) and local D1 dev setup"
```

---

### Task 2: `renderMarkdocSource` for D1-stored Markdoc source text

**Files:**
- Modify: `apps/web/src/lib/markdoc.ts`
- Test: `apps/web/tests/markdoc.test.ts` (add to the existing file; `renderMarkdoc` and its tests stay untouched — Keystatic's `settings`/`landing`/`pages` singletons still use it)

**Interfaces:**
- Produces: `renderMarkdocSource(src: string): string` — used by Task 5's cat detail pages to render `LocalizedCat.description`.

- [ ] **Step 1: Write the failing test**

Append to `apps/web/tests/markdoc.test.ts` (the file already has `describe('renderMarkdoc', ...)` blocks — leave those exactly as they are and add a new `describe` block below them):

```ts
// apps/web/tests/markdoc.test.ts (append)
import { renderMarkdocSource } from '../src/lib/markdoc';

describe('renderMarkdocSource', () => {
  it('returns empty string for empty input', () => {
    expect(renderMarkdocSource('')).toBe('');
  });

  it('renders a Markdoc source string to HTML', () => {
    const html = renderMarkdocSource('Hello **world**');
    expect(html).toContain('<p>');
    expect(html).toContain('Hello');
    expect(html).toContain('<strong>world</strong>');
  });

  it('renders multiple paragraphs', () => {
    const html = renderMarkdocSource('First paragraph.\n\nSecond paragraph.');
    expect(html).toContain('First paragraph.');
    expect(html).toContain('Second paragraph.');
    expect((html.match(/<p>/g) ?? []).length).toBe(2);
  });

  it('returns empty string on a parse/transform error rather than throwing', () => {
    // Markdoc.parse never throws on arbitrary text, but the function must be
    // defensive the same way renderMarkdoc is — this documents that contract.
    expect(() => renderMarkdocSource('{% unknown-tag %}broken{% /unknown-tag %}')).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web exec vitest run tests/markdoc.test.ts`
Expected: FAIL — `renderMarkdocSource is not a function` / `does not provide an export named 'renderMarkdocSource'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/src/lib/markdoc.ts (append below the existing renderMarkdoc export)

/**
 * Render a raw Markdoc source string (as stored in D1's `description_ca` /
 * `description_es` columns) to an HTML string.
 *
 * Unlike `renderMarkdoc`, this takes plain text directly — no Keystatic
 * async-content wrapper. Returns empty string for empty/falsy input or on
 * any parse/transform error.
 */
export function renderMarkdocSource(src: string): string {
  if (!src) return '';

  try {
    const ast = Markdoc.parse(src);
    const transformed = Markdoc.transform(ast);
    return Markdoc.renderers.html(transformed) || '';
  } catch {
    return '';
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web exec vitest run tests/markdoc.test.ts`
Expected: PASS (all `renderMarkdoc` and `renderMarkdocSource` tests green)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/markdoc.ts apps/web/tests/markdoc.test.ts
git commit -m "feat(web): add renderMarkdocSource for D1-stored Markdoc text"
```

---

### Task 3: `OptimizedImage` gains `r2Key` support

**Files:**
- Create: `apps/web/src/lib/optimized-image-url.ts`
- Modify: `apps/web/src/components/OptimizedImage.astro`
- Test: `apps/web/tests/optimized-image.test.ts` (add to the existing file; existing `imageUrl`/`generateSrcset`/defaults tests stay untouched)

**Interfaces:**
- Consumes: `imageUrl`, `imageSrcset`, `DEFAULT_WIDTHS`, `DEFAULT_SIZES`, `DEFAULT_IMAGES_ORIGIN` from `@avd/content/image-url`; `imageUrl` (renamed on import), `generateSrcset`, `DEFAULT_WIDTHS`, `DEFAULT_SIZES` from `../lib/image-utils` (existing, untouched).
- Produces: `resolveOptimizedImageSource(input): OptimizedImageSource` — pure function backing `OptimizedImage.astro`, so the component's URL-building logic is unit-testable the way the rest of this codebase tests route/component logic (repo convention: extract logic from templates for testability).

The Astro template itself is thin and not unit-tested directly (Astro components aren't invoked by Vitest in this repo); all branching logic lives in the pure function below, which the tests exercise.

- [ ] **Step 1: Write the failing test**

Append to `apps/web/tests/optimized-image.test.ts`:

```ts
// apps/web/tests/optimized-image.test.ts (append)
import { resolveOptimizedImageSource } from '../src/lib/optimized-image-url';

describe('resolveOptimizedImageSource', () => {
  it('throws when neither src nor r2Key is given', () => {
    expect(() =>
      resolveOptimizedImageSource({ isDev: false }),
    ).toThrow('OptimizedImage requires exactly one of "src" or "r2Key"');
  });

  it('throws when both src and r2Key are given', () => {
    expect(() =>
      resolveOptimizedImageSource({
        src: 'images/logo.webp',
        r2Key: 'cats/abc/1.webp',
        isDev: false,
      }),
    ).toThrow('OptimizedImage requires exactly one of "src" or "r2Key"');
  });

  it('resolves a site-relative src through /cdn-cgi/image/ in production mode', () => {
    const result = resolveOptimizedImageSource({
      src: 'images/logo.webp',
      isDev: false,
    });
    expect(result.src).toBe(
      '/cdn-cgi/image/format=auto,fit=cover,width=1280,quality=80/images/logo.webp',
    );
    expect(result.width).toBe(1280);
  });

  it('resolves an r2Key through the images origin', () => {
    const result = resolveOptimizedImageSource({
      r2Key: 'cats/abc123/img1.webp',
      isDev: false,
      imagesOrigin: 'https://images.animalsvidadigna.org',
    });
    expect(result.src).toBe(
      'https://images.animalsvidadigna.org/cdn-cgi/image/width=1280,fit=scale-down,quality=80,format=auto,onerror=redirect/cats/abc123/img1.webp',
    );
    expect(result.width).toBe(1280);
  });

  it('honors an explicit width for r2Key sources', () => {
    const result = resolveOptimizedImageSource({
      r2Key: 'cats/abc123/img1.webp',
      isDev: false,
      width: 960,
      imagesOrigin: 'https://images.animalsvidadigna.org',
    });
    expect(result.src).toBe(
      'https://images.animalsvidadigna.org/cdn-cgi/image/width=960,fit=scale-down,quality=80,format=auto,onerror=redirect/cats/abc123/img1.webp',
    );
    expect(result.width).toBe(960);
  });

  it('builds a full srcset for r2Key sources across the default widths', () => {
    const result = resolveOptimizedImageSource({
      r2Key: 'cats/abc123/img1.webp',
      isDev: false,
      imagesOrigin: 'https://images.animalsvidadigna.org',
    });
    expect(result.srcset).toContain('320w');
    expect(result.srcset).toContain('640w');
    expect(result.srcset).toContain('960w');
    expect(result.srcset).toContain('1280w');
  });

  it('defaults imagesOrigin to DEFAULT_IMAGES_ORIGIN when not given', () => {
    const result = resolveOptimizedImageSource({
      r2Key: 'cats/abc123/img1.webp',
      isDev: false,
    });
    expect(result.src.startsWith('https://images.animalsvidadigna.org/')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web exec vitest run tests/optimized-image.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/optimized-image-url'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/src/lib/optimized-image-url.ts
import {
  DEFAULT_IMAGES_ORIGIN,
  DEFAULT_SIZES as R2_DEFAULT_SIZES,
  DEFAULT_WIDTHS as R2_DEFAULT_WIDTHS,
  imageSrcset as r2ImageSrcset,
  imageUrl as r2ImageUrl,
} from '@avd/content/image-url';
import {
  DEFAULT_SIZES,
  DEFAULT_WIDTHS,
  generateSrcset,
  imageUrl as siteImageUrl,
} from './image-utils';

export interface OptimizedImageInput {
  src?: string;
  r2Key?: string;
  widths?: number[];
  sizes?: string;
  width?: number;
  isDev: boolean;
  imagesOrigin?: string;
}

export interface OptimizedImageSource {
  src: string;
  srcset: string;
  sizes: string;
  width: number;
}

/**
 * Resolve the <img> src/srcset/sizes/width for OptimizedImage.astro.
 * Exactly one of `src` (site-relative static asset) or `r2Key` (R2 object
 * key, resolved through the images origin) must be given.
 */
export function resolveOptimizedImageSource(
  input: OptimizedImageInput,
): OptimizedImageSource {
  const hasSrc = input.src != null;
  const hasR2Key = input.r2Key != null;
  if (hasSrc === hasR2Key) {
    throw new Error('OptimizedImage requires exactly one of "src" or "r2Key"');
  }

  if (hasR2Key) {
    const origin = input.imagesOrigin ?? DEFAULT_IMAGES_ORIGIN;
    const widths = input.widths ?? R2_DEFAULT_WIDTHS;
    const width = input.width ?? widths[widths.length - 1];
    return {
      src: r2ImageUrl(input.r2Key as string, width, origin),
      srcset: r2ImageSrcset(input.r2Key as string, widths, origin),
      sizes: input.sizes ?? R2_DEFAULT_SIZES,
      width,
    };
  }

  const widths = input.widths ?? DEFAULT_WIDTHS;
  const width = input.width ?? widths[widths.length - 1];
  return {
    src: siteImageUrl(input.src as string, width, input.isDev),
    srcset: generateSrcset(input.src as string, widths, input.isDev),
    sizes: input.sizes ?? DEFAULT_SIZES,
    width,
  };
}
```

```astro
---
// apps/web/src/components/OptimizedImage.astro
import { resolveOptimizedImageSource } from '../lib/optimized-image-url';

interface Props {
  src?: string;
  r2Key?: string;
  alt: string;
  widths?: number[];
  sizes?: string;
  class?: string;
  loading?: 'lazy' | 'eager';
  width?: number;
  height?: number;
  fetchpriority?: 'high' | 'low' | 'auto';
}

const {
  src,
  r2Key,
  alt,
  widths,
  sizes,
  class: className,
  loading = 'lazy',
  width,
  height,
  fetchpriority,
} = Astro.props;

const resolved = resolveOptimizedImageSource({
  src,
  r2Key,
  widths,
  sizes,
  width,
  isDev: import.meta.env.DEV,
  imagesOrigin: import.meta.env.PUBLIC_IMAGES_ORIGIN,
});
---

<img
  src={resolved.src}
  srcset={resolved.srcset}
  sizes={resolved.sizes}
  alt={alt}
  class={className}
  loading={loading}
  decoding="async"
  width={resolved.width}
  {...(height ? { height } : {})}
  {...(fetchpriority ? { fetchpriority } : {})}
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web exec vitest run tests/optimized-image.test.ts`
Expected: PASS (existing `imageUrl`/`generateSrcset`/defaults tests and the new `resolveOptimizedImageSource` tests all green)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/optimized-image-url.ts apps/web/src/components/OptimizedImage.astro apps/web/tests/optimized-image.test.ts
git commit -m "feat(web): add r2Key support to OptimizedImage"
```

---

### Task 4: Cats listing pages (`/cats`, `/es/cats`) read D1

**Files:**
- Create: `apps/web/src/lib/cat-card-props.ts`
- Modify: `apps/web/src/lib/cat-filters.ts`
- Modify: `apps/web/src/components/cats/CatCard.astro`
- Modify: `apps/web/src/components/cats/CatFilters.tsx`
- Modify: `apps/web/src/pages/cats/index.astro`
- Modify: `apps/web/src/pages/es/cats/index.astro`
- Test: `apps/web/tests/cat-card-props.test.ts` (new)
- Test: `apps/web/tests/cats-filter.test.ts` (update existing fixtures to the new `CatFilterData` shape)

**Interfaces:**
- Consumes: `requireDb` (Task 1), `listPublishedCats` from `@avd/content`, `localizeCat` from `@avd/content/localize`, `imageUrl`/`imageSrcset`/`DEFAULT_WIDTHS`/`DEFAULT_SIZES`/`DEFAULT_IMAGES_ORIGIN` from `@avd/content/image-url`.
- Produces: `toCatCardProps(cat: LocalizedCat): CatCardData` — reused by Task 5 (detail page back-link is unaffected) and Task 6 (featured cats).
- Produces: `CatCardData` type (in `cat-card-props.ts`) — consumed by `CatCard.astro`.
- Produces: updated `CatFilterData` type (in `cat-filters.ts`, `id` replaces `keystatic_slug`, `coverImage` becomes `{ key, alt, width, height } | null`) — consumed by `CatFilters.tsx` and both listing pages.

### Step 1: Write the failing tests

```ts
// apps/web/tests/cat-card-props.test.ts
import { describe, expect, it } from 'vitest';
import { toCatCardProps } from '../src/lib/cat-card-props';
import type { LocalizedCat } from '@avd/content/localize';

function makeLocalizedCat(overrides: Partial<LocalizedCat> = {}): LocalizedCat {
  return {
    name: 'Luna',
    slug: 'luna',
    race: '',
    shortDescription: 'A sweet cat',
    description: '',
    specialNeeds: '',
    observations: '',
    status: 'available',
    age: 2,
    gender: 'female',
    size: 'medium',
    personality: ['playful'],
    goodWith: [],
    healthStatus: 'healthy',
    vaccinated: true,
    microchipped: true,
    sterilized: true,
    weight: 3.5,
    rescueDate: null,
    adoptionDate: null,
    featured: true,
    order: 0,
    coverImage: { key: 'cats/abc/1.webp', alt: 'Luna smiling', width: 1280, height: 960 },
    gallery: [],
    seo: null,
    ...overrides,
  } as LocalizedCat;
}

describe('toCatCardProps', () => {
  it('maps the fields CatCard needs', () => {
    const cat = makeLocalizedCat();
    expect(toCatCardProps(cat)).toEqual({
      name: 'Luna',
      slug: 'luna',
      shortDescription: 'A sweet cat',
      status: 'available',
      coverImage: { key: 'cats/abc/1.webp', alt: 'Luna smiling', width: 1280, height: 960 },
    });
  });

  it('defaults shortDescription to empty string when falsy', () => {
    const cat = makeLocalizedCat({ shortDescription: '' });
    expect(toCatCardProps(cat).shortDescription).toBe('');
  });

  it('maps null coverImage to null', () => {
    const cat = makeLocalizedCat({ coverImage: null });
    expect(toCatCardProps(cat).coverImage).toBeNull();
  });
});
```

Update `apps/web/tests/cats-filter.test.ts`'s fixture factory and expectations to the new shape (replace the whole file):

```ts
// apps/web/tests/cats-filter.test.ts
import { describe, expect, it } from 'vitest';
import { filterCats, type CatFilterData, type CatFilterState } from '../src/lib/cat-filters';

const makeCat = (overrides: Partial<CatFilterData> = {}): CatFilterData => ({
  id: 'test-cat-id',
  name: 'Test Cat',
  slug: 'test-cat',
  status: 'available',
  age: 3,
  gender: 'female',
  personality: ['playful', 'social'],
  coverImage: { key: 'cats/test-cat-id/1.webp', alt: 'Test', width: 1280, height: 960 },
  shortDescription: 'A test cat',
  featured: false,
  ...overrides,
});

const sampleCats: CatFilterData[] = [
  makeCat({ id: 'luna', name: 'Luna', slug: 'luna', status: 'available', gender: 'female', personality: ['playful', 'affectionate'], featured: true }),
  makeCat({ id: 'michi', name: 'Michi', slug: 'michi', status: 'adopted', gender: 'male', personality: ['calm', 'social'] }),
  makeCat({ id: 'nala', name: 'Nala', slug: 'nala', status: 'available', gender: 'female', personality: ['shy', 'calm'] }),
  makeCat({ id: 'simba', name: 'Simba', slug: 'simba', status: 'treatment', gender: 'male', personality: ['playful', 'curious'] }),
  makeCat({ id: 'cleo', name: 'Cleo', slug: 'cleo', status: 'available', gender: 'male', personality: ['independent'], featured: true }),
];

describe('filterCats', () => {
  it('returns all cats when all filters are "all"', () => {
    const filters: CatFilterState = { status: 'all', gender: 'all', personality: 'all' };
    expect(filterCats(sampleCats, filters)).toHaveLength(5);
  });

  it('filters by status "available"', () => {
    const filters: CatFilterState = { status: 'available', gender: 'all', personality: 'all' };
    const result = filterCats(sampleCats, filters);
    expect(result).toHaveLength(3);
    expect(result.every((c) => c.status === 'available')).toBe(true);
  });

  it('filters by status "adopted"', () => {
    const filters: CatFilterState = { status: 'adopted', gender: 'all', personality: 'all' };
    const result = filterCats(sampleCats, filters);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Michi');
  });

  it('filters by gender "female"', () => {
    const filters: CatFilterState = { status: 'all', gender: 'female', personality: 'all' };
    const result = filterCats(sampleCats, filters);
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.gender === 'female')).toBe(true);
  });

  it('filters by gender "male"', () => {
    const filters: CatFilterState = { status: 'all', gender: 'male', personality: 'all' };
    const result = filterCats(sampleCats, filters);
    expect(result).toHaveLength(3);
  });

  it('filters by personality trait', () => {
    const filters: CatFilterState = { status: 'all', gender: 'all', personality: 'playful' };
    const result = filterCats(sampleCats, filters);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.name).sort()).toEqual(['Luna', 'Simba']);
  });

  it('applies AND logic with multiple filters (status=available AND gender=female)', () => {
    const filters: CatFilterState = { status: 'available', gender: 'female', personality: 'all' };
    const result = filterCats(sampleCats, filters);
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.status === 'available' && c.gender === 'female')).toBe(true);
  });

  it('applies AND logic with all three filters', () => {
    const filters: CatFilterState = { status: 'available', gender: 'female', personality: 'playful' };
    const result = filterCats(sampleCats, filters);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Luna');
  });

  it('returns empty array when no cats match', () => {
    const filters: CatFilterState = { status: 'adopted', gender: 'female', personality: 'all' };
    const result = filterCats(sampleCats, filters);
    expect(result).toHaveLength(0);
  });

  it('featured filter can be applied by pre-filtering the input', () => {
    const featuredCats = sampleCats.filter((c) => c.featured);
    const filters: CatFilterState = { status: 'all', gender: 'all', personality: 'all' };
    const result = filterCats(featuredCats, filters);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.name).sort()).toEqual(['Cleo', 'Luna']);
  });
});
```

### Step 2: Run tests to verify they fail

Run: `pnpm --filter web exec vitest run tests/cat-card-props.test.ts tests/cats-filter.test.ts`
Expected: `cat-card-props.test.ts` FAILs — module not found. `cats-filter.test.ts` FAILs — `CatFilterData` still has `keystatic_slug`/`coverImage: {src,alt}`, so the new fixtures don't type-check / `coverImage.key` is `undefined` in whatever downstream assertion depends on it (the shape mismatch is caught by `filterCats`'s consumers once `CatFilterData` is updated in Step 3, but before that the test file itself still compiles against the old type — run it to confirm today's `keystatic_slug`-based type errors surface as the file no longer matches `CatFilterData`'s current shape).

### Step 3: Write minimal implementation

```ts
// apps/web/src/lib/cat-card-props.ts
import type { LocalizedCat } from '@avd/content/localize';

export interface CatCardData {
  name: string;
  slug: string;
  shortDescription: string;
  status: string;
  coverImage: { key: string; alt: string; width: number; height: number } | null;
}

/** Map a LocalizedCat to the props CatCard.astro needs. */
export function toCatCardProps(cat: LocalizedCat): CatCardData {
  return {
    name: cat.name,
    slug: cat.slug,
    shortDescription: cat.shortDescription ?? '',
    status: cat.status,
    coverImage: cat.coverImage,
  };
}
```

```ts
// apps/web/src/lib/cat-filters.ts
/**
 * Pure filter logic for cat listings.
 * Extracted for testability -- used by CatFilters Preact island.
 */

export interface CatFilterData {
  id: string;
  name: string;
  slug: string;
  status: string;
  age: number | null;
  gender: string;
  personality: string[];
  coverImage: { key: string; alt: string; width: number; height: number } | null;
  shortDescription: string;
  featured: boolean;
}

export interface CatFilterState {
  status: string;
  gender: string;
  personality: string;
}

/**
 * Filter cats based on current filter selections.
 * Each filter set to 'all' is ignored.
 * Multiple active filters use AND logic.
 */
export function filterCats(
  cats: CatFilterData[],
  filters: CatFilterState,
): CatFilterData[] {
  return cats.filter((cat) => {
    if (filters.status !== 'all' && cat.status !== filters.status) return false;
    if (filters.gender !== 'all' && cat.gender !== filters.gender) return false;
    if (
      filters.personality !== 'all' &&
      !cat.personality.includes(filters.personality)
    )
      return false;
    return true;
  });
}
```

```astro
---
// apps/web/src/components/cats/CatCard.astro
import type { Locale } from '../../i18n/index';
import { t } from '../../i18n/index';
import OptimizedImage from '../OptimizedImage.astro';
import type { CatCardData } from '../../lib/cat-card-props';

interface Props {
  cat: CatCardData;
  locale: Locale;
}

const { cat, locale } = Astro.props;

const catHref = locale === 'ca' ? `/cat/${cat.slug}` : `/es/cat/${cat.slug}`;

const statusKey = `cat.status.${cat.status}` as const;
const statusLabel = t(locale, statusKey as any);

const statusColors: Record<string, string> = {
  available: 'bg-green-100 text-green-800',
  adopted: 'bg-blue-100 text-blue-800',
  treatment: 'bg-amber-100 text-amber-800',
  unavailable: 'bg-gray-100 text-gray-600',
};
const statusColor = statusColors[cat.status] ?? 'bg-gray-100 text-gray-600';
---

<a
  href={catHref}
  class="group block overflow-hidden rounded-xl bg-surface shadow-sm transition-shadow hover:shadow-md"
>
  {cat.coverImage ? (
    <div class="aspect-[4/3] overflow-hidden">
      <OptimizedImage
        r2Key={cat.coverImage.key}
        alt={cat.coverImage.alt || cat.name}
        width={cat.coverImage.width}
        height={cat.coverImage.height}
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
        sizes="(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw"
      />
    </div>
  ) : (
    <div class="flex aspect-[4/3] items-center justify-center bg-primary/5">
      <svg class="h-16 w-16 text-primary/20" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    </div>
  )}
  <div class="p-4">
    <div class="mb-2 flex items-center justify-between gap-2">
      <h3 class="font-display text-lg font-bold text-primary">
        {cat.name}
      </h3>
      <span class={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
        {statusLabel}
      </span>
    </div>
    {cat.shortDescription && (
      <p class="line-clamp-2 text-sm text-text-muted">
        {cat.shortDescription}
      </p>
    )}
  </div>
</a>
```

```tsx
// apps/web/src/components/cats/CatFilters.tsx
import { useState } from 'preact/hooks';
import { filterCats, type CatFilterData } from '../../lib/cat-filters';
import {
  imageUrl,
  imageSrcset,
  DEFAULT_WIDTHS,
  DEFAULT_SIZES,
  DEFAULT_IMAGES_ORIGIN,
} from '@avd/content/image-url';

interface Translations {
  filterStatus: string;
  filterGender: string;
  filterPersonality: string;
  filterAll: string;
  showing: string;
  noResults: string;
  statusAvailable: string;
  statusAdopted: string;
  statusTreatment: string;
  statusUnavailable: string;
  genderMale: string;
  genderFemale: string;
  personalityPlayful: string;
  personalityCalm: string;
  personalityShy: string;
  personalityAffectionate: string;
  personalityIndependent: string;
  personalitySocial: string;
  personalityCurious: string;
  personalityProtective: string;
  catsLabel: string;
}

interface Props {
  cats: CatFilterData[];
  locale: 'ca' | 'es';
  translations: Translations;
}

const statusColors: Record<string, string> = {
  available: 'bg-green-100 text-green-800',
  adopted: 'bg-blue-100 text-blue-800',
  treatment: 'bg-amber-100 text-amber-800',
  unavailable: 'bg-gray-100 text-gray-600',
};

const IMAGES_ORIGIN = import.meta.env.PUBLIC_IMAGES_ORIGIN ?? DEFAULT_IMAGES_ORIGIN;

export default function CatFilters({ cats, locale, translations: t }: Props) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [personalityFilter, setPersonalityFilter] = useState('all');

  const filtered = filterCats(cats, {
    status: statusFilter,
    gender: genderFilter,
    personality: personalityFilter,
  });

  const detailBase = locale === 'ca' ? '/cat/' : '/es/cat/';

  return (
    <div>
      {/* Filter controls */}
      <div class="mb-8 flex flex-wrap gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-muted" htmlFor="status-filter">
            {t.filterStatus}
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target as HTMLSelectElement).value)}
            class="rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          >
            <option value="all">{t.filterAll}</option>
            <option value="available">{t.statusAvailable}</option>
            <option value="adopted">{t.statusAdopted}</option>
            <option value="treatment">{t.statusTreatment}</option>
            <option value="unavailable">{t.statusUnavailable}</option>
          </select>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-muted" htmlFor="gender-filter">
            {t.filterGender}
          </label>
          <select
            id="gender-filter"
            value={genderFilter}
            onChange={(e) => setGenderFilter((e.target as HTMLSelectElement).value)}
            class="rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          >
            <option value="all">{t.filterAll}</option>
            <option value="male">{t.genderMale}</option>
            <option value="female">{t.genderFemale}</option>
          </select>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-muted" htmlFor="personality-filter">
            {t.filterPersonality}
          </label>
          <select
            id="personality-filter"
            value={personalityFilter}
            onChange={(e) => setPersonalityFilter((e.target as HTMLSelectElement).value)}
            class="rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          >
            <option value="all">{t.filterAll}</option>
            <option value="playful">{t.personalityPlayful}</option>
            <option value="calm">{t.personalityCalm}</option>
            <option value="shy">{t.personalityShy}</option>
            <option value="affectionate">{t.personalityAffectionate}</option>
            <option value="independent">{t.personalityIndependent}</option>
            <option value="social">{t.personalitySocial}</option>
            <option value="curious">{t.personalityCurious}</option>
            <option value="protective">{t.personalityProtective}</option>
          </select>
        </div>
      </div>

      {/* Result count */}
      <p class="mb-4 text-sm text-text-muted">
        {t.showing} {filtered.length} {t.catsLabel}
      </p>

      {/* Filtered cat grid */}
      {filtered.length === 0 ? (
        <p class="py-12 text-center text-text-muted">{t.noResults}</p>
      ) : (
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cat) => (
            <a
              key={cat.id}
              href={`${detailBase}${cat.slug}`}
              class="group block overflow-hidden rounded-xl bg-surface shadow-sm transition-shadow hover:shadow-md"
            >
              {cat.coverImage ? (
                <div class="aspect-[4/3] overflow-hidden">
                  <img
                    src={imageUrl(cat.coverImage.key, DEFAULT_WIDTHS[DEFAULT_WIDTHS.length - 1], IMAGES_ORIGIN)}
                    srcset={imageSrcset(cat.coverImage.key, DEFAULT_WIDTHS, IMAGES_ORIGIN)}
                    sizes={DEFAULT_SIZES}
                    alt={cat.coverImage.alt || cat.name}
                    class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                    width={cat.coverImage.width}
                    height={cat.coverImage.height}
                  />
                </div>
              ) : (
                <div class="flex aspect-[4/3] items-center justify-center bg-primary/5">
                  <svg class="h-16 w-16 text-primary/20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
              )}
              <div class="p-4">
                <div class="mb-2 flex items-center justify-between gap-2">
                  <h3 class="font-display text-lg font-bold text-primary">
                    {cat.name}
                  </h3>
                  <span
                    class={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[cat.status] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {cat.status === 'available'
                      ? t.statusAvailable
                      : cat.status === 'adopted'
                        ? t.statusAdopted
                        : cat.status === 'treatment'
                          ? t.statusTreatment
                          : t.statusUnavailable}
                  </span>
                </div>
                {cat.shortDescription && (
                  <p class="line-clamp-2 text-sm text-text-muted">
                    {cat.shortDescription}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
```

```astro
---
// apps/web/src/pages/cats/index.astro
import BaseLayout from '../../layouts/BaseLayout.astro';
import CatCard from '../../components/cats/CatCard.astro';
import CatFilters from '../../components/cats/CatFilters.tsx';
import { buildCanonicalUrl } from '../../lib/seo';
import { reader } from '../../lib/keystatic';
import { requireDb } from '../../lib/db';
import { listPublishedCats } from '@avd/content';
import { localizeCat } from '@avd/content/localize';
import { toCatCardProps } from '../../lib/cat-card-props';
import { t, getAlternateUrl } from '../../i18n/index';
import type { CatFilterData } from '../../lib/cat-filters';

export const prerender = false;

const locale = 'ca' as const;

const settings = await reader.singletons.settings.read();
const donateUrl = settings?.donateUrl ?? '#';

const db = requireDb(Astro.locals);
const rows = await listPublishedCats(db);

const localizedCats = rows
  .map((row) => ({ ...localizeCat(row, locale), id: row.id }))
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

// Serializable data for Preact island (no functions)
const filterData: CatFilterData[] = localizedCats.map((cat) => ({
  id: cat.id,
  name: cat.name,
  slug: cat.slug,
  status: cat.status,
  age: cat.age,
  gender: cat.gender,
  personality: cat.personality ?? [],
  coverImage: cat.coverImage,
  shortDescription: cat.shortDescription ?? '',
  featured: cat.featured ?? false,
}));

// Translation strings for the Preact island
const translations = {
  filterStatus: t(locale, 'cats.filterStatus'),
  filterGender: t(locale, 'cats.filterGender'),
  filterPersonality: t(locale, 'cats.filterPersonality'),
  filterAll: t(locale, 'cats.filterAll'),
  showing: t(locale, 'cats.showing'),
  noResults: t(locale, 'cats.noResults'),
  statusAvailable: t(locale, 'cat.status.available'),
  statusAdopted: t(locale, 'cat.status.adopted'),
  statusTreatment: t(locale, 'cat.status.treatment'),
  statusUnavailable: t(locale, 'cat.status.unavailable'),
  genderMale: t(locale, 'cat.male'),
  genderFemale: t(locale, 'cat.female'),
  personalityPlayful: t(locale, 'cat.personality.playful'),
  personalityCalm: t(locale, 'cat.personality.calm'),
  personalityShy: t(locale, 'cat.personality.shy'),
  personalityAffectionate: t(locale, 'cat.personality.affectionate'),
  personalityIndependent: t(locale, 'cat.personality.independent'),
  personalitySocial: t(locale, 'cat.personality.social'),
  personalityCurious: t(locale, 'cat.personality.curious'),
  personalityProtective: t(locale, 'cat.personality.protective'),
  catsLabel: t(locale, 'cats.title'),
};

const site = Astro.site?.href?.replace(/\/$/, '') || 'https://animalsvidadigna.org';
const canonicalUrl = buildCanonicalUrl(Astro.url.pathname, site);
const alternateUrl = buildCanonicalUrl(getAlternateUrl(Astro.url, 'es'), site);
---

<BaseLayout title={t(locale, 'cats.title')} description={t(locale, 'cats.subtitle')} donateUrl={donateUrl} canonicalUrl={canonicalUrl} alternateUrl={alternateUrl}>
  <section class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
    <h1 class="mb-2 font-display text-3xl font-bold text-primary md:text-4xl">
      {t(locale, 'cats.title')}
    </h1>
    <p class="mb-8 text-text-muted">
      {t(locale, 'cats.subtitle')}
    </p>

    {/* Interactive filter island (takes over rendering when JS available) */}
    <CatFilters client:load cats={filterData} locale={locale} translations={translations} />

    {/* SSR fallback for SEO crawlers -- hidden when JS renders the island */}
    <noscript>
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {localizedCats.map((cat) => (
          <CatCard cat={toCatCardProps(cat)} locale={locale} />
        ))}
      </div>
    </noscript>
  </section>
</BaseLayout>
```

```astro
---
// apps/web/src/pages/es/cats/index.astro
import BaseLayout from '../../../layouts/BaseLayout.astro';
import CatCard from '../../../components/cats/CatCard.astro';
import CatFilters from '../../../components/cats/CatFilters.tsx';
import { buildCanonicalUrl } from '../../../lib/seo';
import { reader } from '../../../lib/keystatic';
import { requireDb } from '../../../lib/db';
import { listPublishedCats } from '@avd/content';
import { localizeCat } from '@avd/content/localize';
import { toCatCardProps } from '../../../lib/cat-card-props';
import { t, getAlternateUrl } from '../../../i18n/index';
import type { CatFilterData } from '../../../lib/cat-filters';

export const prerender = false;

const locale = 'es' as const;

const settings = await reader.singletons.settings.read();
const donateUrl = settings?.donateUrl ?? '#';

const db = requireDb(Astro.locals);
const rows = await listPublishedCats(db);

const localizedCats = rows
  .map((row) => ({ ...localizeCat(row, locale), id: row.id }))
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

const filterData: CatFilterData[] = localizedCats.map((cat) => ({
  id: cat.id,
  name: cat.name,
  slug: cat.slug,
  status: cat.status,
  age: cat.age,
  gender: cat.gender,
  personality: cat.personality ?? [],
  coverImage: cat.coverImage,
  shortDescription: cat.shortDescription ?? '',
  featured: cat.featured ?? false,
}));

const translations = {
  filterStatus: t(locale, 'cats.filterStatus'),
  filterGender: t(locale, 'cats.filterGender'),
  filterPersonality: t(locale, 'cats.filterPersonality'),
  filterAll: t(locale, 'cats.filterAll'),
  showing: t(locale, 'cats.showing'),
  noResults: t(locale, 'cats.noResults'),
  statusAvailable: t(locale, 'cat.status.available'),
  statusAdopted: t(locale, 'cat.status.adopted'),
  statusTreatment: t(locale, 'cat.status.treatment'),
  statusUnavailable: t(locale, 'cat.status.unavailable'),
  genderMale: t(locale, 'cat.male'),
  genderFemale: t(locale, 'cat.female'),
  personalityPlayful: t(locale, 'cat.personality.playful'),
  personalityCalm: t(locale, 'cat.personality.calm'),
  personalityShy: t(locale, 'cat.personality.shy'),
  personalityAffectionate: t(locale, 'cat.personality.affectionate'),
  personalityIndependent: t(locale, 'cat.personality.independent'),
  personalitySocial: t(locale, 'cat.personality.social'),
  personalityCurious: t(locale, 'cat.personality.curious'),
  personalityProtective: t(locale, 'cat.personality.protective'),
  catsLabel: t(locale, 'cats.title'),
};

const site = Astro.site?.href?.replace(/\/$/, '') || 'https://animalsvidadigna.org';
const canonicalUrl = buildCanonicalUrl(Astro.url.pathname, site);
const alternateUrl = buildCanonicalUrl(getAlternateUrl(Astro.url, 'ca'), site);
---

<BaseLayout title={t(locale, 'cats.title')} description={t(locale, 'cats.subtitle')} donateUrl={donateUrl} canonicalUrl={canonicalUrl} alternateUrl={alternateUrl}>
  <section class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
    <h1 class="mb-2 font-display text-3xl font-bold text-primary md:text-4xl">
      {t(locale, 'cats.title')}
    </h1>
    <p class="mb-8 text-text-muted">
      {t(locale, 'cats.subtitle')}
    </p>

    <CatFilters client:load cats={filterData} locale={locale} translations={translations} />

    <noscript>
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {localizedCats.map((cat) => (
          <CatCard cat={toCatCardProps(cat)} locale={locale} />
        ))}
      </div>
    </noscript>
  </section>
</BaseLayout>
```

### Step 4: Run tests to verify they pass

Run: `pnpm --filter web exec vitest run tests/cat-card-props.test.ts tests/cats-filter.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add apps/web/src/lib/cat-card-props.ts apps/web/src/lib/cat-filters.ts \
  apps/web/src/components/cats/CatCard.astro apps/web/src/components/cats/CatFilters.tsx \
  apps/web/src/pages/cats/index.astro apps/web/src/pages/es/cats/index.astro \
  apps/web/tests/cat-card-props.test.ts apps/web/tests/cats-filter.test.ts
git commit -m "feat(web): cats listing pages read from D1"
```

---

### Task 5: Cat detail pages (`/cat/[slug]`, `/es/cat/[slug]`) read D1

**Files:**
- Modify: `apps/web/src/components/cats/CatGallery.astro`
- Modify: `apps/web/src/pages/cat/[slug].astro`
- Modify: `apps/web/src/pages/es/cat/[slug].astro`

`CatTraits.astro` is unchanged — its `LocalizedCat`-shaped `cat` prop already matches what `localizeCat` returns.

**Interfaces:**
- Consumes: `requireDb` (Task 1), `getCatBySlug` from `@avd/content`, `localizeCat` from `@avd/content/localize`, `renderMarkdocSource` (Task 2), `imageUrl`/`DEFAULT_IMAGES_ORIGIN`/`originalImageUrl` from `@avd/content/image-url`, `OptimizedImage` `r2Key` support (Task 3).

There is no new pure logic to unit-test in this task — `getCatBySlug`, `localizeCat` and `renderMarkdocSource` are already tested (by Phase 2 and Task 2 respectively); this task is wiring. Verification is the build + curl/Lighthouse pass in Task 10. Because there is no isolated RED step, write the pages directly and confirm with `pnpm --filter web exec tsc --noEmit` that they type-check against the Task 1–3 contracts before moving on.

- [ ] **Step 1: Update `CatGallery.astro` to the R2-key gallery shape**

```astro
---
// apps/web/src/components/cats/CatGallery.astro
import OptimizedImage from '../OptimizedImage.astro';
import { originalImageUrl, DEFAULT_IMAGES_ORIGIN } from '@avd/content/image-url';

interface GalleryImage {
  key: string;
  alt: string;
  width: number;
  height: number;
}

interface Props {
  images: GalleryImage[];
  catName: string;
}

const { images, catName } = Astro.props;
const imagesOrigin = import.meta.env.PUBLIC_IMAGES_ORIGIN ?? DEFAULT_IMAGES_ORIGIN;
---

{images.length > 0 && (
  <div class="mt-8">
    <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
      {images.map((img, i) => (
        <a
          href={originalImageUrl(img.key, imagesOrigin)}
          class="lightbox group overflow-hidden rounded-lg"
          data-group="cat-gallery"
        >
          <OptimizedImage
            r2Key={img.key}
            alt={img.alt || `${catName} - ${i + 1}`}
            width={img.width}
            height={img.height}
            loading="lazy"
            class="aspect-square h-full w-full rounded-lg object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </a>
      ))}
    </div>
  </div>
)}

<style>
  @media (prefers-reduced-motion: reduce) {
    .lightbox img {
      transition: none !important;
    }
  }
</style>

<script>
  async function initLightbox() {
    const lightboxLinks = document.querySelectorAll('.lightbox');
    if (lightboxLinks.length > 0) {
      const [{ default: Tobii }, _css] = await Promise.all([
        import('@midzer/tobii'),
        import('@midzer/tobii/dist/tobii.min.css'),
      ]);
      new Tobii({ captions: true, zoom: false });
    }
  }

  // Initialize on first load
  initLightbox();

  // Also handle Astro SPA page-load events
  document.addEventListener('astro:page-load', () => {
    initLightbox();
  });
</script>
```

- [ ] **Step 2: Rewrite the Catalan detail page**

```astro
---
// apps/web/src/pages/cat/[slug].astro
import BaseLayout from '../../layouts/BaseLayout.astro';
import CatTraits from '../../components/cats/CatTraits.astro';
import CatGallery from '../../components/cats/CatGallery.astro';
import AdoptionForm from '../../components/forms/AdoptionForm.tsx';
import { buildCanonicalUrl, buildCatSchema } from '../../lib/seo';
import { reader } from '../../lib/keystatic';
import { requireDb } from '../../lib/db';
import { getCatBySlug } from '@avd/content';
import { localizeCat } from '@avd/content/localize';
import { imageUrl, DEFAULT_IMAGES_ORIGIN } from '@avd/content/image-url';
import { t } from '../../i18n/index';
import { renderMarkdocSource } from '../../lib/markdoc';
import OptimizedImage from '../../components/OptimizedImage.astro';

export const prerender = false;

const locale = 'ca' as const;

const slug = Astro.params.slug as string;

const db = requireDb(Astro.locals);
const catRow = await getCatBySlug(db, locale, slug);

if (!catRow) {
  return Astro.redirect('/cats');
}

const cat = localizeCat(catRow, locale);

const descriptionHtml = renderMarkdocSource(cat.description ?? '');

const settings = await reader.singletons.settings.read();
const donateUrl = settings?.donateUrl ?? '#';

const seoTitle = cat.seo?.title || cat.name;
const seoDescription = cat.seo?.description || cat.shortDescription || '';

const site = Astro.site?.href?.replace(/\/$/, '') || 'https://animalsvidadigna.org';
const canonicalUrl = buildCanonicalUrl(Astro.url.pathname, site);
// Alternate locale slug comes from the D1 row -- ca and es slugs can differ,
// unlike the generic path-prefix swap getAlternateUrl() does (used only by
// LanguageSwitcher, see "Known, deliberate limitation" above).
const alternateUrl = buildCanonicalUrl(`/es/cat/${catRow.slugEs}`, site);

const imagesOrigin = import.meta.env.PUBLIC_IMAGES_ORIGIN ?? DEFAULT_IMAGES_ORIGIN;
const catJsonLd = buildCatSchema({
  name: cat.name,
  description: seoDescription,
  image: cat.coverImage ? imageUrl(cat.coverImage.key, 1200, imagesOrigin) : '',
  url: canonicalUrl,
  inLanguage: locale,
});

const adoptionFormTranslations = {
  name: t(locale, 'form.name'),
  email: t(locale, 'form.email'),
  phone: t(locale, 'form.phone'),
  livingSituation: t(locale, 'form.livingSituation'),
  message: t(locale, 'form.message'),
  submit: t(locale, 'form.submit'),
  sending: t(locale, 'form.sending'),
  successAdoption: t(locale, 'form.success.adoption'),
  errorRequired: t(locale, 'form.error.required'),
  errorInvalidEmail: t(locale, 'form.error.invalidEmail'),
  errorServer: t(locale, 'form.error.server'),
  errorRateLimited: t(locale, 'form.error.rateLimited'),
  livingSituationFlat: t(locale, 'form.livingSituation.flat'),
  livingSituationHouse: t(locale, 'form.livingSituation.house'),
  livingSituationHouseGarden: t(locale, 'form.livingSituation.houseGarden'),
  livingSituationRural: t(locale, 'form.livingSituation.rural'),
  livingSituationOther: t(locale, 'form.livingSituation.other'),
};
---

<BaseLayout title={seoTitle} description={seoDescription} donateUrl={donateUrl} canonicalUrl={canonicalUrl} alternateUrl={alternateUrl} jsonLd={catJsonLd}>
  <article class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    {/* Back link */}
    <a href="/cats" class="mb-6 inline-flex items-center gap-1 text-sm text-primary hover:text-primary-dark">
      &larr; {t(locale, 'cat.backToList')}
    </a>

    {/* Cover image */}
    {cat.coverImage && (
      <div class="mb-8 overflow-hidden rounded-2xl">
        <OptimizedImage
          r2Key={cat.coverImage.key}
          alt={cat.coverImage.alt || cat.name}
          width={cat.coverImage.width}
          height={cat.coverImage.height}
          class="h-64 w-full object-cover sm:h-80 lg:h-96"
          loading="eager"
          sizes="100vw"
        />
      </div>
    )}

    {/* Title */}
    <h1 class="mb-6 font-display text-3xl font-bold text-primary md:text-4xl">
      {cat.name}
    </h1>

    {/* Two-column layout: traits sidebar + description */}
    <div class="grid gap-8 lg:grid-cols-3">
      {/* Sidebar: traits */}
      <aside class="lg:col-span-1">
        <CatTraits cat={cat} locale={locale} />
      </aside>

      {/* Main content: description */}
      <div class="lg:col-span-2">
        {descriptionHtml && (
          <div class="prose prose-lg max-w-none text-text" set:html={descriptionHtml} />
        )}

        {cat.observations && (
          <div class="mt-6 rounded-lg bg-primary/5 p-4">
            <p class="text-sm text-text-muted">{cat.observations}</p>
          </div>
        )}
      </div>
    </div>

    {/* Adoption form / status message */}
    <section class="mt-12">
      {cat.status === 'available' ? (
        <div class="mx-auto max-w-2xl">
          <h2 class="mb-6 font-display text-2xl font-bold text-primary">
            {t(locale, 'cat.adoptionInquiry')}
          </h2>
          <AdoptionForm client:load locale={locale} translations={adoptionFormTranslations} catName={cat.name} />
        </div>
      ) : cat.status === 'adopted' ? (
        <div class="mx-auto max-w-2xl rounded-xl bg-primary/5 p-6 text-center">
          <p class="text-lg font-medium text-primary">{t(locale, 'cat.status.adopted.message')}</p>
        </div>
      ) : cat.status === 'treatment' ? (
        <div class="mx-auto max-w-2xl rounded-xl bg-amber-50 p-6 text-center">
          <p class="text-lg font-medium text-amber-800">{t(locale, 'cat.status.treatment.message')}</p>
        </div>
      ) : (
        <div class="mx-auto max-w-2xl rounded-xl bg-gray-50 p-6 text-center">
          <p class="text-lg font-medium text-gray-600">{t(locale, 'cat.status.unavailable.message')}</p>
        </div>
      )}
    </section>

    {/* Gallery */}
    {cat.gallery?.length > 0 && (
      <section class="mt-12">
        <h2 class="mb-4 font-display text-2xl font-bold text-primary">
          {t(locale, 'cat.gallery')}
        </h2>
        <CatGallery images={cat.gallery} catName={cat.name} />
      </section>
    )}
  </article>
</BaseLayout>
```

- [ ] **Step 3: Rewrite the Spanish detail page (mirror, `es` locale, alternate points back to `slugCa`)**

```astro
---
// apps/web/src/pages/es/cat/[slug].astro
import BaseLayout from '../../../layouts/BaseLayout.astro';
import CatTraits from '../../../components/cats/CatTraits.astro';
import CatGallery from '../../../components/cats/CatGallery.astro';
import AdoptionForm from '../../../components/forms/AdoptionForm.tsx';
import { buildCanonicalUrl, buildCatSchema } from '../../../lib/seo';
import { reader } from '../../../lib/keystatic';
import { requireDb } from '../../../lib/db';
import { getCatBySlug } from '@avd/content';
import { localizeCat } from '@avd/content/localize';
import { imageUrl, DEFAULT_IMAGES_ORIGIN } from '@avd/content/image-url';
import { t } from '../../../i18n/index';
import { renderMarkdocSource } from '../../../lib/markdoc';
import OptimizedImage from '../../../components/OptimizedImage.astro';

export const prerender = false;

const locale = 'es' as const;

const slug = Astro.params.slug as string;

const db = requireDb(Astro.locals);
const catRow = await getCatBySlug(db, locale, slug);

if (!catRow) {
  return Astro.redirect('/es/cats');
}

const cat = localizeCat(catRow, locale);

const descriptionHtml = renderMarkdocSource(cat.description ?? '');

const settings = await reader.singletons.settings.read();
const donateUrl = settings?.donateUrl ?? '#';

const seoTitle = cat.seo?.title || cat.name;
const seoDescription = cat.seo?.description || cat.shortDescription || '';

const site = Astro.site?.href?.replace(/\/$/, '') || 'https://animalsvidadigna.org';
const canonicalUrl = buildCanonicalUrl(Astro.url.pathname, site);
const alternateUrl = buildCanonicalUrl(`/cat/${catRow.slugCa}`, site);

const imagesOrigin = import.meta.env.PUBLIC_IMAGES_ORIGIN ?? DEFAULT_IMAGES_ORIGIN;
const catJsonLd = buildCatSchema({
  name: cat.name,
  description: seoDescription,
  image: cat.coverImage ? imageUrl(cat.coverImage.key, 1200, imagesOrigin) : '',
  url: canonicalUrl,
  inLanguage: locale,
});

const adoptionFormTranslations = {
  name: t(locale, 'form.name'),
  email: t(locale, 'form.email'),
  phone: t(locale, 'form.phone'),
  livingSituation: t(locale, 'form.livingSituation'),
  message: t(locale, 'form.message'),
  submit: t(locale, 'form.submit'),
  sending: t(locale, 'form.sending'),
  successAdoption: t(locale, 'form.success.adoption'),
  errorRequired: t(locale, 'form.error.required'),
  errorInvalidEmail: t(locale, 'form.error.invalidEmail'),
  errorServer: t(locale, 'form.error.server'),
  errorRateLimited: t(locale, 'form.error.rateLimited'),
  livingSituationFlat: t(locale, 'form.livingSituation.flat'),
  livingSituationHouse: t(locale, 'form.livingSituation.house'),
  livingSituationHouseGarden: t(locale, 'form.livingSituation.houseGarden'),
  livingSituationRural: t(locale, 'form.livingSituation.rural'),
  livingSituationOther: t(locale, 'form.livingSituation.other'),
};
---

<BaseLayout title={seoTitle} description={seoDescription} donateUrl={donateUrl} canonicalUrl={canonicalUrl} alternateUrl={alternateUrl} jsonLd={catJsonLd}>
  <article class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    {/* Back link */}
    <a href="/es/cats" class="mb-6 inline-flex items-center gap-1 text-sm text-primary hover:text-primary-dark">
      &larr; {t(locale, 'cat.backToList')}
    </a>

    {/* Cover image */}
    {cat.coverImage && (
      <div class="mb-8 overflow-hidden rounded-2xl">
        <OptimizedImage
          r2Key={cat.coverImage.key}
          alt={cat.coverImage.alt || cat.name}
          width={cat.coverImage.width}
          height={cat.coverImage.height}
          class="h-64 w-full object-cover sm:h-80 lg:h-96"
          loading="eager"
          sizes="100vw"
        />
      </div>
    )}

    {/* Title */}
    <h1 class="mb-6 font-display text-3xl font-bold text-primary md:text-4xl">
      {cat.name}
    </h1>

    {/* Two-column layout: traits sidebar + description */}
    <div class="grid gap-8 lg:grid-cols-3">
      {/* Sidebar: traits */}
      <aside class="lg:col-span-1">
        <CatTraits cat={cat} locale={locale} />
      </aside>

      {/* Main content: description */}
      <div class="lg:col-span-2">
        {descriptionHtml && (
          <div class="prose prose-lg max-w-none text-text" set:html={descriptionHtml} />
        )}

        {cat.observations && (
          <div class="mt-6 rounded-lg bg-primary/5 p-4">
            <p class="text-sm text-text-muted">{cat.observations}</p>
          </div>
        )}
      </div>
    </div>

    {/* Adoption form / status message */}
    <section class="mt-12">
      {cat.status === 'available' ? (
        <div class="mx-auto max-w-2xl">
          <h2 class="mb-6 font-display text-2xl font-bold text-primary">
            {t(locale, 'cat.adoptionInquiry')}
          </h2>
          <AdoptionForm client:load locale={locale} translations={adoptionFormTranslations} catName={cat.name} />
        </div>
      ) : cat.status === 'adopted' ? (
        <div class="mx-auto max-w-2xl rounded-xl bg-primary/5 p-6 text-center">
          <p class="text-lg font-medium text-primary">{t(locale, 'cat.status.adopted.message')}</p>
        </div>
      ) : cat.status === 'treatment' ? (
        <div class="mx-auto max-w-2xl rounded-xl bg-amber-50 p-6 text-center">
          <p class="text-lg font-medium text-amber-800">{t(locale, 'cat.status.treatment.message')}</p>
        </div>
      ) : (
        <div class="mx-auto max-w-2xl rounded-xl bg-gray-50 p-6 text-center">
          <p class="text-lg font-medium text-gray-600">{t(locale, 'cat.status.unavailable.message')}</p>
        </div>
      )}
    </section>

    {/* Gallery */}
    {cat.gallery?.length > 0 && (
      <section class="mt-12">
        <h2 class="mb-4 font-display text-2xl font-bold text-primary">
          {t(locale, 'cat.gallery')}
        </h2>
        <CatGallery images={cat.gallery} catName={cat.name} />
      </section>
    )}
  </article>
</BaseLayout>
```

- [ ] **Step 4: Type-check**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no new errors from these three files (pre-existing unrelated errors, if any, are not this task's concern).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/cats/CatGallery.astro apps/web/src/pages/cat/\[slug\].astro apps/web/src/pages/es/cat/\[slug\].astro
git commit -m "feat(web): cat detail pages read from D1"
```

---

### Task 6: Featured cats become a server island

**Files:**
- Modify: `apps/web/src/components/landing/FeaturedCatsSection.astro`
- Modify: `apps/web/src/pages/index.astro`
- Modify: `apps/web/src/pages/es/index.astro`

**Interfaces:**
- Consumes: `requireDb` (Task 1), `listFeaturedCats` from `@avd/content`, `localizeCat` from `@avd/content/localize`, `toCatCardProps` (Task 4), `CatCard.astro` (Task 4).

`tests/landing.test.ts` only asserts the static `SECTION_MAP` (discriminant → component name) used by `index.astro`'s `sections.map()` switch, which this task does not touch — it stays green with no changes.

- [ ] **Step 1: Rewrite `FeaturedCatsSection.astro` as a D1-backed server island**

```astro
---
// apps/web/src/components/landing/FeaturedCatsSection.astro
import type { Locale } from '../../i18n/index';
import { t } from '../../i18n/index';
import { requireDb } from '../../lib/db';
import { listFeaturedCats } from '@avd/content';
import { localizeCat } from '@avd/content/localize';
import { toCatCardProps } from '../../lib/cat-card-props';
import CatCard from '../cats/CatCard.astro';

interface Props {
  locale: Locale;
}

const { locale } = Astro.props;

const db = requireDb(Astro.locals);
const rows = await listFeaturedCats(db, 3);
const featuredCats = rows.map((row) => toCatCardProps(localizeCat(row, locale)));

const catsHref = locale === 'ca' ? '/cats' : '/es/cats';
---

{featuredCats.length > 0 && (
  <section class="bg-surface py-16 sm:py-24">
    <div class="mx-auto max-w-7xl px-4 sm:px-6">
      <h2 class="mb-10 text-center font-display text-3xl font-bold text-primary sm:text-4xl">
        {locale === 'ca' ? 'Gats destacats' : 'Gatos destacados'}
      </h2>
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featuredCats.map((cat) => (
          <CatCard cat={cat} locale={locale} />
        ))}
      </div>
      <div class="mt-10 text-center">
        <a
          href={catsHref}
          class="inline-block rounded-lg border-2 border-primary bg-transparent px-8 py-3 font-semibold text-primary transition-colors hover:bg-primary hover:text-surface"
        >
          {t(locale, 'cta.adopt')}
        </a>
      </div>
    </div>
  </section>
)}
```

- [ ] **Step 2: Render it as a server island with a static fallback on both home pages**

```astro
<!-- apps/web/src/pages/index.astro: replace the final line -->
  <FeaturedCatsSection server:defer locale={locale}>
    <div slot="fallback" class="bg-surface py-16 sm:py-24">
      <div class="mx-auto max-w-7xl px-4 text-center sm:px-6">
        <h2 class="mb-10 font-display text-3xl font-bold text-primary sm:text-4xl">
          Gats destacats
        </h2>
        <div class="grid animate-pulse gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div class="aspect-[4/3] rounded-xl bg-primary/5"></div>
          <div class="aspect-[4/3] rounded-xl bg-primary/5"></div>
          <div class="aspect-[4/3] rounded-xl bg-primary/5"></div>
        </div>
      </div>
    </div>
  </FeaturedCatsSection>
</BaseLayout>
```

(Everything above that last block in `index.astro` — imports, frontmatter, the `sections.map()` switch — is unchanged.)

```astro
<!-- apps/web/src/pages/es/index.astro: replace the final line -->
  <FeaturedCatsSection server:defer locale={locale}>
    <div slot="fallback" class="bg-surface py-16 sm:py-24">
      <div class="mx-auto max-w-7xl px-4 text-center sm:px-6">
        <h2 class="mb-10 font-display text-3xl font-bold text-primary sm:text-4xl">
          Gatos destacados
        </h2>
        <div class="grid animate-pulse gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div class="aspect-[4/3] rounded-xl bg-primary/5"></div>
          <div class="aspect-[4/3] rounded-xl bg-primary/5"></div>
          <div class="aspect-[4/3] rounded-xl bg-primary/5"></div>
        </div>
      </div>
    </div>
  </FeaturedCatsSection>
</BaseLayout>
```

- [ ] **Step 3: Verify `landing.test.ts` is still green (no code under test changed)**

Run: `pnpm --filter web exec vitest run tests/landing.test.ts`
Expected: PASS (unchanged — confirms this task did not accidentally touch the section-map logic it covers)

- [ ] **Step 4: Verify the pages still build (server islands require a build, not just `tsc`)**

Run: `pnpm --filter web build`
Expected: build succeeds; `index.astro` and `es/index.astro` stay static (no `export const prerender = false` needed on them — `server:defer` makes only the island dynamic), and Astro emits a `_server-islands` endpoint for `FeaturedCatsSection`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/landing/FeaturedCatsSection.astro apps/web/src/pages/index.astro apps/web/src/pages/es/index.astro
git commit -m "feat(web): featured cats render as a D1-backed server island"
```

---

### Task 7: `sitemap-cats.xml` + `robots.txt`

**Files:**
- Create: `apps/web/src/lib/sitemap-cats.ts`
- Create: `apps/web/src/pages/sitemap-cats.xml.ts`
- Modify: `apps/web/public/robots.txt`
- Test: `apps/web/tests/sitemap-cats.test.ts` (new)

**Interfaces:**
- Consumes: `requireDb` (Task 1), `listPublishedCats` from `@avd/content`.
- Produces: `buildCatsSitemap(cats: { slugCa: string; slugEs: string; updatedAt: string }[], site: string): string`.

`@astrojs/sitemap` (unchanged, still configured in `astro.config.mjs`) only sees **prerendered** routes; since the cat pages are now `prerender = false`, it silently stops listing them in `sitemap-index.xml` — this is exactly why cat URLs need their own dynamic sitemap. `tests/seo-meta.test.ts` does not assert anything about sitemap content (confirmed: it only covers `buildCanonicalUrl`/`buildHreflangLinks`/`buildOgMeta`), so it needs no changes.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/tests/sitemap-cats.test.ts
import { describe, expect, it } from 'vitest';
import { buildCatsSitemap } from '../src/lib/sitemap-cats';

const site = 'https://animalsvidadigna.org';

describe('buildCatsSitemap', () => {
  it('returns a valid XML document with the sitemap and xhtml namespaces', () => {
    const xml = buildCatsSitemap([], site);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(xml).toContain('<urlset');
    expect(xml).toContain('</urlset>');
  });

  it('emits one <url> per locale per cat', () => {
    const xml = buildCatsSitemap(
      [{ slugCa: 'lluna', slugEs: 'luna', updatedAt: '2026-01-01T00:00:00.000Z' }],
      site,
    );
    expect((xml.match(/<url>/g) ?? []).length).toBe(2);
    expect(xml).toContain('<loc>https://animalsvidadigna.org/cat/lluna</loc>');
    expect(xml).toContain('<loc>https://animalsvidadigna.org/es/cat/luna</loc>');
  });

  it('includes lastmod from updatedAt', () => {
    const xml = buildCatsSitemap(
      [{ slugCa: 'lluna', slugEs: 'luna', updatedAt: '2026-01-01T00:00:00.000Z' }],
      site,
    );
    expect(xml).toContain('<lastmod>2026-01-01T00:00:00.000Z</lastmod>');
  });

  it('includes ca/es/x-default xhtml alternate links, x-default pointing to the CA url', () => {
    const xml = buildCatsSitemap(
      [{ slugCa: 'lluna', slugEs: 'luna', updatedAt: '2026-01-01T00:00:00.000Z' }],
      site,
    );
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="ca" href="https://animalsvidadigna.org/cat/lluna" />');
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="es" href="https://animalsvidadigna.org/es/cat/luna" />');
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="x-default" href="https://animalsvidadigna.org/cat/lluna" />');
  });

  it('handles multiple cats', () => {
    const xml = buildCatsSitemap(
      [
        { slugCa: 'lluna', slugEs: 'luna', updatedAt: '2026-01-01T00:00:00.000Z' },
        { slugCa: 'michi', slugEs: 'michi-es', updatedAt: '2026-02-01T00:00:00.000Z' },
      ],
      site,
    );
    expect((xml.match(/<url>/g) ?? []).length).toBe(4);
    expect(xml).toContain('/cat/michi');
    expect(xml).toContain('/es/cat/michi-es');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web exec vitest run tests/sitemap-cats.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/sitemap-cats'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/src/lib/sitemap-cats.ts
export interface SitemapCat {
  slugCa: string;
  slugEs: string;
  updatedAt: string;
}

function urlEntry(loc: string, lastmod: string, caUrl: string, esUrl: string): string {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <xhtml:link rel="alternate" hreflang="ca" href="${caUrl}" />
    <xhtml:link rel="alternate" hreflang="es" href="${esUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${caUrl}" />
  </url>`;
}

/**
 * Build the dynamic cats sitemap: one <url> per locale per published cat,
 * each carrying xhtml:link alternates for ca/es and x-default (always CA).
 */
export function buildCatsSitemap(cats: SitemapCat[], site: string): string {
  const entries = cats.flatMap((cat) => {
    const caUrl = `${site}/cat/${cat.slugCa}`;
    const esUrl = `${site}/es/cat/${cat.slugEs}`;
    return [
      urlEntry(caUrl, cat.updatedAt, caUrl, esUrl),
      urlEntry(esUrl, cat.updatedAt, caUrl, esUrl),
    ];
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`;
}
```

```ts
// apps/web/src/pages/sitemap-cats.xml.ts
import type { APIRoute } from 'astro';
import { listPublishedCats } from '@avd/content';
import { requireDb } from '../lib/db';
import { buildCatsSitemap } from '../lib/sitemap-cats';

export const prerender = false;

export const GET: APIRoute = async ({ locals, site }) => {
  const db = requireDb(locals);
  const cats = await listPublishedCats(db);
  const siteOrigin = site?.href?.replace(/\/$/, '') || 'https://animalsvidadigna.org';

  const body = buildCatsSitemap(
    cats.map((cat) => ({
      slugCa: cat.slugCa,
      slugEs: cat.slugEs,
      updatedAt: cat.updatedAt,
    })),
    siteOrigin,
  );

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
```

File: `apps/web/public/robots.txt` (full content):

```txt
User-agent: *
Allow: /
Sitemap: https://animalsvidadigna.org/sitemap-index.xml
Sitemap: https://animalsvidadigna.org/sitemap-cats.xml
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web exec vitest run tests/sitemap-cats.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/sitemap-cats.ts apps/web/src/pages/sitemap-cats.xml.ts apps/web/public/robots.txt apps/web/tests/sitemap-cats.test.ts
git commit -m "feat(web): dynamic sitemap-cats.xml, list it in robots.txt"
```

---

### Task 8: Remove the Keystatic `cats` collection and its filesystem content

**Files:**
- Modify: `keystatic.config.tsx`
- Delete: `src/content/cats/` (entire directory)
- Delete: `apps/web/src/lib/cat-routes.ts`
- Delete: `apps/web/tests/cats-routes.test.ts`
- Modify: `apps/web/src/i18n/content.ts` (remove `getLocalizedCat`; keep `getLocalizedField`, still used by every landing section)
- Modify: `apps/web/tests/schemas.test.ts`

**Interfaces:**
- Removes: `getLocalizedCat` (superseded by `localizeCat` from `@avd/content/localize`, used exclusively since Tasks 4–6), `generateCatPathsCa`/`generateCatPathsEs` (superseded by dynamic `[slug].astro` routes with no `getStaticPaths`, Task 5).

- [ ] **Step 1: Remove the `cats` collection from `keystatic.config.tsx`**

Delete this block (the entire `cats` collection definition, including its comment header):

```tsx
// ---------------------------------------------------------------------------
// Cats collection
// ---------------------------------------------------------------------------

const cats = collection({
  label: 'Gats',
  slugField: 'slug_ca',
  path: 'src/content/cats/*',
  schema: {
    // ...
  },
});
```

And remove `cats` from the exported config's `collections`:

```tsx
// keystatic.config.tsx (bottom of the file)
export default config({
  storage: resolveKeystaticStorage(import.meta.env),
  singletons: {
    settings,
    landing,
  },
  collections: {
    pages,
  },
});
```

(`bilingualImage` and `seoFields` helpers stay — `settings`, `landing` and `pages` still use them.)

- [ ] **Step 2: Delete the Keystatic cat content and the now-dead route helpers**

```bash
rm -rf apps/web/src/content/cats
rm apps/web/src/lib/cat-routes.ts
rm apps/web/tests/cats-routes.test.ts
```

- [ ] **Step 3: Remove `getLocalizedCat` from `src/i18n/content.ts`, keeping `getLocalizedField`**

```ts
// apps/web/src/i18n/content.ts
import type { Locale } from './index';

/**
 * Read a locale-suffixed field from a content entry.
 * e.g. getLocalizedField(entry, 'name', 'ca') reads entry.name_ca
 */
export function getLocalizedField<T>(
  entry: Record<string, T>,
  fieldName: string,
  locale: Locale,
): T {
  return entry[`${fieldName}_${locale}`];
}
```

(`getLocalizedCat` and everything below it in the old file is deleted — landing sections only ever imported `getLocalizedField`, confirmed by `grep -rn "getLocalizedField\|getLocalizedCat" src` before this task, which showed every landing component using only `getLocalizedField`.)

- [ ] **Step 4: Fix `tests/schemas.test.ts`**

Remove the entire `describe('CMS-02: Cats collection', ...)` block. In `describe('CMS-05: Bilingual alt text on all image fields', ...)`, remove the `'cats coverImage has alt_ca and alt_es'` and `'cats gallery items have alt_ca and alt_es'` tests, keeping only `'settings seo image has alt_ca and alt_es'`:

```ts
// apps/web/tests/schemas.test.ts (CMS-05 block, after this task)
describe('CMS-05: Bilingual alt text on all image fields', () => {
  it('settings seo image has alt_ca and alt_es', () => {
    const seo = (keystaticConfig.singletons!.settings!.schema as any).seo;
    expect(seo).toBeDefined();
    const seoInner = seo.schema || seo.fields || seo;
    const seoKeys = Object.keys(seoInner);
    expect(seoKeys).toContain('image');

    const image = seoInner.image;
    const imageInner = image.schema || image.fields || image;
    const imageKeys = Object.keys(imageInner);
    expect(imageKeys).toContain('alt_ca');
    expect(imageKeys).toContain('alt_es');
  });
});
```

(`CMS-01: Settings singleton`, `CMS-03: Landing singleton` and `CMS-04: Pages collection` blocks are untouched.)

- [ ] **Step 5: Run the full test suite and grep for leftovers**

Run: `pnpm --filter web test`
Expected: PASS, with `tests/cats-routes.test.ts` gone from the run and `tests/schemas.test.ts` no longer referencing `collections.cats`.

Run:

```bash
grep -rn "collections\.cats\|getLocalizedCat\|generateCatPaths" apps/web/src apps/web/tests keystatic.config.tsx
```

Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add keystatic.config.tsx apps/web/src/i18n/content.ts apps/web/tests/schemas.test.ts
git add -u apps/web/src/content/cats apps/web/src/lib/cat-routes.ts apps/web/tests/cats-routes.test.ts
git commit -m "chore(web): remove Keystatic cats collection and dead route helpers"
```

---

### Task 9: Bundle-graph guard for the cats listing route

**Files:**
- Modify: `apps/web/tests/worker-bundle-no-keystatic.test.ts`

**Interfaces:**
- Consumes: `collectModuleGraph` (existing helper in this file, unchanged).

- [ ] **Step 1: Write the failing test**

Append to the end of `apps/web/tests/worker-bundle-no-keystatic.test.ts` (after the existing `describeIfBuilt('Worker API route bundles ...)` block, leaving it untouched).

Note before writing the test: `src/pages/cats/index.astro` still calls `reader.singletons.settings.read()` for `donateUrl` — that legitimately pulls `@keystatic/core` into this route's graph. Since moving settings out of Keystatic is explicitly out of scope for this phase (spec Non-goals: "Migrating settings, landing page and static pages out of Keystatic"), the guard below asserts the narrower, true guarantee this route actually needs — no `node:fs` import (the production-500 risk the existing `contact`/`adopt` guard in this same file protects against) — rather than no `@keystatic/core` at all:

```ts
// apps/web/tests/worker-bundle-no-keystatic.test.ts (append)

/**
 * Companion guard for the cats listing route: now that src/pages/cats/index.astro
 * and src/pages/es/cats/index.astro read from D1 instead of the Keystatic
 * reader (Phase 3), their bundled module graph must stay filesystem-free --
 * a node:fs import here would risk the same class of production 500 the
 * guard above protects contact/adopt against. (These routes still legitimately
 * import @keystatic/core, via reader.singletons.settings.read() for donateUrl
 * -- migrating settings off Keystatic is out of scope for this phase, see the
 * spec's Non-goals -- so that import is not asserted against here.)
 */

const CATS_PAGE_DIR = join(WORKER_DIR, 'pages', 'cats');
const ES_CATS_PAGE_DIR = join(WORKER_DIR, 'pages', 'es', 'cats');
const describeCatsIfBuilt = existsSync(CATS_PAGE_DIR) ? describe : describe.skip;

describeCatsIfBuilt('Public cats listing bundle (dist/_worker.js/pages/cats)', () => {
  for (const [label, dir] of [
    ['cats/index', CATS_PAGE_DIR],
    ['es/cats/index', ES_CATS_PAGE_DIR],
  ] as const) {
    it(`${label} route's transitive module graph is filesystem-free (no node:fs)`, () => {
      const graph = collectModuleGraph(join(dir, 'index.astro.mjs'));

      expect(graph.length).toBeGreaterThan(1);

      for (const modulePath of graph) {
        const source = readFileSync(modulePath, 'utf-8');
        expect(
          /from\s+['"]node:fs|require\(['"]node:fs/.test(source),
          `${modulePath} must not import node:fs`,
        ).toBe(false);
      }
    });
  }
});
```

- [ ] **Step 2: Build and run to verify the assertion holds**

Run: `pnpm --filter web build && pnpm --filter web exec vitest run tests/worker-bundle-no-keystatic.test.ts`
Expected: PASS — both the pre-existing `contact`/`adopt` checks and the two new `cats`/`es/cats` checks (Keystatic's `settings` reader stays filesystem-backed only in non-production `storage` modes per `src/lib/keystatic-storage.ts`; in production it is GitHub-storage-backed, not `node:fs` — confirm this still holds by reading `src/lib/keystatic-storage.ts` if the assertion above fails).

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/worker-bundle-no-keystatic.test.ts
git commit -m "test(web): guard cats listing routes against node:fs in their bundle"
```

---

### Task 10: Verification (tests, build, curl, Lighthouse)

**Files:** none (verification only).

- [ ] **Step 1: Full workspace test + build**

```bash
pnpm turbo test
pnpm turbo build
```

Expected: both green. `pnpm turbo build` runs `apps/web`'s `prebuild` (`generate-settings.ts`), then `astro build`; confirm `dist/_worker.js/index.js` and `dist/_worker.js/pages/cats/index.astro.mjs` / `dist/_worker.js/pages/cat/[slug].astro.mjs` (and `es/` equivalents) exist, and that `dist/_worker.js/pages/sitemap-cats.xml.astro.mjs` (or equivalent SSR endpoint output) exists too.

- [ ] **Step 2: Worker preview + curl the on-demand routes**

`preview:worker` runs `wrangler dev` against the same local D1 state Task 1 set up. Regenerate and (re-)apply the seed first — `packages/content/seed.sql` is gitignored, so it will not exist on a fresh clone, and local D1 state may be stale or absent in CI:

```bash
pnpm --filter web exec wrangler d1 migrations apply avd-content --local
pnpm --filter @avd/content run seed:generate
wrangler d1 execute avd-content --local --file ../../packages/content/seed.sql
```

Expected output of `seed:generate`: `Wrote <absolute-path-to>/packages/content/seed.sql`. Run the `wrangler d1 execute` command from `apps/web` too, per Task 1.

```bash
pnpm --filter web preview:worker
```

In a second terminal, once `wrangler dev` reports it is listening (default `http://localhost:8787`):

```bash
curl -is http://localhost:8787/cats | head -20
curl -is http://localhost:8787/cat/lluna | head -20
curl -is http://localhost:8787/es/cat/luna | head -20
curl -is http://localhost:8787/sitemap-cats.xml | head -30
```

Expected: `/cats` and `/cat/lluna` return `200` with cat markup (the seeded sample cat "Lluna" / `slug_es: luna` — swap for whatever slugs Phase 2's seed actually used if different); `/es/cat/luna` returns `200`; `/sitemap-cats.xml` returns `200` with `Content-Type: application/xml` and `<url>` entries for every published cat. If `/cat/lluna` or `/es/cat/luna` 404/redirect instead, the seed slugs differ — rerun with `curl -is http://localhost:8787/cats` and read the actual `href`s off the rendered page before concluding this task failed.

Stop the preview server (`Ctrl+C`) once curl checks pass.

- [ ] **Step 3: Lighthouse mobile audit on all four required pages, both locales**

This repeats the checkpoint from `.planning/phases/04-seo-accessibility-performance/04-06-PLAN.md`, using the same manual Chrome DevTools flow (that plan used `pnpm build && pnpm preview`; here the pages under test are dynamic, so use the Worker preview instead so timings reflect a real D1 round-trip):

```bash
pnpm --filter web build
pnpm --filter web exec wrangler dev
```

For each of the following URLs, open Chrome DevTools → Lighthouse tab → Mode "Navigation", Device "Mobile", Categories = ALL four → "Analyze page load", and record all four scores:

- `http://localhost:8787/`
- `http://localhost:8787/cats`
- `http://localhost:8787/cat/lluna`
- `http://localhost:8787/es/`
- `http://localhost:8787/es/cats`
- `http://localhost:8787/es/cat/luna`

**Expected:** Performance, Accessibility, Best Practices and SEO all ≥ 95 on every URL (the Global Constraint this phase must not regress). If Performance drops below 95 on a cat page specifically (most likely cause: the D1 round-trip pushes server response time up, or the now-remote `images.animalsvidadigna.org` cover image loses `fetchpriority="high"`/explicit dimensions), capture the Lighthouse Diagnostics section (LCP, TBT, CLS) before concluding — do not guess at a fix without those numbers.

Record the six scores in the PR description in this format:

```
/ (ca): Perf=XX, A11y=XX, BP=XX, SEO=XX
/cats (ca): Perf=XX, A11y=XX, BP=XX, SEO=XX
/cat/lluna (ca): Perf=XX, A11y=XX, BP=XX, SEO=XX
/es/ : Perf=XX, A11y=XX, BP=XX, SEO=XX
/es/cats: Perf=XX, A11y=XX, BP=XX, SEO=XX
/es/cat/luna: Perf=XX, A11y=XX, BP=XX, SEO=XX
```

- [ ] **Step 4: Ordering rule before merge — D1 seeded in production first**

Per the plan README's ordering rules ("Seed D1 (end of Phase 2) before deploying Phase 3"), confirm before merging this phase's PR:

```bash
wrangler d1 execute avd-content --remote --command "select count(*) from cats where published = 1"
```

Expected: a non-zero count. If zero, stop — do not merge this PR until Phase 2's production seed has run, or every cat page will 404/redirect on visitors in production the instant this merges (there is no prerendered fallback anymore).

- [ ] **Step 5: Preview URL check on the PR**

Push the branch, open the PR, wait for the Workers Builds preview URL, and repeat Step 2's curl checks (and, at minimum, a manual look at `/cats` and one `/cat/<slug>` page) against the preview URL before requesting review/merge.

- [ ] **Step 6: Commit** (only if Steps 1–5 required code changes to go green; otherwise this task produces no diff and is not committed)

```bash
git add -A
git commit -m "test(web): verify D1-backed public site (Lighthouse ≥95, curl checks)"
```

---

## Self-review notes

- **Spec coverage:** Repository API (`listPublishedCats`, `listFeaturedCats`, `getCatBySlug`) — Tasks 4–6. Localisation (`localizeCat`) — Tasks 4–6. Image URLs (`imageUrl`, `imageSrcset`, `originalImageUrl`, `DEFAULT_WIDTHS`, `DEFAULT_SIZES`, `DEFAULT_IMAGES_ORIGIN`) — Tasks 3, 4, 5, 7. Public site bullet list (prerender=false on the four cat routes, server island, dynamic sitemap, `OptimizedImage` R2 key, Keystatic cats collection removed) — Tasks 4, 5, 6, 7, 8 respectively. Lighthouse ≥95 constraint — Task 10.
- **Placeholder scan:** every task step has literal file content; no "similar to Task N", no TODOs in shipped code (the `newsletter`/`faq` `TODO` comments in `index.astro` predate this phase and are untouched, out of scope).
- **Type consistency:** `CatFilterData` (`cat-filters.ts`) → consumed identically in both listing pages and `CatFilters.tsx`. `CatCardData`/`toCatCardProps` (`cat-card-props.ts`) → consumed identically by `CatCard.astro`, both listing pages' `noscript` fallback, and `FeaturedCatsSection.astro`. `OptimizedImageSource`/`resolveOptimizedImageSource` (`optimized-image-url.ts`) → consumed by `OptimizedImage.astro` only, with the same field names (`src`, `srcset`, `sizes`, `width`) used in the template. `SitemapCat`/`buildCatsSitemap` (`sitemap-cats.ts`) → consumed identically by `sitemap-cats.xml.ts` and its test.

## Contract gaps

None. Every function this phase calls (`createDb`, `listPublishedCats`, `listFeaturedCats`, `getCatBySlug`, `localizeCat`, `imageUrl`, `imageSrcset`, `originalImageUrl`, `DEFAULT_WIDTHS`, `DEFAULT_SIZES`, `DEFAULT_IMAGES_ORIGIN`) is already named in the spec's Interface contract. This phase adds, but does not require upstream changes to fill:

- `apps/web/src/lib/db.ts`'s `requireDb` — app-local, added on top of Phase 2's existing `getDb` in the same file; not part of `@avd/content`.
- `apps/web/src/lib/cat-card-props.ts` (`toCatCardProps`) — app-local presentation mapping.
- `apps/web/src/lib/optimized-image-url.ts` (`resolveOptimizedImageSource`) — app-local, backs the `OptimizedImage.astro` contract addition documented above.
- `apps/web/src/lib/sitemap-cats.ts` (`buildCatsSitemap`) — app-local, backs the `sitemap-cats.xml.ts` route the spec's Public Site section names directly.
