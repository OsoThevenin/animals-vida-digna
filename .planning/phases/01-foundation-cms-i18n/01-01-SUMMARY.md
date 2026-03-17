---
phase: 01-foundation-cms-i18n
plan: 01
subsystem: infra
tags: [astro, cloudflare, tailwind, vitest, preact, r2]

# Dependency graph
requires: []
provides:
  - Astro 5 project skeleton with Cloudflare Workers adapter
  - Tailwind v4 CSS-first brand theme with warm color palette
  - R2 bucket binding in wrangler.toml
  - Vitest test infrastructure with config and theme test scaffolds
  - Conditional Keystatic/React loading (dev-only)
  - i18n config for Catalan (default) and Spanish
affects: [01-02-PLAN, 01-03-PLAN, 02-pages-ui]

# Tech tracking
tech-stack:
  added: [astro@5.18.1, "@astrojs/cloudflare@12", tailwindcss@4, "@tailwindcss/vite@4", preact@10, "@astrojs/preact@4", vitest@4, wrangler@4, "@keystatic/core@0.5", "@keystatic/astro@5"]
  patterns: [conditional-integration-loading, css-first-tailwind-theme, static-with-adapter]

key-files:
  created: [astro.config.mjs, wrangler.toml, src/styles/global.css, src/pages/index.astro, src/env.d.ts, vitest.config.ts, tests/config.test.ts, tests/theme.test.ts]
  modified: [package.json, tsconfig.json, biome.json, .gitignore]

key-decisions:
  - "Downgraded @astrojs/preact to v4 and @astrojs/react to v4 for Astro 5 (Vite 6) compatibility -- v5 targets Astro 6 with Vite 7"
  - "Override @preact/preset-vite to 2.9.4 to fix 'meta in this' bug in 2.10.4 with Vite 6"
  - "Used warm brown/earth palette for brand colors since logo is black-and-white line art"

patterns-established:
  - "Conditional Keystatic: load @keystatic/astro + React + Markdoc only when NODE_ENV !== production"
  - "Tailwind v4 CSS-first: theme defined in @theme block in global.css, not JS config"
  - "No output:hybrid: Astro 5 uses default static + adapter, opt-in SSR per route"

requirements-completed: [FOUND-01, FOUND-02, FOUND-04]

# Metrics
duration: 5min
completed: 2026-03-18
---

# Phase 1 Plan 01: Project Scaffold Summary

**Astro 5 skeleton with Cloudflare adapter, Tailwind v4 warm brand theme, R2 binding, and Vitest scaffold with 18 passing tests**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-17T22:55:40Z
- **Completed:** 2026-03-18T00:01:35Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Complete rebuild from Next.js/Payload to Astro 5 with Cloudflare Workers deployment target
- Tailwind v4 CSS-first theme with warm brown/earth tone palette (primary, accent, surface, text)
- R2 bucket binding configured in wrangler.toml with nodejs_compat flag
- 18 passing Vitest tests covering config (FOUND-01, FOUND-04) and theme (FOUND-02) requirements

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Astro 5 project** - `7a387a6` (feat)
2. **Task 2: Vitest test scaffolds** - `8551233` (test)

## Files Created/Modified
- `astro.config.mjs` - Astro 5 config with Cloudflare adapter, conditional Keystatic, i18n, Tailwind vite plugin
- `wrangler.toml` - Cloudflare Workers config with R2 IMAGES_BUCKET binding
- `src/styles/global.css` - Tailwind v4 @theme with brand color palette and typography tokens
- `src/pages/index.astro` - Minimal placeholder page verifying theme integration
- `src/env.d.ts` - Astro client type reference
- `vitest.config.ts` - Vitest configuration
- `tests/config.test.ts` - FOUND-01 and FOUND-04 requirement tests (10 tests)
- `tests/theme.test.ts` - FOUND-02 requirement tests (8 tests)
- `package.json` - New Astro dependencies, scripts, pnpm overrides
- `tsconfig.json` - Astro strict config
- `biome.json` - Updated ignores for Astro project structure
- `.gitignore` - Added dist/ and .astro/

## Decisions Made
- Downgraded @astrojs/preact to v4 and @astrojs/react to v4 because v5 targets Astro 6 (Vite 7), incompatible with Astro 5 (Vite 6)
- Added pnpm override for @preact/preset-vite@2.9.4 to fix a `this` context bug in 2.10.4 during Vite 6's config phase
- Used warm brown/earth tone brand palette since the logo is black-and-white line art -- design choice from research suggestions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Downgraded Astro integration versions for Vite 6 compatibility**
- **Found during:** Task 1 (project scaffold)
- **Issue:** @astrojs/preact@5, @astrojs/react@5, @astrojs/markdoc@1 require Vite 7 (Astro 6). Build failed with "Cannot use 'in' operator to search for 'meta' in undefined" in @preact/preset-vite@2.10.4
- **Fix:** Downgraded to @astrojs/preact@4, @astrojs/react@4, @astrojs/markdoc@0.15 and added pnpm override @preact/preset-vite@2.9.4
- **Files modified:** package.json
- **Verification:** `pnpm build` exits 0
- **Committed in:** 7a387a6

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Version adjustment necessary for Astro 5 compatibility. No scope creep.

## Issues Encountered
None beyond the version compatibility issue documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Astro builds successfully, ready for Keystatic CMS schemas (Plan 02)
- i18n config in place, ready for routing implementation (Plan 03)
- Vitest infrastructure ready for additional test files

## Self-Check: PASSED

- All 8 created files verified on disk
- Both task commits (7a387a6, 8551233) verified in git log
- `pnpm build` exits 0
- `pnpm vitest run` exits 0 with 18/18 tests passing

---
*Phase: 01-foundation-cms-i18n*
*Completed: 2026-03-18*
