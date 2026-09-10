---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
stopped_at: Executing content-r2-pipeline phase-6-cutover-docs.md (docs task; deploy-time maintainer checklist still pending)
last_updated: "2026-09-10T09:41:15.000Z"
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 15
  completed_plans: 15
  content_r2_pipeline_phases: 7
  content_r2_pipeline_phases_completed_on_branch: 7
  content_r2_pipeline_deployed: false
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Visitors can discover adoptable cats and take action (adopt, donate, contact) in their language, with all content managed by non-technical shelter staff through Keystatic.
**Current focus:** content-r2-pipeline milestone, Phase 6 (cutover & docs) —
cats now managed through the `apps/admin` app (D1/R2), not Keystatic;
settings/landing/pages remain in Keystatic. Implementation is complete on
branch `worktree-content-r2-impl`; nothing is merged or deployed yet, and a
maintainer deploy-time checklist remains (see `docs/admin-runbook.md`).

## Current Position

Phase: 04 (seo-accessibility-performance) — status unchanged by this
milestone (see gap-closure plans 04-04..04-06 for its own status)
content-r2-pipeline: Phase 6 (cutover-docs) — all 7 phase documents
(phase-0 through phase-6) executed on the branch; deploy-time items
(remote D1 verification, live WAF matrix, browser click-through, `wrangler
secret list`, second Workers Builds project, GitHub collaborator removal)
deferred to the maintainer per `docs/admin-runbook.md`

## Performance Metrics

**Velocity:**

- Total plans completed: 5
- Average duration: 4min
- Total execution time: 0.33 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-cms-i18n | 3 | 11min | 4min |
| 02-public-pages-cats-directory | 2 | 9min | 4.5min |

**Recent Trend:**

- Last 5 plans: 01-01 (5min), 01-02 (3min), 01-03 (3min), 02-01 (5min), 02-02 (4min)
- Trend: stable

*Updated after each plan completion*
| Phase 03 P03 | 2min | 2 tasks | 5 files |
| Phase 03 P01 | 4min | 2 tasks | 16 files |
| Phase 03 P02 | 3min | 2 tasks | 7 files |
| Phase 03 P04 | 1min | 2 tasks | 5 files |
| Phase quick P260319-fuo | 15min | 3 tasks | 17 files |
| Phase 04 P01 | 5min | 2 tasks | 15 files |
| Phase 04 P02 | 3min | 2 tasks | 10 files |
| Phase 04 P03 | 1min | 2 tasks | 1 files |
| Phase 04 P04 | 1min | 1 tasks | 1 files |
| Phase 04 P05 | 3min | 2 tasks | 7 files |
| Phase 04 P06 | 1min | 1 tasks | 0 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: Coarse granularity -- 4 phases grouping infrastructure, pages, server features, and quality
- Research: Astro hybrid mode required for Keystatic admin (cannot use pure static)
- 01-01: Downgraded @astrojs/preact to v4, @astrojs/react to v4 for Astro 5 (Vite 6) compatibility
- 01-01: Override @preact/preset-vite to 2.9.4 to fix Vite 6 config() context bug
- 01-01: Brand palette uses warm brown/earth tones (design choice, logo is B&W)
- 01-03: Removed manual keystatic admin route -- integration injects its own routes in dev
- 01-03: LanguageSwitcher uses anchor tag for SEO and progressive enhancement
- 02-01: renderMarkdoc handles both async functions and resolved .node objects
- 02-01: DonateSticky uses Preact island with client:idle and 600px scroll threshold
- 02-01: CMS block rendering uses discriminant switch pattern in landing pages
- 02-02: Pure filter/route utilities extracted for testability outside Astro/Preact context
- 02-02: CatFilters Preact island owns rendering with noscript SSR fallback for SEO
- 02-02: Gallery uses Astro script tag with Tobii (not Preact island) for DOM-based lightbox
- 02-02: Spanish cat routes use slug_es with automatic keystatic slug fallback
- [Phase 03-03]: Pure image URL logic in src/lib/image-utils.ts for testability, imported by Astro component
- [Phase 03-03]: No picture element needed -- Cloudflare format=auto handles AVIF/WebP negotiation
- [Phase 03-03]: sync-images uses wrangler CLI (execSync) rather than aws4fetch SDK for simplicity
- [Phase 03-01]: Resend SDK dynamically imported in API endpoint to avoid build-time bundling issues
- [Phase 03-01]: Validation returns error keys not locale strings for API/client flexibility
- [Phase 03-01]: API endpoint pattern: prerender=false, FormData, honeypot, rate limiting, JSON response
- [Phase 03]: Adoption form uses accent color submit button and conditional status rendering with semantic colors
- [Phase 03]: CatFilters uses image-utils.ts directly since Preact islands cannot use Astro components
- [Phase 03]: Gallery lightbox links remain raw URLs; only thumbnails get OptimizedImage
- [Phase quick]: Used flat YAML format for cats collection matching Keystatic outer dataLocation (path without trailing slash)
- [Phase 04]: SEO pure functions in src/lib/seo.ts for testability, imported by BaseLayout and pages
- [Phase 04]: Replaced text-accent with text-primary-dark or text-primary on surface backgrounds for WCAG AA compliance
- [Phase 04]: HTML hidden attribute for mobile menu accessibility instead of CSS hidden class
- [Phase 04]: System-ui font stack with -apple-system, Segoe UI, Roboto fallbacks for cross-platform consistency
- [Phase 04]: Static robots.txt in public/ directory for Cloudflare SSR adapter crawler discoverability
- [Phase 04]: Hero image dimensions 1280x448 matching lg:max-h-[28rem] aspect ratio with fetchpriority=high
- [Phase 04]: DonateSticky changed from client:only to client:idle since SSR renders null (visible starts false)
- [Phase 04]: Auto-approved Lighthouse checkpoint per auto_advance config (build successful, all 04-05 fixes in place)
- [content-r2-pipeline Phase 1]: Converted to pnpm + Turborepo monorepo (`apps/web`, `apps/admin`, `packages/content`, `packages/design-system`)
- [content-r2-pipeline Phase 3]: Cats moved from Keystatic/git (`src/content/cats/`) to D1 (`avd-content`, tables `cats`/`cat_images`); public cat pages render on demand (`prerender = false`)
- [content-r2-pipeline Phase 4/5]: New `apps/admin` Astro app with better-auth `emailOTP` login (allowlist-based) and Astro Actions for cat CRUD and R2 image upload
- [content-r2-pipeline Phase 6]: Deleted the git-based cat pipeline leftovers and updated docs; volunteers' GitHub collaborator access removal is queued for the maintainer (human-only action, not yet performed — see `docs/admin-runbook.md`); Keystatic retained, maintainer-only, for settings/landing/pages

### Pending Todos

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260319-fuo | The landing page is not rendering anything. Cats listing page also. Check the previous phases implementation, some may have not finished it's implementation | 2026-03-19 | 8bf8cc4 | [260319-fuo-the-landing-page-is-not-rendering-anythi](./quick/260319-fuo-the-landing-page-is-not-rendering-anythi/) |

### Blockers/Concerns

- Research flagged Keystatic + Cloudflare adapter compatibility as needing deeper investigation in Phase 1
- RESOLVED: Tailwind v4 Astro integration works with @tailwindcss/vite in vite.plugins
- content-r2-pipeline: ADMIN-03 (no volunteer GitHub access) cannot be closed from this sandbox — no Cloudflare or GitHub credentials are available here. The maintainer must run the collaborator-removal steps in `docs/admin-runbook.md` ("Task 8: Remove volunteer GitHub collaborator access") along with the rest of the deploy-time checklist (remote D1 verification, live WAF matrix, browser click-through, `wrangler secret list`, second Workers Builds project) before this milestone can be considered shipped.

## Session Continuity

Last session: 2026-09-10T09:41:15.000Z
Stopped at: content-r2-pipeline Phase 6 (cutover-docs) — planning docs updated; maintainer deploy-time checklist still pending, nothing merged or deployed
Resume file: None
