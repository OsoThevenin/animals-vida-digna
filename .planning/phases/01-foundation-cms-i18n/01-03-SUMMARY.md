---
phase: 01-foundation-cms-i18n
plan: 03
subsystem: i18n
tags: [i18n, preact, astro, tailwind, routing, language-switcher]

# Dependency graph
requires:
  - "01-01: Astro 5 skeleton with i18n config, Tailwind theme, Preact integration"
  - "01-02: Keystatic CMS schemas with _ca/_es localized fields, reader API"
provides:
  - Locale type, t() translation function, getLocaleFromUrl(), getAlternateUrl()
  - Catalan and Spanish UI string dictionaries (40+ keys each)
  - Locale-aware content field readers (getLocalizedField, getLocalizedCat)
  - LanguageSwitcher Preact island component
  - BaseLayout with locale-aware HTML lang attribute
  - Sticky header with nav, donate CTA, mobile menu
  - Footer with brand info and navigation
  - Bilingual index pages (/ for CA, /es for ES)
affects: [02-pages-ui, 03-server-features]

# Tech tracking
tech-stack:
  added: []
  patterns: [locale-from-url, path-based-i18n-routing, preact-island-client-load, locale-suffixed-content-fields]

key-files:
  created: [src/i18n/index.ts, src/i18n/ca.ts, src/i18n/es.ts, src/i18n/content.ts, src/components/LanguageSwitcher.tsx, src/components/Header.astro, src/components/Footer.astro, src/layouts/BaseLayout.astro, src/pages/es/index.astro, tests/i18n.test.ts]
  modified: [src/pages/index.astro]

key-decisions:
  - "Removed manual keystatic admin route -- @keystatic/astro integration injects its own routes in dev mode, manual route caused build failure in production"
  - "LanguageSwitcher uses anchor tag (not button) for proper SEO and progressive enhancement"

patterns-established:
  - "i18n pattern: getLocaleFromUrl(Astro.url) in layouts/pages to derive locale, pass to t() for UI strings"
  - "Content localization: getLocalizedField(entry, fieldName, locale) reads entry[fieldName_locale]"
  - "Island pattern: Preact components with client:load for interactive UI (language switcher)"
  - "Layout composition: BaseLayout > Header + slot + Footer, locale prop threading"

requirements-completed: [I18N-01, I18N-02, I18N-03, I18N-04, I18N-05]

# Metrics
duration: 3min
completed: 2026-03-18
---

# Phase 1 Plan 03: i18n Routing & Base Layout Summary

**Bilingual path-based i18n with typed dictionaries, Preact language switcher island, and base layout with sticky header/footer using brand theme**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-18T08:07:14Z
- **Completed:** 2026-03-18T08:10:42Z
- **Tasks:** 3 (2 auto + 1 auto-approved checkpoint)
- **Files modified:** 11

## Accomplishments
- Complete i18n module: Locale type, t() function, URL helpers, content field readers -- all fully typed
- 40+ UI string keys in CA and ES dictionaries covering navigation, CTAs, cat fields, footer
- LanguageSwitcher Preact island (1.11 kB bundled) with client:load directive
- BaseLayout with sticky backdrop-blur header, responsive mobile menu, brand-themed footer
- Both / (Catalan) and /es (Spanish) index pages build and render correctly
- 67 total tests passing (19 i18n + 18 config/theme + 11 CMS schema + 19 other)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create i18n module with translation dictionaries, helpers, and content reader** - `aae4bbd` (feat)
2. **Task 2: Create base layout, header, footer, language switcher, and bilingual index pages** - `ed84cc7` (feat)
3. **Task 3: Verify Phase 1 foundation end-to-end** - auto-approved (checkpoint)

## Files Created/Modified
- `src/i18n/index.ts` - Locale type, t(), getLocaleFromUrl(), getAlternateUrl() exports
- `src/i18n/ca.ts` - Catalan UI string dictionary (40+ keys)
- `src/i18n/es.ts` - Spanish UI string dictionary (matching keys)
- `src/i18n/content.ts` - getLocalizedField() and getLocalizedCat() content helpers
- `src/components/LanguageSwitcher.tsx` - Preact island for language switching
- `src/components/Header.astro` - Sticky header with logo, nav, donate CTA, mobile menu
- `src/components/Footer.astro` - Footer with brand info, nav links, social placeholders
- `src/layouts/BaseLayout.astro` - Base HTML layout with locale-aware lang attribute
- `src/pages/index.astro` - Catalan root landing placeholder (updated to use BaseLayout)
- `src/pages/es/index.astro` - Spanish landing placeholder
- `tests/i18n.test.ts` - 19 tests covering I18N-01 through I18N-05 + content helpers

## Decisions Made
- Removed the manual `src/pages/keystatic/[...params].astro` admin route because `@keystatic/astro` integration automatically injects admin routes in dev mode, and the manual route's import of `@keystatic/astro/internal` broke production builds (exports map mismatch)
- LanguageSwitcher renders as an anchor tag rather than a button for proper SEO crawling and progressive enhancement

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed broken keystatic admin route**
- **Found during:** Task 2 (build verification)
- **Issue:** `src/pages/keystatic/[...params].astro` imported `@keystatic/astro/internal` which is not in the package's exports map, causing `pnpm build` to fail with "Missing ./internal specifier"
- **Fix:** Removed the manual route file. The `@keystatic/astro` integration already injects admin routes automatically when loaded (dev mode only).
- **Files modified:** Deleted `src/pages/keystatic/[...params].astro`
- **Verification:** `pnpm build` exits 0, both locale pages generated
- **Committed in:** ed84cc7 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Pre-existing issue from plan 01-02 that only surfaced during build. No scope creep.

## Issues Encountered
None beyond the keystatic route issue documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 1 (Foundation, CMS & i18n) is complete
- i18n infrastructure ready for all page templates in Phase 2
- Content helpers ready for reading localized CMS data
- BaseLayout, Header, Footer ready for page composition
- All 67 tests passing across config, theme, CMS schema, and i18n requirements

## Self-Check: PASSED

- All 11 created/modified files verified on disk
- Both task commits (aae4bbd, ed84cc7) verified in git log
- `pnpm build` exits 0 with both locale pages generated
- `pnpm vitest run` exits 0 with 67/67 tests passing

---
*Phase: 01-foundation-cms-i18n*
*Completed: 2026-03-18*
