---
phase: 04-seo-accessibility-performance
verified: 2026-03-19T14:35:00Z
status: human_needed
score: 20/21 must-haves verified
re_verification: true
  previous_status: gaps_found
  previous_score: 13/15
  gaps_closed:
    - "robots.txt is generated with Sitemap URL — public/robots.txt now exists with correct content"
    - "Hero image (LCP element) has fetchpriority=high, explicit width/height, and uses OptimizedImage for srcset"
    - "All landing section images use OptimizedImage or have explicit width/height to prevent CLS"
    - "Tobii lightbox JS is lazy-loaded only when gallery exists on the page"
    - "No render-blocking resources in the critical path (no client:only, no static Tobii import)"
    - "CatFilters images have explicit width/height attributes"
  gaps_remaining:
    - "Lighthouse Performance/Accessibility/Best Practices/SEO >= 95 on mobile — requires human audit"
  regressions: []
human_verification:
  - test: "Lighthouse audit on CA and ES landing pages"
    expected: "All 4 categories (Performance, Accessibility, Best Practices, SEO) >= 95 on mobile"
    why_human: "Plan 04-06 was auto-approved a second time with 'build confirmed successful' — no actual Lighthouse scores were recorded by a human. All technical prerequisites are now in place (fetchpriority on LCP image, CLS-free images, lazy Tobii, deferred hydration, system fonts, SEO markup, ARIA) but scores require a real browser run."
  - test: "Keyboard navigation: Tab through landing page"
    expected: "First Tab reveals skip-to-content link visually; all interactive elements show focus rings; mobile hamburger menu toggles correctly when activated via keyboard"
    why_human: "Focus ring visibility and keyboard flow require a real browser."
---

# Phase 04: SEO, Accessibility, and Performance Verification Report

**Phase Goal:** The site meets all SEO, accessibility, and performance standards — full hreflang/structured data, WCAG AA compliance, and Lighthouse 95+ on all categories.
**Verified:** 2026-03-19T14:35:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (plans 04-04, 04-05, 04-06)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every page has `<link rel='canonical'>` pointing to its own absolute URL | VERIFIED | `BaseLayout.astro` line 53: `<link rel="canonical" href={resolvedCanonical} />`. All 8 page files pass `canonicalUrl` via `buildCanonicalUrl`. |
| 2 | Every page has og:title, og:description, og:url, og:locale, og:locale:alternate meta tags | VERIFIED | `BaseLayout.astro` renders `buildOgMeta()` output. All pages pass `description` prop. 11 OG tests pass. |
| 3 | Every page has self-referencing hreflang, alternate hreflang, and x-default hreflang links | VERIFIED | `BaseLayout.astro` maps `buildHreflangLinks()` output (3 entries: self, alternate, x-default). 7 hreflang unit tests pass. |
| 4 | Sitemap XML includes xhtml:link hreflang alternates for all pages in both locales | VERIFIED | `astro.config.mjs` adds `sitemap()` with `i18n` config outside the `NODE_ENV !== 'production'` block. Previously confirmed `dist/sitemap-0.xml` contains `xhtml:link rel="alternate"` entries. |
| 5 | robots.txt is served at /robots.txt with correct User-agent, Allow, and Sitemap directives | VERIFIED | `public/robots.txt` exists. Hex dump confirms: `User-agent: *\nAllow: /\nSitemap: https://animalsvidadigna.org/sitemap-index.xml` (no trailing newline). All 3 required lines present. Gap from initial verification CLOSED. |
| 6 | Cat detail pages have JSON-LD Thing structured data with inLanguage | VERIFIED | Both `src/pages/cat/[slug].astro` and `src/pages/es/cat/[slug].astro` import `buildCatSchema`, construct `catJsonLd` with `inLanguage: locale`, and pass `jsonLd={catJsonLd}` to BaseLayout. 2 JSON-LD tests pass. |
| 7 | BaseLayout has JSON-LD Organization structured data site-wide | VERIFIED | `BaseLayout.astro` calls `buildOrganizationSchema()` unconditionally and renders it as `<script type="application/ld+json">`. 3 Organization JSON-LD tests pass. |
| 8 | All text/background color combinations pass WCAG AA contrast (4.5:1 normal) | VERIFIED | `tests/a11y-contrast.test.ts` verifies 5 passing pairs (text/surface: 15.64, text-muted/surface: 6.16, primary/surface: 5.30, primary-dark/surface: 8.20, text/accent: 8.10). `StatsSection.astro` uses `text-primary-dark`. |
| 9 | All interactive elements show visible focus ring on keyboard Tab | VERIFIED | `src/styles/global.css` `@layer base { :focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; } }`. Applies globally. |
| 10 | Skip-to-content link appears on Tab and jumps to main content | VERIFIED | `BaseLayout.astro`: `<a href="#main-content" class="sr-only focus:not-sr-only ...">` as first child of body. `<main id="main-content" class="flex-1">`. Translations present in `ca.ts` and `es.ts`. |
| 11 | Mobile menu button has aria-expanded, menu has aria-hidden, menu links not focusable when hidden | VERIFIED | `Header.astro`: `aria-expanded="false"`, `aria-controls="mobile-menu"`, `hidden aria-hidden="true"` on menu div. Script toggles `aria-expanded`, `aria-hidden`, and HTML `hidden` attribute on click. |
| 12 | All img tags have non-empty alt attributes | VERIFIED | `OptimizedImage.astro` requires `alt` prop. No `<img` without `alt=` in source `.astro` files. Logo: `alt="Animals Vida Digna"`. Gallery: `img.alt || cat.name + index`. |
| 13 | Gallery lightbox has reduced-motion support | VERIFIED | `CatGallery.astro` lines 35-39: `@media (prefers-reduced-motion: reduce) { .lightbox img { transition: none !important; } }`. |
| 14 | Font stack uses system-ui only — no Inter/Poppins | VERIFIED | `src/styles/global.css`: `--font-family-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;` and same for `--font-family-display`. No "Inter" or "Poppins" strings. |
| 15 | Hero image (LCP element) has fetchpriority=high, explicit width/height, and uses OptimizedImage | VERIFIED | `HeroSection.astro` imports and uses `<OptimizedImage fetchpriority="high" width={1280} height={448} loading="eager" sizes="(max-width: 1024px) 100vw, 50vw">`. `OptimizedImage.astro` Props includes `fetchpriority?: 'high' \| 'low' \| 'auto'`. Gap from initial verification CLOSED. |
| 16 | All landing section images use OptimizedImage with explicit width/height to prevent CLS | VERIFIED | `AboutSection.astro` and `ColoniesSection.astro` both import and use `<OptimizedImage width={640} height={480} loading="lazy" sizes="...">`. Gap from initial verification CLOSED. |
| 17 | Tobii lightbox JS is lazy-loaded only when gallery exists on the page | VERIFIED | `CatGallery.astro` script uses `async function initLightbox()` with `await Promise.all([import('@midzer/tobii'), import('@midzer/tobii/dist/tobii.min.css')])`. No static top-level Tobii import anywhere in source. Gap from initial verification CLOSED. |
| 18 | CatFilters images have explicit width/height attributes | VERIFIED | `CatFilters.tsx` line 142-143: `width={1280}` and `height={960}` on img tags (4:3 aspect ratio matching `aspect-[4/3]` container). Gap from initial verification CLOSED. |
| 19 | DonateSticky uses client:idle — no client:only directives remain | VERIFIED | `BaseLayout.astro` line 76: `<DonateSticky client:idle ...>`. Grep confirms no `client:only` in any `.astro` file. Gap from initial verification CLOSED. |
| 20 | No render-blocking resources in the critical path | VERIFIED | No static Tobii import. No `client:only` directives. No web font `<link>` preload. All non-critical JS is dynamically imported or deferred. |
| 21 | Lighthouse Performance/Accessibility/Best Practices/SEO >= 95 on mobile | NEEDS HUMAN | Plan 04-06 was auto-approved a second time with "build confirmed successful" — no actual Lighthouse scores were recorded. All technical prerequisites are in place (fetchpriority on LCP image, CLS-prevented, lazy Tobii, deferred hydration, system fonts, SEO markup, ARIA, robots.txt). Actual scores require human audit. |

**Score:** 20/21 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/seo.ts` | Pure SEO functions | VERIFIED | Exports `buildCanonicalUrl`, `buildOgMeta`, `buildHreflangLinks`, `buildOrganizationSchema`, `buildCatSchema`. 112 lines, fully substantive. |
| `src/layouts/BaseLayout.astro` | SEO meta tags in `<head>`, skip-to-content, DonateSticky client:idle | VERIFIED | Contains canonical, hreflang, OG meta, JSON-LD, skip-to-content, `id="main-content"`, `client:idle` for DonateSticky. |
| `tests/seo-meta.test.ts` | Unit tests for SEO pure functions | VERIFIED | 20 tests covering canonical, hreflang (CA/ES, x-default), og meta. All pass. |
| `tests/json-ld.test.ts` | Unit tests for JSON-LD | VERIFIED | 7 tests covering Organization and Thing (cat schema with inLanguage). All pass. |
| `tests/a11y-contrast.test.ts` | Contrast ratio verification | VERIFIED | 11 tests; 8 brand color pairs verified. All pass. 38 total tests across 3 files pass. |
| `src/styles/global.css` | `:focus-visible` rule and system-ui fonts | VERIFIED | `@layer base { :focus-visible { ... } }` present. Font variables use `system-ui` stack. No Inter/Poppins. |
| `src/components/Header.astro` | Accessible mobile menu with aria-expanded | VERIFIED | `aria-expanded="false"`, `aria-controls="mobile-menu"`, `hidden aria-hidden="true"` on menu div. Script toggles all ARIA attributes. |
| `src/components/OptimizedImage.astro` | `width`, `height`, and `fetchpriority` props on img | VERIFIED | Props interface includes `width?: number`, `height?: number`, `fetchpriority?: 'high' \| 'low' \| 'auto'`. All rendered conditionally. |
| `src/components/landing/HeroSection.astro` | LCP image with fetchpriority=high, OptimizedImage, dimensions | VERIFIED | Uses `<OptimizedImage fetchpriority="high" width={1280} height={448} loading="eager">`. |
| `src/components/landing/AboutSection.astro` | Section image via OptimizedImage with dimensions | VERIFIED | Uses `<OptimizedImage width={640} height={480} loading="lazy">`. |
| `src/components/landing/ColoniesSection.astro` | Section image via OptimizedImage with dimensions | VERIFIED | Uses `<OptimizedImage width={640} height={480} loading="lazy">`. |
| `src/components/cats/CatGallery.astro` | Tobii dynamically imported, not statically | VERIFIED | `async function initLightbox()` with `await Promise.all([import('@midzer/tobii'), ...])`. No top-level static import. |
| `src/components/cats/CatFilters.tsx` | img tags with width={1280} height={960} | VERIFIED | Lines 142-143 confirmed. |
| `astro.config.mjs` | `@astrojs/sitemap` with i18n config | VERIFIED | `sitemap({ i18n: { defaultLocale: 'ca', locales: { ca: 'ca', es: 'es' } } })` outside the `NODE_ENV !== 'production'` block. |
| `public/robots.txt` | robots.txt with Sitemap URL | VERIFIED | File exists. Content: `User-agent: *`, `Allow: /`, `Sitemap: https://animalsvidadigna.org/sitemap-index.xml`. Hex-verified. Gap CLOSED. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/layouts/BaseLayout.astro` | `src/lib/seo.ts` | `import { buildCanonicalUrl, buildOgMeta, buildHreflangLinks, buildOrganizationSchema }` | WIRED | Line 4 of BaseLayout imports all 4 functions; all used in frontmatter. |
| `src/pages/cat/[slug].astro` | `src/lib/seo.ts` | `buildCatSchema` import and usage | WIRED | Imports `{ buildCanonicalUrl, buildCatSchema }`. Constructs `catJsonLd`. Passes `jsonLd={catJsonLd}` to BaseLayout. |
| `src/pages/es/cat/[slug].astro` | `src/lib/seo.ts` | `buildCatSchema` import and usage | WIRED | ES variant fully wired with same pattern. |
| `astro.config.mjs` | `@astrojs/sitemap` | `sitemap()` integration with i18n config | WIRED | Import confirmed. Sitemap config confirmed outside NODE_ENV conditional. |
| `src/components/landing/HeroSection.astro` | `src/components/OptimizedImage.astro` | `import OptimizedImage` + `fetchpriority="high"` | WIRED | Import on line 4; `<OptimizedImage fetchpriority="high" ...>` on line 55. |
| `src/components/landing/AboutSection.astro` | `src/components/OptimizedImage.astro` | `import OptimizedImage` | WIRED | Import on line 5; `<OptimizedImage width={640} ...>` confirmed. |
| `src/components/landing/ColoniesSection.astro` | `src/components/OptimizedImage.astro` | `import OptimizedImage` | WIRED | Import on line 5; `<OptimizedImage width={640} ...>` confirmed. |
| `public/robots.txt` | `sitemap-index.xml` | `Sitemap:` directive URL | WIRED | `Sitemap: https://animalsvidadigna.org/sitemap-index.xml` present in file. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| SEO-01 | 04-01 | Per-page canonical + meta title/description | SATISFIED | All 8 page templates pass `canonicalUrl`, `description` to BaseLayout. `<link rel="canonical">` and `<meta name="description">` rendered. |
| SEO-02 | 04-01 | Open Graph tags with localized title/description/image | SATISFIED | `buildOgMeta()` produces 7 OG tags. 11 OG unit tests pass. |
| SEO-03 | 04-01 | hreflang tags (ca, es, x-default) on every page | SATISFIED | BaseLayout maps 3 hreflang links on every page. 7 unit tests verify x-default always points to CA variant. |
| SEO-04 | 04-01 | Sitemap with xhtml:link hreflang alternates | SATISFIED | `@astrojs/sitemap` with i18n config outside production conditional. Previously confirmed `dist/sitemap-0.xml` contains `xhtml:link rel="alternate"` for both locales. |
| SEO-05 | 04-04 | robots.txt generated correctly | SATISFIED | `public/robots.txt` exists with correct content. Gap CLOSED by plan 04-04. |
| SEO-06 | 04-01 | JSON-LD Organization + per-cat Thing with inLanguage | SATISFIED | Organization in BaseLayout (site-wide). Cat Thing in both `[slug].astro` variants. 5 JSON-LD tests pass. |
| A11Y-01 | 04-02 | WCAG AA contrast ratios | SATISFIED | 5 text/bg pairs verified >= 4.5:1. `text-accent` on surface removed from all components. |
| A11Y-02 | 04-02 | Visible focus states | SATISFIED | `:focus-visible` outline rule in `global.css` `@layer base`. Applies globally. |
| A11Y-03 | 04-02 | Full keyboard navigation (tabs, modals, gallery, forms) | NEEDS HUMAN | Skip link, mobile menu ARIA, focus-visible implemented. Full keyboard flow requires browser testing. |
| A11Y-04 | 04-02 | Alt text required on all images | SATISFIED | `OptimizedImage.astro` requires `alt` prop. No `<img` without `alt=` found in source. |
| A11Y-05 | 04-02 | Reduced-motion support for gallery | SATISFIED | `CatGallery.astro` has `@media (prefers-reduced-motion: reduce) { .lightbox img { transition: none !important; } }`. |
| PERF-01 | 04-03/04-05/04-06 | Lighthouse >= 95 Performance (mobile) | NEEDS HUMAN | Technical prerequisites in place: system fonts, fetchpriority on LCP hero image, CLS-prevented explicit dimensions, lazy Tobii, deferred DonateSticky hydration. Actual score requires browser run. Plan 04-06 auto-approved with no scores. |
| PERF-02 | 04-03/04-05/04-06 | Lighthouse >= 95 Accessibility (mobile) | NEEDS HUMAN | Contrast, focus, skip link, ARIA implemented. Actual score requires browser run. |
| PERF-03 | 04-03/04-05/04-06 | Lighthouse >= 95 Best Practices (mobile) | NEEDS HUMAN | No deprecated APIs identified in code. Actual score requires browser run. |
| PERF-04 | 04-03/04-05/04-06 | Lighthouse >= 95 SEO (mobile) | NEEDS HUMAN | Canonical, meta description, hreflang, JSON-LD, robots.txt all implemented. Actual score requires browser run. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/pages/index.astro` | 50 | `{/* TODO: Newsletter section (v2) */}` | Info | v2 feature placeholder — renders empty div, does not affect phase 04 goal |
| `src/pages/index.astro` | 53 | `{/* TODO: FAQ section (v2) */}` | Info | v2 feature placeholder — renders empty div, does not affect phase 04 goal |
| `.planning/ROADMAP.md` | 89-91 | Plans 04-04, 04-05, 04-06 marked `[ ]` (incomplete) despite having completed SUMMARYs | Info | ROADMAP staleness — does not affect codebase functionality; config.json is dirty in git status |

No code blockers found.

### Human Verification Required

#### 1. Lighthouse Audit — All Four Categories

**Test:** Run `pnpm build && pnpm preview`, then open Chrome DevTools Lighthouse tab. Select Mobile, all categories (Performance, Accessibility, Best Practices, SEO). Run on:
- `http://localhost:4321/` (CA landing page)
- `http://localhost:4321/es/` (ES landing page)
- Any cat detail page (e.g. `/cat/garfield/`)

**Expected:** Performance >= 95, Accessibility >= 95, Best Practices >= 95, SEO >= 95 on all pages.

**Why human:** Plan 04-06 was auto-approved a second time with "build confirmed successful" — no actual scores were recorded. All technical prerequisites are verified: system font stack, fetchpriority on LCP hero image, CLS-free landing section images via OptimizedImage with explicit dimensions, lazy-loaded Tobii (dynamic import), deferred DonateSticky hydration (client:idle), SEO markup (canonical, OG, hreflang, JSON-LD), robots.txt present.

**If Performance < 95:** Share the Lighthouse Diagnostics section: LCP time, Total Blocking Time (TBT), and Cumulative Layout Shift (CLS) values. This will enable targeted additional fixes.

#### 2. Keyboard Navigation Flow

**Test:** Open the landing page in a browser. Tab through the page with keyboard only.
- First Tab press should show the skip-to-content link visually (fixed position, primary-colored background).
- Continue Tab: all links, buttons, and form fields should show a visible orange/brown outline ring.
- In mobile viewport: hamburger button should be reachable by Tab; pressing Enter/Space should open the menu and update `aria-expanded` to `true`.

**Expected:** Skip link visible on first Tab; focus rings on all interactive elements; mobile menu keyboard-operable.
**Why human:** Focus ring visibility and keyboard flow order require a real browser.

### Gap Closure Summary

**Gap 1 (CLOSED) — robots.txt (SEO-05):** `public/robots.txt` created by plan 04-04 with correct `User-agent: *`, `Allow: /`, and `Sitemap: https://animalsvidadigna.org/sitemap-index.xml` directives. Hex-verified.

**Gap 2 (PARTIALLY CLOSED) — Performance optimizations applied, scores still need human confirmation:**

Plan 04-05 applied all identified bottleneck fixes:
- Hero LCP image converted to `OptimizedImage` with `fetchpriority="high"`, `width={1280}`, `height={448}`, responsive srcset
- `AboutSection.astro` and `ColoniesSection.astro` converted to `OptimizedImage` with explicit dimensions (CLS prevention)
- `CatGallery.astro` Tobii lightbox JS now dynamically imported only when gallery links exist
- `CatFilters.tsx` card images given `width={1280}` `height={960}` (CLS prevention)
- `DonateSticky` changed from `client:only="preact"` to `client:idle` (reduces TBT)

Plan 04-06 was intended as the human verification gate but was auto-approved again with only a build success check. The structural technical fixes are all in place and verified. What remains is the human confirmation that the scores have reached >= 95.

### Note on ROADMAP Status

Plans 04-04, 04-05, and 04-06 show as `[ ]` incomplete in ROADMAP.md even though all three have completed SUMMARY files. This is a tracking staleness issue (`.planning/config.json` is modified per git status). It does not indicate missing work — the implementations are verified in the codebase.

---

_Verified: 2026-03-19T14:35:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — initial gaps were closed by plans 04-04 through 04-06_
