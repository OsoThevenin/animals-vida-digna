---
phase: 02-public-pages-cats-directory
plan: 02
subsystem: ui
tags: [astro, preact, keystatic, cats, filters, gallery, tobii, markdoc, tailwind, i18n]

# Dependency graph
requires:
  - phase: 02-public-pages-cats-directory
    provides: CatCard component, renderMarkdoc helper, BaseLayout with donateUrl
provides:
  - Cats listing pages with SSR base and Preact filter island
  - Cat detail pages with traits sidebar, markdoc description, Tobii lightbox gallery
  - Pure filterCats utility for client-side cat filtering
  - Pure cat-routes utility for locale-specific slug path generation
  - CatTraits component for structured cat attribute display
  - CatGallery component with Tobii lightbox integration
  - 30+ i18n keys for cat traits, filter labels, personality values
affects: [03-server-features]

# Tech tracking
tech-stack:
  added: []
  patterns: [Preact island for client-side filtering with SSR noscript fallback, pure utility extraction for testability, Tobii lightbox via Astro script tag]

key-files:
  created:
    - src/lib/cat-filters.ts
    - src/lib/cat-routes.ts
    - src/components/cats/CatFilters.tsx
    - src/components/cats/CatTraits.astro
    - src/components/cats/CatGallery.astro
    - src/pages/cats/index.astro
    - src/pages/es/cats/index.astro
    - src/pages/cat/[slug].astro
    - src/pages/es/cat/[slug].astro
    - tests/cats-filter.test.ts
    - tests/cats-routes.test.ts
  modified:
    - src/i18n/ca.ts
    - src/i18n/es.ts

key-decisions:
  - "Extracted filterCats and cat-routes as pure functions for testability outside Astro/Preact context"
  - "CatFilters Preact island fully owns rendering when JS is available, noscript fallback for SEO crawlers"
  - "Gallery uses Astro script tag with Tobii (not a Preact island) since Tobii operates on DOM directly"
  - "Spanish cat detail routes use slug_es with automatic fallback to keystatic slug when empty"

patterns-established:
  - "Filter island pattern: pure filter logic in lib, Preact island consumes via import, translations passed as serializable prop object"
  - "Locale-specific routing: pure path generation functions per locale, used in getStaticPaths"
  - "Lightbox pattern: Tobii initialized via Astro client script, not Preact island"

requirements-completed: [CATS-01, CATS-02, CATS-03, CATS-04]

# Metrics
duration: 4min
completed: 2026-03-18
---

# Phase 2 Plan 02: Cats Directory Summary

**Cats listing with Preact filter island (status/gender/personality), detail pages with traits sidebar, markdoc descriptions, and Tobii lightbox gallery across CA/ES locales**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-18T08:43:45Z
- **Completed:** 2026-03-18T08:48:00Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Cats listing pages at /cats and /es/cats with client-side filtering by status, gender, and personality via Preact island
- Cat detail pages at /cat/[slug] and /es/cat/[slug] with cover image, traits sidebar, markdoc description, and Tobii lightbox gallery
- SSR noscript fallback ensures all cat cards are crawlable by search engines
- 16 unit tests covering filter logic (10) and route generation (6), all passing alongside existing 88 tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Cats listing with SSR base and Preact filter island** - `589455b` (test/feat)
2. **Task 2: Cat detail pages with traits, gallery, markdoc** - `1160a9d` (feat)

## Files Created/Modified
- `src/lib/cat-filters.ts` - Pure filterCats function with AND logic for status/gender/personality
- `src/lib/cat-routes.ts` - Pure path generation for CA (keystatic slug) and ES (slug_es with fallback)
- `src/components/cats/CatFilters.tsx` - Preact island with filter dropdowns and filtered card grid
- `src/components/cats/CatTraits.astro` - Traits display with status badge, personality pills, medical checkmarks
- `src/components/cats/CatGallery.astro` - Gallery grid with Tobii lightbox, reduced-motion support
- `src/pages/cats/index.astro` - Catalan cats listing with CatFilters island and noscript fallback
- `src/pages/es/cats/index.astro` - Spanish cats listing
- `src/pages/cat/[slug].astro` - Catalan cat detail with traits, description, gallery
- `src/pages/es/cat/[slug].astro` - Spanish cat detail with locale-specific slug routing
- `src/i18n/ca.ts` - Added 30+ keys for cat traits, filter labels, personality values
- `src/i18n/es.ts` - Spanish translations for all new keys
- `tests/cats-filter.test.ts` - 10 unit tests for filter logic
- `tests/cats-routes.test.ts` - 6 unit tests for route generation

## Decisions Made
- Extracted filterCats and cat-routes as pure functions for testability outside Astro/Preact context
- CatFilters Preact island fully owns rendering when JS available; noscript fallback ensures SEO crawlability
- Gallery uses Astro script tag with Tobii (not Preact island) since Tobii operates directly on DOM elements
- Spanish cat detail routes use slug_es with automatic fallback to keystatic slug when empty/undefined
- Translations passed to Preact island as a serializable object prop since islands cannot use t() function directly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All cat directory pages complete and building successfully
- Filter island pattern established for potential reuse in future collection listings
- Tobii lightbox pattern available for any future gallery needs
- 104 total tests passing across the project

## Self-Check: PASSED

All 11 created files verified. Both task commits verified (589455b, 1160a9d).

---
*Phase: 02-public-pages-cats-directory*
*Completed: 2026-03-18*
