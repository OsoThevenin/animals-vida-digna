---
phase: 04-seo-accessibility-performance
plan: 02
subsystem: ui
tags: [wcag, a11y, contrast, focus-visible, skip-link, aria, cls]

requires:
  - phase: 04-01
    provides: SEO markup and BaseLayout structure
provides:
  - WCAG AA contrast compliance for all brand color pairs
  - Global focus-visible ring styles
  - Skip-to-content link in CA/ES locales
  - Accessible mobile menu with ARIA attributes
  - OptimizedImage width/height for CLS prevention
affects: [04-seo-accessibility-performance]

tech-stack:
  added: []
  patterns: [focus-visible-layer, aria-expanded-toggle, skip-link-pattern]

key-files:
  created:
    - tests/a11y-contrast.test.ts
  modified:
    - src/styles/global.css
    - src/layouts/BaseLayout.astro
    - src/components/Header.astro
    - src/components/OptimizedImage.astro
    - src/components/landing/StatsSection.astro
    - src/components/cats/CatTraits.astro
    - src/pages/cat/[slug].astro
    - src/pages/es/cat/[slug].astro
    - src/i18n/ca.ts
    - src/i18n/es.ts

key-decisions:
  - "Replaced text-accent with text-primary-dark or text-primary on all surface backgrounds for AA compliance"
  - "Used HTML hidden attribute instead of CSS hidden class for mobile menu true accessibility"
  - "OptimizedImage width defaults to largest srcset width (1280); height is optional"

patterns-established:
  - "focus-visible: Global :focus-visible in @layer base for consistent keyboard focus ring"
  - "skip-link: sr-only + focus:not-sr-only pattern for skip-to-content"
  - "aria-toggle: aria-expanded/aria-hidden toggle with HTML hidden attribute"

requirements-completed: [A11Y-01, A11Y-02, A11Y-03, A11Y-04, A11Y-05]

duration: 3min
completed: 2026-03-19
---

# Phase 04 Plan 02: Accessibility Summary

**WCAG AA contrast fixes, focus-visible ring, skip-to-content link, accessible mobile menu ARIA, and OptimizedImage CLS prevention**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-19T12:49:06Z
- **Completed:** 2026-03-19T12:52:28Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- All text/background color pairs now pass WCAG AA 4.5:1 contrast ratio (fixed accent-on-surface from 1.93:1)
- Global focus-visible ring with primary color outline on all interactive elements
- Skip-to-content link in both CA and ES locales, hidden until Tab focus
- Mobile menu fully keyboard accessible with aria-expanded/aria-hidden toggle
- OptimizedImage outputs width attribute for CLS prevention

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Contrast ratio tests** - `7890279` (test)
2. **Task 1 (GREEN): Fix accent color usage** - `5c5e8e5` (fix)
3. **Task 2: Focus-visible, skip-link, ARIA menu, image dimensions** - `2118430` (feat)

## Files Created/Modified
- `tests/a11y-contrast.test.ts` - Programmatic WCAG AA contrast verification for all brand color pairs
- `src/styles/global.css` - Added :focus-visible outline rule in @layer base
- `src/layouts/BaseLayout.astro` - Skip-to-content link and id="main-content" on main
- `src/components/Header.astro` - aria-expanded, aria-controls, aria-hidden, hidden attribute toggle
- `src/components/OptimizedImage.astro` - width/height props and attributes on img
- `src/components/landing/StatsSection.astro` - text-accent -> text-primary-dark
- `src/components/cats/CatTraits.astro` - text-accent -> text-primary-dark
- `src/pages/cat/[slug].astro` - text-accent -> text-primary on back link
- `src/pages/es/cat/[slug].astro` - text-accent -> text-primary on back link
- `src/i18n/ca.ts` - Added a11y.skipToContent translation
- `src/i18n/es.ts` - Added a11y.skipToContent translation

## Decisions Made
- Replaced text-accent with text-primary-dark (8.20:1) or text-primary (5.30:1) depending on context
- Used HTML `hidden` attribute instead of CSS `hidden` class for mobile menu for true accessibility semantics
- OptimizedImage width defaults to largest srcset width; height is optional for callers that know aspect ratio

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed additional text-accent usages on surface backgrounds**
- **Found during:** Task 1 (contrast fix)
- **Issue:** Plan only mentioned StatsSection, but cat detail back links and CatTraits personality badges also used text-accent on surface backgrounds (1.93:1 ratio)
- **Fix:** Changed to text-primary (5.30:1) for links and text-primary-dark (8.20:1) for badges
- **Files modified:** src/pages/cat/[slug].astro, src/pages/es/cat/[slug].astro, src/components/cats/CatTraits.astro
- **Verification:** grep confirms no remaining text-accent on surface backgrounds
- **Committed in:** 5c5e8e5

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential for complete WCAG AA compliance. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Accessibility foundation complete, ready for performance optimization in plan 04-03
- All WCAG AA requirements met: contrast, focus, keyboard nav, alt text

---
*Phase: 04-seo-accessibility-performance*
*Completed: 2026-03-19*
