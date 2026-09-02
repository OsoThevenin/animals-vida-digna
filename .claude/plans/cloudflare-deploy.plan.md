# Plan: Deploy animals-vida-digna to Cloudflare Workers

**Worktree**: `.claude/worktrees/cloudflare-deploy` (branch `cloudflare-deploy`, based on local `main`)
**Complexity**: Medium
**Status**: APPROVED — Phase 1 in progress. User confirmed H1/H2/H3 are in scope and that
`animalsvidadigna.org` is an active zone on the account.

## Execution log

- **Wave 1 (parallel, TDD)** — B1 Keystatic/Worker fix · B2–B4 wrangler config · H1+H3 typecheck & SSR guard
- **Wave 2** — H2 Biome (deferred: `biome migrate` may reformat files Wave 1 is editing)
- **Then** — Phase 2 deploy to workers.dev (requires user sign-off before the first real `wrangler deploy`)

## Summary

The Astro 5 site is already *configured* for Cloudflare (`@astrojs/cloudflare` adapter, a `wrangler.toml`,
R2 and rate-limit bindings) but has **never actually been deployed** — `.planning/PROJECT.md` still lists
"Cloudflare Workers deployment with R2 image storage" as unchecked, even though the roadmap treats it as
Phase 1 work. The existing config would fail on the first `wrangler deploy`. This plan fixes four
confirmed blockers, deploys to `*.workers.dev`, then attaches the custom domain and wires up Workers Builds.

## Decisions taken (user-confirmed)

| Decision | Choice |
|---|---|
| Remote repo | Archive old Next.js/Payload app, then force-push Astro site as new `main` |
| First target | `*.workers.dev`, custom domain as a second step |
| CI/CD | Workers Builds (GitHub-connected) |
| Resend | Deploy without the key; forms must fail gracefully; secret set as follow-up |

## Confirmed blockers (evidence-backed)

### B1 — Keystatic filesystem reader crashes the SSR API routes (CRITICAL)

`src/lib/keystatic.ts` calls `createReader(process.cwd(), config)`. That reader gets bundled into the
Worker and calls `node:fs/promises` at request time. Both `src/pages/api/contact.ts` and
`src/pages/api/adopt.ts` (`prerender = false`) call `reader.singletons.settings.read()` inside the POST
handler.

Reproduced live against the real build under `wrangler dev`:

```
POST /api/contact -> HTTP 500 {"success":false,"error":"server_error"}
stderr: Error: [unenv] fs.readFile is not implemented yet!
  at Object.readFile (dist/_worker.js/chunks/keystatic_*.mjs)
  at Object.read  (readItem -> singletons.settings.read)
  at Module.POST (dist/_worker.js/pages/api/contact.astro.mjs)
```

`nodejs_compat` does **not** help — workerd's unenv `fs` shim is a throwing stub. All other `reader`
usages are in prerendered pages (build-time, safe); only these two API routes break. Both forms on the
site are therefore non-functional in production today, independent of the Resend key.

**Fix**: generate the settings at build time into a plain module the API routes import, so no
`@keystatic/core` reader — and no `node:fs` — reaches the Worker bundle at all. Single source of truth
stays in Keystatic; the worker gets smaller as a side effect.

### B2 — `wrangler.toml` is missing the fields required to deploy (CRITICAL)

No `main`, no `[assets]`, no `[observability]`. `wrangler deploy` cannot produce a Worker from this file.

### B3 — R2 binding points at a bucket that does not exist (CRITICAL)

`wrangler.toml` binds `IMAGES_BUCKET` to `animals-vida-digna-images`. The account
(`6437933877bc012f250ad229cad358f8`) contains exactly one bucket: `dress-up`. Deploy fails on a missing
binding target.

Also, `grep -rn IMAGES_BUCKET src/ scripts/` returns **no references** — the binding is dead config.
`scripts/sync-images.ts` shells out to the wrangler CLI using the bucket *name*, not the binding, and
images currently ship as static assets from `public/images/`.

**Fix**: drop the binding. Re-add it, together with the bucket, only when something actually reads from R2.

### B4 — Rate-limit binding uses deprecated `unsafe` syntax (MEDIUM)

Rate Limiting reached GA on 2025-09-19; `[[unsafe.bindings]]` still works but is no longer correct.
Canonical form (`period` must be exactly 10 or 60; `namespace_id` is a string, unique per account):

```toml
[[ratelimits]]
name = "FORM_RATE_LIMITER"
namespace_id = "1001"
  [ratelimits.simple]
  limit = 5
  period = 60
```

## Open risk — image transformations (verify, don't assume)

`src/lib/image-utils.ts` emits `/cdn-cgi/image/format=auto,fit=cover,width=N,quality=80/<path>` URLs.
That is **Transform via URL**, enabled *per Cloudflare zone*. It is therefore unlikely to work on
`*.workers.dev` (not a zone you control) — meaning **every image may 404 on the workers.dev preview** and
only start working once `animalsvidadigna.org` is attached and Images → Transformations is enabled.

The docs did not settle (a) workers.dev behaviour, (b) whether a paid plan is still required — current
pricing reads as usage-based with a 5,000/month free allocation, which contradicts the older "Pro plan
required" rule, or (c) whether a disabled zone 404s or passes through. This plan **verifies it
empirically** in Phase 2/3 and adds a passthrough fallback if it fails, rather than guessing either way.

## Target `wrangler.toml`

```toml
name = "animals-vida-digna"
main = "dist/_worker.js/index.js"
compatibility_date = "2025-08-15"
compatibility_flags = ["nodejs_compat"]

[assets]
binding = "ASSETS"
directory = "./dist"

[observability]
enabled = true

[[ratelimits]]
name = "FORM_RATE_LIMITER"
namespace_id = "1001"
  [ratelimits.simple]
  limit = 5
  period = 60
```

## Phases

### Phase 0 — Preflight — ALREADY RUN, results below

| Check | Result |
|---|---|
| `pnpm install` | Clean, 694 packages, no peer warnings |
| `pnpm test` | **190 tests / 17 files, all passing** |
| Test coverage tooling | **None configured** — no `@vitest/coverage-*`, no `test.coverage` block. The 80% standard is unmeasured |
| `npx tsc --noEmit` | **84 errors** (see H1 below) |
| `npx biome check .` | **Hard config failure — no lint ran at all** (see H2) |
| Production build | Succeeds, 12 HTML pages |
| Worker bundle | 323 KB gzipped — far under the 3 MiB free-plan limit ✅ |
| Markdoc in prod | Safe — `src/lib/markdoc.ts` uses `@markdoc/markdoc` directly, not the excluded Astro integration. Rendered prose verified in `dist/cat/garfield/index.html` |
| `/keystatic` admin in prod | **Not exposed** ✅ — `astro build` self-forces `NODE_ENV=production`, so the integration never loads and no keystatic route lands in `dist/_worker.js/pages/` |
| `.env` secrets | Never committed; `.gitignore` covers it. History hits are placeholder values in old `.env.example` files ✅ |

### Newly surfaced issues (not deploy-blocking, but in scope to decide on)

**H1 — TypeScript checking is silently broken for every Preact island.**
`tsconfig.json` extends `astro/tsconfigs/strict`, which sets `jsx: preserve` but never sets
`jsxImportSource: "preact"`. So `tsc` checks the `.tsx` islands against *React's* JSX types, where `class`
isn't valid. 74 of the 84 errors are `Property 'class' does not exist... Did you mean 'className'?` across
`AdoptionForm`, `CatFilters`, `ContactForm`, `LanguageSwitcher`, `DonateSticky`. `astro build` is fine
(Vite handles the transform), but type-checking catches nothing in those files today. One-line fix.
Remaining: 9 in `keystatic.config.tsx` (preview field typing) and 1 genuine bug in `tests/donate.test.ts:63`.

**H2 — Biome is entirely non-functional.** `biome.json` declares schema `2.0.0` against CLI `2.4.7`, and
sets `nursery.noSecrets`, which no longer exists. `biome check` exits on config error before linting
anything. Fix with `biome migrate` plus dropping the dead rule.

**H3 — Latent build fragility.** `NODE_ENV=development npx astro build` fails outright:
`Unable to render DonateSticky!` — with both `@astrojs/react` and `@astrojs/preact` registered, the island
is SSR'd by the wrong renderer and its unguarded `window`/`document` access throws. Currently masked
because `astro build` overrides `NODE_ENV` itself. A CI step that force-exports `NODE_ENV=development`
would break the build *and* expose `/keystatic`. Worth guarding, since Workers Builds is being introduced.

**H4 — Live credentials on disk (outside this worktree).** The main repo root `.env` holds what look like
**real** Neon Postgres, Vercel Blob, and Payload credentials from the retired stack. Not a git-exposure
risk (never committed), but that stack is being decommissioned — recommend rotating and deleting them.
Flagged for you; I won't touch it without instruction.

### Phase 1 — Fix the blockers (TDD, per `/ecc:tdd-workflow`)

1. **B1** — failing test first: assert the API route resolves `contactEmail` without touching `fs`. Then
   add a build-time settings module plus a prebuild step; then make both routes import it. Verify by
   re-running the live `wrangler dev` POST that currently 500s.
2. **B2/B3/B4** — rewrite `wrangler.toml` to the target above. Add a config test asserting `main`,
   `[assets].directory`, absence of `unsafe`, and that every declared binding is actually read by `src/`.
3. Add `public/.assetsignore` (`_worker.js`, `_routes.json`) as a low-risk safety net.
4. Add `deploy`/`preview` npm scripts and `.dev.vars.example`; gitignore `.dev.vars`.
5. **H1** — add `"jsxImportSource": "preact"` to `tsconfig.json`; re-run `tsc --noEmit` and fix the residual
   `keystatic.config.tsx` typings and the real `tests/donate.test.ts:63` bug.
6. **H2** — `biome migrate`, drop the removed `nursery.noSecrets` rule, get `biome check` running, then fix
   what it reports.
7. **H3** — guard `DonateSticky` browser access behind a mount check so SSR can never throw.

Gate: `pnpm test` green, `tsc --noEmit` clean, `biome check` clean, prod build succeeds,
`npx wrangler deploy --dry-run` clean.

### Phase 2 — Deploy to workers.dev

- `npx wrangler deploy`
- Smoke test: `/`, `/es/`, a cat detail page, `/cats`, `/contact`, `robots.txt`, `sitemap-0.xml`
- POST `/api/contact` → expect a **handled** 500 `{"error":"server_error"}` (no RESEND_API_KEY yet), not
  an unhandled `fs.readFile` crash. This is the acceptance criterion for B1 actually being fixed.
- Record whether `/cdn-cgi/image/...` resolves here

### Phase 3 — Custom domain

- `animalsvidadigna.org` is an active zone on the account — **confirmed by the user**
- Attach via `[[routes]] pattern = "animalsvidadigna.org", custom_domain = true`
- Decide www vs apex redirect (Custom Domains match the exact hostname only)
- Enable Images → Transformations for the zone; re-test image URLs; implement the fallback if needed

### Phase 4 — Repo + CI/CD

- **Archive first**: tag/branch the existing Next.js+Payload `origin/main` as `legacy/payload-nextjs` and
  verify it exists on the remote *before* any force-push
- Force-push the Astro site as the new `main`
- Connect Workers Builds — build `pnpm build`, deploy `npx wrangler deploy`; the dashboard Worker name
  must match `name` in `wrangler.toml`
- Verify a push triggers a build and a PR produces a preview

### Phase 5 — Follow-ups (explicitly out of scope for the first deploy)

- `wrangler secret put RESEND_API_KEY` — you run it; the key must not pass through this session
- Resend domain verification (SPF/DKIM) for animalsvidadigna.org
- Decide whether `/keystatic` admin should be reachable in production
- Remove the stale `.env` from the working tree
- Update `.planning/PROJECT.md` and `ROADMAP.md` to reflect deployment actually happening

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Image transforms dead on workers.dev | High | Verify in Phase 2; custom domain is the real test; fallback to plain paths |
| Image transforms need a paid plan | Medium | Check the dashboard before relying on it; fallback keeps the site usable |
| ~~Worker bundle over free-plan limit~~ | Resolved | 323 KB gzipped, ~10× headroom |
| ~~Prod build drops markdoc and breaks content~~ | Resolved | Markdoc used as a direct dependency, not the integration |
| ~~`/keystatic` admin exposed in prod~~ | Resolved | Integration never loads in a real build; verified absent from `dist` |
| Force-push destroys the old app | Low | Archive to `legacy/payload-nextjs` and verify on the remote first |
| CI sets `NODE_ENV=development` → build breaks + admin exposed | Low | H3 guard in Phase 1; pin the Workers Builds env |

## Acceptance

- [ ] `pnpm test` green; production build succeeds
- [ ] Site live and browsable on `*.workers.dev` in both locales
- [ ] `/api/contact` returns a handled response, not an `fs.readFile` crash
- [ ] `animalsvidadigna.org` serves the site over HTTPS
- [ ] Image URLs resolve, or a documented fallback is in place
- [ ] Old Next.js app archived; a push to `main` triggers an automatic deploy
