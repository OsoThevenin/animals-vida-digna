---
phase: 02-public-pages-cats-directory
plan: 01
subsystem: ui
tags: [astro, markdoc, preact, keystatic, landing, cms, donate, tailwind]

# Dependency graph
requires:
  - phase: 01-foundation-cms-i18n
    provides: Keystatic schemas, i18n helpers, BaseLayout, Header, Footer
provides:
  - Markdoc-to-HTML rendering helper (renderMarkdoc)
  - 7 CMS-driven landing section components
  - FeaturedCatsSection reading featured cats from CMS
  - Reusable CatCard component
  - Sticky donate CTA Preact island
  - Donate URL wired from CMS settings to Header, Footer, and Hero
affects: [02-02-cats-directory, 02-03-static-pages, 03-server-features]

# Tech tracking
tech-stack:
  added: [@markdoc/markdoc, @midzer/tobii]
  patterns: [CMS block rendering via discriminant switch, markdoc content rendering, Preact island for scroll-based UI]

key-files:
  created:
    - src/lib/markdoc.ts
    - src/components/landing/HeroSection.astro
    - src/components/landing/AboutSection.astro
    - src/components/landing/StatsSection.astro
    - src/components/landing/ColoniesSection.astro
    - src/components/landing/AdoptSection.astro
    - src/components/landing/CollaborateSection.astro
    - src/components/landing/ContactCtaSection.astro
    - src/components/landing/FeaturedCatsSection.astro
    - src/components/cats/CatCard.astro
    - src/components/DonateSticky.tsx
    - tests/markdoc.test.ts
    - tests/landing.test.ts
    - tests/donate.test.ts
  modified:
    - src/pages/index.astro
    - src/pages/es/index.astro
    - src/layouts/BaseLayout.astro
    - src/components/Header.astro
    - src/components/Footer.astro
    - src/lib/keystatic.ts

key-decisions:
  - "renderMarkdoc handles both async functions and resolved objects with .node property for block content flexibility"
  - "DonateSticky uses Preact island with client:idle and 600px scroll threshold"
  - "CatCard is a standalone reusable component for use in featured section and future cats listing"

patterns-established:
  - "CMS block rendering: page reads singleton, iterates sections array, switch on discriminant to render correct component"
  - "Markdoc content: call renderMarkdoc in Astro frontmatter, use set:html in template"
  - "Donate URL prop chain: page reads settings -> passes donateUrl to BaseLayout -> Header/Footer"

requirements-completed: [LAND-01, LAND-02, LAND-03, LAND-04, LAND-05, LAND-06, LAND-07, CATS-05, DONA-01, DONA-02, DONA-03]

# Metrics
duration: 5min
completed: 2026-03-18
---

# Phase 2 Plan 01: Landing Page & Donate CTA Summary

**CMS-driven landing page with 7 section components, featured cats grid, markdoc rendering, and sticky donate CTA Preact island**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-18T08:34:36Z
- **Completed:** 2026-03-18T08:40:00Z
- **Tasks:** 3
- **Files modified:** 20

## Accomplishments
- Full CMS-driven landing page rendering all block types (hero, about, stats, colonies, adopt, collaborate, contactCta) in editor-defined order
- Markdoc content rendering helper supporting both async and resolved node shapes
- Donate URL from CMS settings wired into Header, Hero section, Footer, and sticky CTA
- Featured cats from CMS appear on homepage via FeaturedCatsSection with reusable CatCard
- DonateSticky Preact island with scroll-triggered visibility and reduced-motion support

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies, create markdoc helper, scaffold tests** - `29fcb55` (feat)
2. **Task 2: Create landing section components and wire CMS blocks** - `280676d` (feat)
3. **Task 3: Wire donate URL into Header/Footer, add sticky donate CTA** - `a9ee1b3` (feat)

## Files Created/Modified
- `src/lib/markdoc.ts` - Markdoc-to-HTML rendering helper with dual input shape support
- `src/components/landing/HeroSection.astro` - Hero with title, subtitle, image, adopt/donate CTAs
- `src/components/landing/AboutSection.astro` - Two-column about section with markdoc content
- `src/components/landing/StatsSection.astro` - Stat items grid with CMS-editable values
- `src/components/landing/ColoniesSection.astro` - Colony section with markdoc content and image
- `src/components/landing/AdoptSection.astro` - Adopt CTA section linking to cats page
- `src/components/landing/CollaborateSection.astro` - Collaborate section with markdoc and CTA
- `src/components/landing/ContactCtaSection.astro` - Contact CTA section with mailto link
- `src/components/landing/FeaturedCatsSection.astro` - Featured cats grid from CMS collection
- `src/components/cats/CatCard.astro` - Reusable cat card with image, name, status badge
- `src/components/DonateSticky.tsx` - Preact island sticky donate button on scroll
- `src/pages/index.astro` - Catalan landing page reading CMS blocks
- `src/pages/es/index.astro` - Spanish landing page reading CMS blocks
- `src/layouts/BaseLayout.astro` - Added donateUrl prop chain and DonateSticky island
- `src/components/Header.astro` - Added donateUrl prop, replaced hardcoded href
- `src/components/Footer.astro` - Added donateUrl prop and donate CTA link
- `src/lib/keystatic.ts` - Fixed import from @keystatic/core/reader
- `tests/markdoc.test.ts` - Unit tests for renderMarkdoc helper
- `tests/landing.test.ts` - Section map tests for all 9 block types
- `tests/donate.test.ts` - Donate URL reading and wiring tests

## Decisions Made
- renderMarkdoc handles both async functions (from collection/singleton fields) and resolved objects with `.node` property (from blocks) for flexibility
- DonateSticky uses client:idle for non-blocking hydration with 600px scroll threshold
- CatCard is standalone and reusable, prepared for use in both featured section and future cats listing page

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed @keystatic/reader import path**
- **Found during:** Task 2 (landing page build)
- **Issue:** `@keystatic/reader` is not a separate package; it's a subpath export of `@keystatic/core`
- **Fix:** Changed import to `@keystatic/core/reader` in `src/lib/keystatic.ts`
- **Files modified:** src/lib/keystatic.ts
- **Verification:** Build succeeds
- **Committed in:** 280676d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix was necessary for build to succeed. No scope creep.

## Issues Encountered
- Initial markdoc test used raw POJO nodes instead of Markdoc.parse() AST -- fixed by using Markdoc.parse() to generate proper AST nodes for tests

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- CatCard component ready for reuse in 02-02 cats directory listing
- Markdoc helper ready for use in 02-03 static pages
- Landing page structure complete, newsletter and FAQ sections have placeholder divs for v2
- Donate URL wiring pattern established for all future pages

## Self-Check: PASSED

All 14 created files verified. All 3 task commits verified (29fcb55, 280676d, a9ee1b3).

---
*Phase: 02-public-pages-cats-directory*
*Completed: 2026-03-18*
