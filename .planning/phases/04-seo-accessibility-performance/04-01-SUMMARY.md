---
phase: 04-seo-accessibility-performance
plan: 01
subsystem: seo
tags: [canonical, opengraph, hreflang, json-ld, sitemap, robots, i18n-seo]

# Dependency graph
requires:
  - phase: 01-foundation-cms-i18n
    provides: i18n system with getLocaleFromUrl, getAlternateUrl
  - phase: 02-public-pages-cats-directory
    provides: page templates (landing, cats, cat detail, contact)
provides:
  - Pure SEO utility library (src/lib/seo.ts) with canonical, OG, hreflang, JSON-LD builders
  - BaseLayout SEO head tags (canonical, hreflang, OG, JSON-LD Organization)
  - Cat detail JSON-LD Thing structured data
  - Sitemap with i18n hreflang alternates
affects: [04-seo-accessibility-performance]

# Tech tracking
tech-stack:
  added: ["@astrojs/sitemap"]
  patterns: ["SEO pure functions imported by layout/pages", "BaseLayout as single SEO integration point"]

key-files:
  created:
    - src/lib/seo.ts
    - tests/seo-meta.test.ts
    - tests/json-ld.test.ts
  modified:
    - src/layouts/BaseLayout.astro
    - astro.config.mjs
    - src/pages/index.astro
    - src/pages/es/index.astro
    - src/pages/cats/index.astro
    - src/pages/es/cats/index.astro
    - src/pages/contact.astro
    - src/pages/es/contact.astro
    - src/pages/cat/[slug].astro
    - src/pages/es/cat/[slug].astro

key-decisions:
  - "SEO functions are pure (no Astro runtime), enabling unit testing with Vitest"
  - "x-default hreflang always points to CA variant (default locale)"
  - "Sitemap placed outside NODE_ENV conditional so it runs in production"

patterns-established:
  - "SEO pure functions: all URL/meta construction in src/lib/seo.ts, imported by layout and pages"
  - "BaseLayout as single SEO integration point: pages pass canonicalUrl, alternateUrl, jsonLd props"

requirements-completed: [SEO-01, SEO-02, SEO-03, SEO-04, SEO-05, SEO-06]

# Metrics
duration: 5min
completed: 2026-03-19
---

# Phase 04 Plan 01: SEO Markup Summary

**Complete SEO markup with canonical URLs, OG tags, hreflang alternates, JSON-LD Organization/Thing, and @astrojs/sitemap with i18n hreflang entries**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-19T12:42:13Z
- **Completed:** 2026-03-19T12:47:03Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Pure SEO utility library with 27 unit tests covering CA/ES locale variants
- BaseLayout renders canonical, hreflang (self + alternate + x-default), OG meta, JSON-LD Organization on every page
- Cat detail pages include JSON-LD Thing structured data with inLanguage
- @astrojs/sitemap generates xhtml:link hreflang alternates in sitemap XML
- All 8 page templates pass canonicalUrl and alternateUrl to BaseLayout

## Task Commits

Each task was committed atomically:

1. **Task 1: Create seo.ts utility library and unit tests** - `9fd7046` (test)
2. **Task 2: Extend BaseLayout with SEO head tags, update all pages, add sitemap** - `7fff829` (feat)

## Files Created/Modified
- `src/lib/seo.ts` - Pure functions: buildCanonicalUrl, buildOgMeta, buildHreflangLinks, buildOrganizationSchema, buildCatSchema
- `tests/seo-meta.test.ts` - 20 unit tests for URL/meta/hreflang functions
- `tests/json-ld.test.ts` - 7 unit tests for JSON-LD Organization and Thing schemas
- `src/layouts/BaseLayout.astro` - Extended with canonical, hreflang, OG, JSON-LD head tags
- `astro.config.mjs` - Added @astrojs/sitemap with i18n config
- `src/pages/index.astro` - Passes canonicalUrl/alternateUrl to BaseLayout
- `src/pages/es/index.astro` - Passes canonicalUrl/alternateUrl to BaseLayout
- `src/pages/cats/index.astro` - Passes canonicalUrl/alternateUrl/description to BaseLayout
- `src/pages/es/cats/index.astro` - Passes canonicalUrl/alternateUrl/description to BaseLayout
- `src/pages/contact.astro` - Passes canonicalUrl/alternateUrl/description to BaseLayout
- `src/pages/es/contact.astro` - Passes canonicalUrl/alternateUrl/description to BaseLayout
- `src/pages/cat/[slug].astro` - Passes canonicalUrl/alternateUrl/jsonLd (cat Thing) to BaseLayout
- `src/pages/es/cat/[slug].astro` - Passes canonicalUrl/alternateUrl/jsonLd (cat Thing) to BaseLayout

## Decisions Made
- SEO functions are pure (no Astro runtime dependency) for easy unit testing
- x-default hreflang always points to CA variant (Catalan is default locale)
- Sitemap integration placed outside NODE_ENV conditional to ensure production availability
- Cats listing and contact pages now pass description prop (previously missing) for OG meta

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All SEO markup in place, ready for accessibility (04-02) and performance (04-03) plans
- Sitemap and robots.txt serve correctly in production build

---
*Phase: 04-seo-accessibility-performance*
*Completed: 2026-03-19*
