# Content, R2 images and admin app for animals-vida-digna

Date: 2026-09-03
Status: Proposed (awaiting approval). Implementation plan: `docs/superpowers/plans/2026-09-03-content-r2-pipeline/README.md`

## Problem

1. Cat content changes weekly (status, photos, text). Today every change made in
   Keystatic becomes a pull request against `main`, and the "Main branch
   protection" ruleset (1 approving review, no bypass) forces the maintainer to
   review each one. The ruleset must stay — it protects the code — but content
   must not go through it.
2. Photos are committed to git (`public/images/**`) and served as Worker
   assets. Images must live in Cloudflare R2.
3. Responsive variants must be produced without the €5/month Images Paid plan.
4. Volunteers currently need a GitHub account with **Write** access to the code
   repository just to edit a cat.

## Decision

Build a separate **admin application** on Cloudflare, and move cat data out of
git into **D1** and cat images into **R2**. Keystatic stays, for now, only for
the rarely-changing content (site settings, landing page, static pages), where
a reviewed PR is acceptable.

| Concern | Choice |
|---|---|
| Repo layout | pnpm workspaces + Turborepo: `apps/web` (public site, moved), `apps/admin` (new), `packages/content` (D1 schema, repository, validation, image URLs), `packages/design-system` (from the `design-system` branch) |
| Admin framework | **Astro 5** with React islands and Astro Actions, deployed as its own Worker at `admin.animalsvidadigna.org` |
| Auth | **better-auth** with the `emailOTP` plugin (6-digit code by email via Resend), users restricted to an allowlist, sessions in D1 |
| Data | **D1** via Drizzle ORM; one schema package; SQL migrations applied with `wrangler d1 migrations apply` |
| Images | Browser resizes to ≤2000 px WebP before upload → Astro Action streams it into **R2** → served from `images.animalsvidadigna.org` (R2 custom domain) through Cloudflare **URL transformations** (`/cdn-cgi/image/…`, Images Free plan) |
| Public site | Cat pages render **on demand** from D1 (`prerender = false`); everything else stays prerendered. Home "featured cats" becomes a server island |
| Sitemap | Static pages keep `@astrojs/sitemap`; cat pages get a dynamic `sitemap-cats.xml`, both listed in `robots.txt` |

### Why not Next.js for the admin

`@opennextjs/cloudflare` documents the Workers Free plan's **3 MB compressed**
script limit as its binding constraint, needs an R2/KV cache binding, and has no
published minimal-bundle figure; community reports regularly exceed 3 MB. That
reintroduces the exact €5/month risk this work exists to avoid, adds a second
framework to a Preact/Astro codebase, and buys nothing the admin needs: its
"dashboard" is one list and one form. The current Astro Worker is 0.39 MB
gzipped. Astro gives React islands for interactivity, Actions for typed RPC with
zod validation and file uploads, middleware for sessions, and the same Cloudflare
adapter the site already uses. If a large SPA is ever needed, `packages/content`
and better-auth carry over unchanged.

### Why a separate app rather than `/admin` routes in the site

Independent deploys and failure domains; the public Worker keeps zero auth code
and zero admin routes; cookies are scoped to `admin.`; the admin can consume the
React design-system package without adding React islands to the Preact site. Cost:
the monorepo conversion (Phase 1), which the design-system work already started.

### Why better-auth rather than Cloudflare Access

Both are free at this scale. better-auth keeps login inside the app (no Zero
Trust dashboard dependency, a user table we own, room for roles later) and was
the maintainer's stated preference. Access remains available as an extra outer
lock on `admin.` and is documented in `research/cloudflare-platform-facts.md`.

### Why URL transformations rather than resizing at upload

The Images **binding** (in-Worker transforms) requires the Paid plan. WASM
encoders (photon, jsquash) blow the Free plan's 10 ms CPU budget. `sharp` cannot
run in workerd. URL transformations are on the Free plan: 5,000 unique
transformations per calendar month, `format=auto` counted once, so at four
widths per image the site can add ~1,250 new images a month before any image
falls back to its original (`onerror=redirect`, which explicitly accepts
subdomains of the zone). Browser-side resizing bounds the original (≈300–500 KB
WebP) so the fallback is still acceptable and R2 stays tiny.

## Non-goals

- Migrating settings, landing page and static pages out of Keystatic (follow-up plan).
- Extending the design-system package with form controls (admin-specific controls live in `apps/admin`; upstreaming is a follow-up).
- HTML caching of dynamic pages (Cache API purges are per-PoP; traffic does not justify it).
- Roles/permissions beyond "allowlisted email can edit everything".
- Changing the GitHub ruleset.

## Constraints (verbatim, apply to every phase)

- Free tiers only: Workers Free (3 MB compressed script, 10 ms CPU, 100k req/day), D1 Free (5M reads/100k writes per day, hard-enforced), R2 Free (10 GB), Images Free (5,000 unique transformations/month). Never add the Images binding or the Workers Paid plan.
- `astro ^5.18`, `@astrojs/cloudflare ^12.6` — use `context.locals.runtime.env`; never Astro 6 / adapter 13 APIs.
- `compatibility_flags = ["nodejs_compat"]` on both Workers.
- Biome: kebab-case filenames, single quotes, semicolons, lineWidth 80, sorted Tailwind classes.
- Tests: Vitest, flat `tests/*.test.ts` per app/package, pure-function style; TDD (failing test first) on every task.
- Lighthouse ≥ 95 on all four mobile categories for `/`, `/cats`, `/cat/<slug>` in both locales must still hold after Phase 3.
- Commit style `type(scope): summary` with scopes `monorepo`, `content`, `web`, `admin`, `images`, `docs`.
- No secrets in git. Runtime secrets via `wrangler secret put`; local copies in `.dev.vars` (gitignored).

## Architecture

```
                 volunteer (browser)                          visitor (browser)
                        │                                             │
      https://admin.animalsvidadigna.org                https://animalsvidadigna.org
                        │                                             │
   ┌────────────────────▼────────────────────┐     ┌──────────────────▼─────────────────┐
   │ Worker: animals-vida-digna-admin        │     │ Worker: animals-vida-digna         │
   │ apps/admin (Astro, React islands)       │     │ apps/web (Astro, Preact islands)   │
   │ better-auth (emailOTP)  Astro Actions   │     │ static pages + on-demand cat pages │
   └───────┬───────────────┬────────┬────────┘     └──────────────────┬─────────────────┘
           │ D1            │ R2     │ Resend                          │ D1 (read)
   ┌───────▼───────┐ ┌─────▼──────────────┐                           │
   │ D1: avd-content│ │ R2: animals-vida-  │◄──────────────────────────┘ (images by URL)
   │ cats, cat_images│ │ digna-images       │
   │ user, session…  │ │ key cats/<cat>/<img>.webp
   └────────────────┘ └─────────┬──────────┘
                                │ custom domain
                  https://images.animalsvidadigna.org/cdn-cgi/image/width=640,format=auto,…/cats/<cat>/<img>.webp
```

## Interface contract

Every phase implements against these names. A phase may add to the contract but
must not rename what is here.

### Workspace

```
pnpm-workspace.yaml        packages: ['apps/*', 'packages/*']
turbo.json                 tasks: build (dependsOn ^build, outputs dist/**), test (dependsOn ^build), check
                           (`check` = `tsc --noEmit` per package; `lint` is root-only: `biome check .`, not a turbo task)
apps/web                   package name "web"        (the moved site)
apps/admin                 package name "admin"
packages/content           package name "@avd/content"
packages/design-system     package name "@avd/design-system" (unchanged)
```

### Cloudflare resources

| Resource | Name | Bound as | Used by |
|---|---|---|---|
| D1 database | `avd-content` | `DB` | web (read), admin (read/write) |
| R2 bucket | `animals-vida-digna-images` | `IMAGES_BUCKET` | admin only |
| R2 custom domain | `images.animalsvidadigna.org` | — | public reads |
| Worker | `animals-vida-digna` | — | apps/web, custom domain `animalsvidadigna.org` |
| Worker | `animals-vida-digna-admin` | — | apps/admin, custom domain `admin.animalsvidadigna.org` |
| Zone setting | Images → Transformations enabled; allowed origins include `images.animalsvidadigna.org` | — | — |

Migrations directory for D1: `packages/content/migrations` (referenced from both
apps' `wrangler.toml` as `migrations_dir`).

### Secrets (admin Worker; mirrored in `apps/admin/.dev.vars`)

`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (`https://admin.animalsvidadigna.org`),
`RESEND_API_KEY`, `AUTH_EMAIL_FROM` (`Animals Vida Digna <no-reply@animalsvidadigna.org>`),
`ADMIN_ALLOWED_EMAILS` (comma-separated), `AUTH_INSECURE_COOKIES` (`1` only in `.dev.vars`),
`AUTH_DEV_LOG_OTP` (`1` only in `.dev.vars`: log the code to the console instead of emailing; never set in production).
Public build-time variable in both apps: `PUBLIC_IMAGES_ORIGIN` (defaults to
`https://images.animalsvidadigna.org`).

### D1 schema (`packages/content/src/schema.ts`, Drizzle sqlite)

`cats`

| column | type | notes |
|---|---|---|
| `id` | text PK | 21-char nanoid |
| `slug_ca`, `slug_es` | text, unique, not null | URL slugs per locale |
| `name_ca`, `name_es` | text not null | |
| `race_ca`, `race_es` | text default '' | |
| `status` | text not null default 'available' | `available` \| `adopted` \| `treatment` \| `unavailable` |
| `age` | integer nullable | years |
| `gender` | text not null default 'male' | `male` \| `female` |
| `size` | text not null default 'medium' | `small` \| `medium` \| `large` |
| `personality` | text not null default '[]' | JSON array of `playful|calm|shy|affectionate|independent|social|curious|protective` |
| `good_with` | text not null default '[]' | JSON array of `children|other-cats|dogs|elderly` |
| `health_status` | text not null default 'healthy' | `healthy` \| `treatment` \| `special-needs` |
| `vaccinated`, `microchipped`, `sterilized` | integer (boolean) default 0 | |
| `weight` | real nullable | kg |
| `rescue_date`, `adoption_date` | text nullable | `YYYY-MM-DD` |
| `special_needs_ca/_es`, `observations_ca/_es`, `short_description_ca/_es` | text default '' | |
| `description_ca`, `description_es` | text default '' | Markdoc source |
| `seo_title_ca/_es`, `seo_description_ca/_es` | text default '' | |
| `featured` | integer (boolean) default 0 | |
| `sort_order` | integer default 0 | |
| `published` | integer (boolean) default 1 | unpublished cats are invisible on the site |
| `cover_image_id` | text nullable, FK `cat_images.id` ON DELETE SET NULL | |
| `created_at`, `updated_at` | text not null | ISO-8601 UTC |
| `updated_by` | text not null default '' | editor email |

`cat_images`

| column | type | notes |
|---|---|---|
| `id` | text PK | nanoid |
| `cat_id` | text not null FK `cats.id` ON DELETE CASCADE | |
| `r2_key` | text not null unique | `cats/<cat_id>/<id>.webp` |
| `alt_ca`, `alt_es` | text default '' | |
| `width`, `height` | integer not null | pixel size of the stored WebP |
| `position` | integer not null default 0 | gallery order |
| `created_at` | text not null | |

Enum columns are typed in Drizzle with `.$type<…>()` using the literal unions
exported from `validate.ts` (`CatStatus`, `CatGender`, `CatSize`,
`CatHealthStatus`, `CatPersonality[]`, `CatGoodWith[]`), so `Cat['status']`
is `'available' | 'adopted' | 'treatment' | 'unavailable'`, not `string`.

Auth tables `user`, `session`, `account`, `verification`, `rate_limit` are
generated by the better-auth CLI — package **`auth`** (`npx auth@latest generate`;
`@better-auth/cli` is stale at 1.4.x) — into `packages/content/src/schema-auth.ts`
re-exported from `schema.ts` (Phase 4).

### Repository API (`packages/content/src/cats.ts`)

```ts
import type { DrizzleD1Database } from 'drizzle-orm/d1';
export type Db = DrizzleD1Database<typeof schema>;
export function createDb(d1: D1Database): Db;

export type Cat = typeof schema.cats.$inferSelect;            // JSON columns parsed to string[]
export type CatImage = typeof schema.catImages.$inferSelect;
export type CatWithImages = Cat & { images: CatImage[]; coverImage: CatImage | null };
export type CatInput = z.infer<typeof catInputSchema>;         // every editable column except id/timestamps/cover/updated_by

export function listPublishedCats(db: Db): Promise<CatWithImages[]>;              // sort_order ASC, name_ca ASC
export function listFeaturedCats(db: Db, limit?: number): Promise<CatWithImages[]>; // published AND featured
export function getCatBySlug(db: Db, locale: 'ca' | 'es', slug: string): Promise<CatWithImages | null>; // published only
export function listAllCats(db: Db): Promise<CatWithImages[]>;                    // admin, includes unpublished
export function getCatById(db: Db, id: string): Promise<CatWithImages | null>;
export function createCat(db: Db, input: CatInput, actor: string): Promise<CatWithImages>;
export function updateCat(db: Db, id: string, input: CatInput, actor: string): Promise<CatWithImages>;
export function deleteCat(db: Db, id: string): Promise<{ r2Keys: string[] }>;
export function addCatImage(db: Db, catId: string, image: { r2Key: string; width: number; height: number; altCa?: string; altEs?: string }): Promise<CatImage>;
export function updateCatImages(db: Db, catId: string, images: Array<{ id: string; altCa: string; altEs: string; position: number }>): Promise<void>;
export function removeCatImage(db: Db, imageId: string): Promise<{ r2Key: string } | null>;
export function setCoverImage(db: Db, catId: string, imageId: string | null): Promise<void>;
```

Validation (`packages/content/src/validate.ts`): `catInputSchema` — built with
**`zod@^3.25.76`** (the exact range `astro@5.18` depends on, so the schema
instance is assignable to `defineAction({ input })`, which types `input` with
`astro/zod` = zod 3; do **not** use `zod@4` or the `zod/v4` subpath) — plus
`CAT_STATUSES`, `CAT_GENDERS`, `CAT_SIZES`, `CAT_PERSONALITIES`, `CAT_GOOD_WITH`,
`CAT_HEALTH_STATUSES` const arrays (values copied from `keystatic.config.tsx`),
and `slugify(name: string): string` (lowercase, ASCII, hyphens).

Localisation (`packages/content/src/localize.ts`):
`localizeCat(cat: CatWithImages, locale: 'ca' | 'es'): LocalizedCat` returning
the same shape `getLocalizedCat` returns today, with `coverImage: { key, alt, width, height } | null`
and `gallery: { key, alt, width, height }[]`.

### Image URLs (`packages/content/src/image-url.ts`)

```ts
export const DEFAULT_IMAGES_ORIGIN = 'https://images.animalsvidadigna.org';
export const DEFAULT_WIDTHS = [320, 640, 960, 1280];
export const DEFAULT_SIZES = '(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw';
export const MAX_UPLOAD_EDGE = 2000;   // px, longest side after client-side resize
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export function imageKey(catId: string, imageId: string): string;   // `cats/${catId}/${imageId}.webp`
export function originalImageUrl(key: string, origin?: string): string;
export function imageUrl(key: string, width: number, origin?: string): string;
  // origin === DEFAULT_IMAGES_ORIGIN → `${origin}/cdn-cgi/image/width=${width},fit=scale-down,quality=80,format=auto,onerror=redirect/${key}`
  // fit=scale-down, not cover: imageUrl() has no height, and Cloudflare rejects
  // `cover` without one (`warning: cf-images 299 "cover fit mode needs both
  // width and height"`, observed in Phase 0 Task 6 Step 2). scale-down resizes
  // to the requested width, preserves aspect ratio and never upscales, which is
  // what the edge was already doing when `cover` was silently ignored.
  // See phase-0-results.md, "Findings that change later phases" §1.
  // any other origin (local dev)    → `${origin}/${key}`
export function imageSrcset(key: string, widths?: number[], origin?: string): string;
```

**Fallback contract if Phase 0 is NO-GO** (URL transformations unavailable on the
R2 custom domain): the browser generates every width in `DEFAULT_WIDTHS` plus the
≤2000 px original; keys become `cats/<catId>/<imageId>-<width>.webp` and
`cats/<catId>/<imageId>.webp`; `imageUrl(key, width, origin)` returns
`${origin}/${key.replace(/\.webp$/, `-${width}.webp`)}` and `originalImageUrl` is
unchanged; `cat_images` gains no columns (widths are fixed by the contract);
`images.upload` accepts one `File` per width (`files[]` + `widths[]`). Phase 2 and
Phase 5 implement whichever variant `phase-0-results.md` records.

### Admin routes and actions (`apps/admin`)

| Route | Purpose |
|---|---|
| `GET /login` | email form → code form (React island) |
| `ALL /api/auth/[...all]` | better-auth handler |
| `GET /` | redirect to `/cats` |
| `GET /cats` | list (status filter, cover thumbnail, published flag) |
| `GET /cats/new`, `GET /cats/[id]` | cat form (React island) |
| `GET /r2/[...key]` | **dev only** (`import.meta.env.DEV`) stream from `IMAGES_BUCKET` |

Actions (`apps/admin/src/actions/index.ts`): `cats.create`, `cats.update`,
`cats.delete`, `images.upload` (form, `File` ≤ `MAX_UPLOAD_BYTES`, `image/webp`),
`images.update` (alts + order), `images.remove`, `images.setCover`, `auth.signOut`.
Every action throws `ActionError({ code: 'UNAUTHORIZED' })` when `context.locals.user` is null.

### Public site (`apps/web`)

- `src/pages/cats/index.astro`, `src/pages/es/cats/index.astro`, `src/pages/cat/[slug].astro`, `src/pages/es/cat/[slug].astro`: `export const prerender = false`, read via `requireDb(Astro.locals)` from `apps/web/src/lib/db.ts`, which exports `getDb(locals: unknown): Db | undefined` (defensive, created in Phase 2) and `requireDb(locals: unknown): Db` (added in Phase 3; throws `Error('D1 binding "DB" is not available')` so a missing binding fails fast and loud).
- `src/components/landing/FeaturedCatsSection.astro` rendered with `server:defer` and a static fallback.
- `src/pages/sitemap-cats.xml.ts` (on demand) with `xhtml:link` alternates for ca/es; `public/robots.txt` lists both sitemaps.
- `OptimizedImage.astro` keeps `src` (site-relative static asset: hero, logo, landing images — existing `/cdn-cgi/image/` behaviour) and adds `r2Key?: string`; exactly one of the two is required. With `r2Key` it builds URLs with `@avd/content/image-url` using `import.meta.env.PUBLIC_IMAGES_ORIGIN ?? DEFAULT_IMAGES_ORIGIN`, and passes the stored `width`/`height` through for CLS.
- `src/lib/markdoc.ts` gains `renderMarkdocSource(src: string): string` for D1-stored Markdoc text; the existing `renderMarkdoc` stays for Keystatic content.
- Keystatic `cats` collection and `src/content/cats/` removed.

## Data migration

The repository contains three sample cats with no images. Phase 2 ships
`packages/content/scripts/seed-from-yaml.ts` that converts `src/content/cats/*.yaml`
+ `.mdoc` files into an SQL seed applied with `wrangler d1 execute`, so the same
path works for any real content added before cut-over.

## Rollout order and safety

Phase 0 is a go/no-go spike. Phases 1–2 are invisible to visitors. Phase 3 is the
visible switch (deploys atomically with the D1 seed already applied). Phases 4–5
add the admin. Phase 6 removes volunteers' repository access and documents the
new workflow. Rollback at any point before Phase 6: revert the merge commit; the
YAML content is still in git history until Phase 6 deletes it.

## Open questions resolved by default (change before Phase 2 if disagreeing)

- Description editor: plain Markdown/Markdoc textarea with live preview.
- Unpublished drafts exist (`published = 0`) so a new cat can be prepared before it appears.
- Deleting a cat deletes its R2 objects immediately (no trash).
- No HTML caching; every cat page request hits D1 (a few ms).
