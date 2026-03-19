# Phase 4: SEO, Accessibility & Performance - Research

**Researched:** 2026-03-19
**Domain:** SEO meta tags, structured data, accessibility (WCAG AA), performance optimization for Astro 5 + Cloudflare
**Confidence:** HIGH

## Summary

This phase adds a quality layer on top of a working Astro 5 site deployed to Cloudflare Workers. The site already has correct i18n routing (CA at root, ES at `/es/`), Keystatic CMS with localized content, responsive images via Cloudflare Image Resizing, and Tobii-based gallery lightbox. The work divides into three streams: (1) SEO markup in `BaseLayout.astro` plus `@astrojs/sitemap` integration, (2) accessibility audit and fixes for contrast, focus states, keyboard navigation, and the gallery lightbox, and (3) performance tuning to hit Lighthouse 95+ on mobile.

The BaseLayout currently has minimal `<head>` content (charset, viewport, title, optional description, favicon). All SEO tags (canonical, OG, hreflang, JSON-LD) must be added. The `@astrojs/sitemap` integration handles hreflang in the sitemap automatically when configured with i18n locales. For structured data, schema.org has no `Animal` type -- use a combination of `Organization` (site-wide) and a product-like pattern or plain `Thing` with `additionalType` for cat profiles. The color palette mostly passes WCAG AA except accent color (#E8A87C) on surface (#FFF8F0) which fails at 1.93:1 -- accent must never be used for text on the light background. Tobii lightbox already provides keyboard navigation, focus management, and Escape-to-close, so the gallery accessibility work is lighter than expected.

**Primary recommendation:** Extend BaseLayout props to accept canonical/OG/hreflang data, add `@astrojs/sitemap` with i18n config, audit and fix the two failing contrast pairs, add `:focus-visible` ring styles and skip-to-content link, and verify OptimizedImage outputs explicit `width`/`height` for CLS prevention.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- BaseLayout extended with: `<link rel="canonical">`, Open Graph tags (`og:title`, `og:description`, `og:url`, `og:image`, `og:locale`, `og:locale:alternate`), and hreflang alternate links
- BaseLayout receives new optional props: `canonicalUrl`, `ogImage`, `alternateLocale` (the sibling URL in the other locale)
- Each page passes its own canonical URL and the equivalent URL in the other locale for hreflang
- CA locale uses `lang="ca"` / hreflang `"ca"`, ES uses `lang="es"` / hreflang `"es"` -- no region subtags
- Both locales always reference each other plus a self-referencing hreflang tag
- Use `@astrojs/sitemap` integration with custom serializer for `<xhtml:link>` hreflang alternate entries
- Covers all static pages in both locales: landing, cats listing, cat detail pages, contact
- Organization schema in BaseLayout (site-wide, uses Keystatic site settings for name/url/logo/contactEmail)
- Animal schema on cat detail pages only -- fields: name, description, image, url, `inLanguage` (BCP 47: `"ca"` or `"es"`)
- Injected as `<script type="application/ld+json">` in `<head>`, rendered server-side as a static string
- WCAG AA contrast audit: review brand color pairs against 4.5:1 ratio for normal text, 3:1 for large text
- All interactive elements get explicit visible `:focus-visible` styles
- Keyboard navigation audit: Tab order, skip-to-content link, and focus trap in CatGallery lightbox
- CatGallery lightbox: `aria-modal="true"`, focus trapped inside when open, Escape key closes it, focus returns to trigger element on close
- Image alt text: all `<OptimizedImage>` and `<img>` tags verified to have non-empty `alt` attributes
- Form labels: all form inputs already use explicit `<label>` associations (established in Phase 3)
- No automated CI tooling -- manual Lighthouse runs in Chrome DevTools (mobile throttling preset)
- Target: 95+ on Performance, Accessibility, Best Practices, SEO for mobile in both locales
- Images already have explicit `width`/`height` via OptimizedImage -- verify this is wired correctly
- Font strategy: system font stack or preloaded web fonts -- audit what's currently loading

### Claude's Discretion
- Which Tailwind utilities to use for `:focus-visible` ring styles
- Skip-to-content link placement and styling
- Exact `sizes` attribute values in srcset for each image context
- JSON-LD field selection beyond the required minimum
- Order of `<head>` elements

### Deferred Ideas (OUT OF SCOPE)
- `canonical` with query parameters (e.g., filter state on cats listing) -- cat filters use client-side state only so no query params in URLs; no action needed
- WCAG AAA compliance -- out of scope
- Automated Lighthouse CI -- out of scope for this phase; manual runs sufficient
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEO-01 | Per-page and per-cat meta tags (title, description, canonical) with localized values | BaseLayout prop extension pattern documented; pages already have locale-specific SEO data from Keystatic |
| SEO-02 | Open Graph tags with localized title/description/image per page and per cat | OG meta tag pattern documented; `og:locale` uses `ca` / `es` |
| SEO-03 | hreflang tags (ca, es, x-default) on every page | `getAlternateUrl()` utility already exists in i18n/index.ts; self-referencing pattern documented |
| SEO-04 | Sitemap.xml with xhtml:link rel="alternate" hreflang entries for both locales | `@astrojs/sitemap` v3.7.1 i18n config handles this automatically; documented below |
| SEO-05 | robots.txt generated correctly | Astro generates robots.txt when `site` is configured (already set) |
| SEO-06 | JSON-LD structured data (Organization, per-cat) with inLanguage | Organization schema pattern documented; no official Animal type in schema.org -- alternative approach documented |
| A11Y-01 | WCAG AA contrast ratios on all text/background combinations | Contrast audit completed; two failing pairs identified with fixes |
| A11Y-02 | Visible focus states on all interactive elements | Tailwind `:focus-visible` ring pattern documented |
| A11Y-03 | Full keyboard navigation support (tabs, modals, gallery, forms) | Tobii already handles gallery keyboard nav; skip-to-content and mobile menu fixes needed |
| A11Y-04 | Alt text required in both CA and ES for all images | OptimizedImage requires `alt` prop; CMS schema enforces alt fields |
| A11Y-05 | Reduced-motion support for gallery/carousel animations | CatGallery already has `prefers-reduced-motion` CSS; Tobii respects it natively |
| PERF-01 | Lighthouse >= 95 on Performance (mobile) | Font loading and CLS are the main risks; documented below |
| PERF-02 | Lighthouse >= 95 on Accessibility (mobile) | Covered by A11Y fixes above |
| PERF-03 | Lighthouse >= 95 on Best Practices (mobile) | HTTPS, no mixed content, no deprecated APIs -- Cloudflare handles most |
| PERF-04 | Lighthouse >= 95 on SEO (mobile) | Covered by SEO markup additions above |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @astrojs/sitemap | 3.7.1 | Sitemap generation with i18n hreflang | Official Astro integration; auto-generates xhtml:link alternates |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @midzer/tobii | 3.1.3 | Gallery lightbox (already installed) | Already in use; has built-in a11y features |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @astrojs/sitemap | Manual sitemap generation | Would require hand-rolling xhtml:link entries; not worth it |
| schema.org Animal type | Thing + additionalType | No official Animal type exists; use Thing or Product-like pattern |

**Installation:**
```bash
pnpm add @astrojs/sitemap
```

**Version verification:** `@astrojs/sitemap` v3.7.1 confirmed via `npm view` on 2026-03-19.

## Architecture Patterns

### BaseLayout Extension Pattern

The BaseLayout needs new optional props for SEO metadata. Each page constructs its own canonical URL, OG data, and alternate locale URL before passing to the layout.

```typescript
// BaseLayout.astro props extension
interface Props {
  title: string;
  description?: string;
  donateUrl?: string;
  // New SEO props
  canonicalUrl?: string;
  ogImage?: string;
  alternateUrl?: string; // URL in the other locale
}
```

### Canonical URL Construction

CA pages have no prefix (site root). ES pages have `/es/` prefix. The `site` config is already `https://animalsvidadigna.org`.

```typescript
// In each page's frontmatter
const canonicalUrl = new URL(Astro.url.pathname, Astro.site).href;
const alternateUrl = new URL(
  getAlternateUrl(Astro.url, locale === 'ca' ? 'es' : 'ca'),
  Astro.site
).href;
```

### hreflang Pattern (in BaseLayout `<head>`)

```html
<link rel="canonical" href={canonicalUrl} />
{/* Self-referencing hreflang */}
<link rel="alternate" hreflang={locale} href={canonicalUrl} />
{/* Alternate locale */}
<link rel="alternate" hreflang={locale === 'ca' ? 'es' : 'ca'} href={alternateUrl} />
{/* x-default points to CA (default locale) */}
<link rel="alternate" hreflang="x-default" href={locale === 'ca' ? canonicalUrl : alternateUrl} />
```

### @astrojs/sitemap i18n Configuration

```javascript
// astro.config.mjs
import sitemap from '@astrojs/sitemap';

// Add to integrations array (always, not just dev)
integrations.push(
  sitemap({
    i18n: {
      defaultLocale: 'ca',
      locales: {
        ca: 'ca',
        es: 'es',
      },
    },
  })
);
```

This automatically generates `<xhtml:link rel="alternate" hreflang="ca" href="..."/>` and `<xhtml:link rel="alternate" hreflang="es" href="..."/>` for each URL in the sitemap. The integration detects locale from URL path segments (`/es/` prefix for ES, root for CA).

### JSON-LD Structured Data

**Organization (site-wide in BaseLayout):**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Animals Vida Digna",
  "url": "https://animalsvidadigna.org",
  "logo": "https://animalsvidadigna.org/images/logo.webp",
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "{from CMS settings}"
  }
}
```

**Cat profile (on cat detail pages):** Since schema.org has no `Animal` type, use a `Thing` with descriptive properties. This is still valid structured data and provides search engine context.
```json
{
  "@context": "https://schema.org",
  "@type": "Thing",
  "name": "Cat Name",
  "description": "Short description",
  "image": "https://animalsvidadigna.org/cdn-cgi/image/.../photo.jpg",
  "url": "https://animalsvidadigna.org/cat/slug",
  "inLanguage": "ca",
  "additionalType": "https://schema.org/Product"
}
```

Note: The CONTEXT.md references "Animal" schema but schema.org does not have an `Animal` type (confirmed: schema.org/Animal returns 404, and [GitHub issue #746](https://github.com/schemaorg/schemaorg/issues/746) has been open since 2015 without resolution). Use `Thing` as the `@type`. Optionally add `"additionalType"` if the team wants richer semantics.

### Open Graph Tags Pattern

```html
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonicalUrl} />
<meta property="og:type" content="website" />
<meta property="og:locale" content={locale === 'ca' ? 'ca' : 'es'} />
<meta property="og:locale:alternate" content={locale === 'ca' ? 'es' : 'ca'} />
{ogImage && <meta property="og:image" content={ogImage} />}
<meta property="og:site_name" content="Animals Vida Digna" />
```

### Skip-to-Content Link Pattern

```html
<!-- First element in <body>, before Header -->
<a href="#main-content" class="
  sr-only focus:not-sr-only
  focus:fixed focus:top-4 focus:left-4 focus:z-[100]
  focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2
  focus:text-surface focus:outline-none
">
  {t(locale, 'a11y.skipToContent')}
</a>

<!-- Add id to main -->
<main id="main-content" class="flex-1">
```

### Focus-Visible Ring Style

Apply a global `:focus-visible` style via Tailwind:

```css
/* In global.css or as a Tailwind layer */
@layer base {
  :focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
}
```

This ensures all interactive elements (links, buttons, inputs) get a visible focus indicator without needing per-element classes.

### Anti-Patterns to Avoid
- **hreflang without self-reference:** Google requires each page to include a hreflang pointing to itself. Forgetting the self-reference is the #1 hreflang mistake.
- **Accent color as text on light background:** The accent (#E8A87C) on surface (#FFF8F0) has only 1.93:1 contrast -- never use it for text. It works as a background (text on accent = 8.10:1).
- **Missing width/height on images:** The current `OptimizedImage.astro` does NOT output `width` and `height` attributes. It only has `src`, `srcset`, `sizes`, `alt`, `class`, `loading`, `decoding`. This will cause CLS.
- **Font references without loading:** The theme defines `"Inter"` and `"Poppins"` font families but there are no font files in `/public/fonts/` and no `<link>` tags loading them from Google Fonts. They currently fall back to `system-ui`. Either add font loading or remove the named fonts to prevent FOUT.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sitemap with hreflang | Custom XML generation | `@astrojs/sitemap` with i18n config | Handles locale detection, xhtml:link generation, and sitemap index automatically |
| robots.txt | Manual file | Astro's built-in generation | Astro generates robots.txt automatically when `site` is configured |
| Focus trap in lightbox | Custom focus trap code | Tobii's built-in focus management | Tobii already traps Tab key focus and manages focus restore on close |
| Contrast checking | Manual hex math | WebAIM Contrast Checker or browser DevTools | Accurate WCAG compliance checking needs luminance calculations |

**Key insight:** Tobii already handles the most complex accessibility requirement (gallery lightbox keyboard navigation + focus management). The a11y work is mostly CSS (focus rings, contrast fixes) and HTML (skip link, ARIA attributes on mobile menu).

## Common Pitfalls

### Pitfall 1: OptimizedImage Missing width/height
**What goes wrong:** Cumulative Layout Shift (CLS) tanks Performance score below 95.
**Why it happens:** The current `OptimizedImage.astro` outputs `<img>` without explicit `width` and `height` attributes. Browsers can't reserve space until the image loads.
**How to avoid:** Add `width` and `height` props to OptimizedImage, defaulting to the largest width in the srcset and a computed height (or require the caller to specify aspect ratio).
**Warning signs:** Lighthouse reports CLS > 0.1; images visibly "pop in" during page load.

### Pitfall 2: Font Loading Flash
**What goes wrong:** FOUT (Flash of Unstyled Text) or font-loading network requests that block rendering.
**Why it happens:** CSS references `"Inter"` and `"Poppins"` but no font files are loaded. Currently falling back to system-ui (which is fine for performance). If fonts are added without `font-display: swap` and preload, performance will drop.
**How to avoid:** Either (a) remove named fonts and use system-ui explicitly, or (b) add `<link rel="preload">` for font files with `font-display: swap`. Option (a) is simpler and scores higher on Lighthouse.
**Warning signs:** Lighthouse flags "Ensure text remains visible during webfont load".

### Pitfall 3: hreflang Self-Reference Omission
**What goes wrong:** Google ignores all hreflang tags on the page.
**Why it happens:** Each page must include a hreflang link pointing to itself AND to each alternate. Missing self-reference invalidates the entire set.
**How to avoid:** Always emit both the self-referencing hreflang and the alternate locale hreflang, plus `x-default`.
**Warning signs:** Google Search Console reports hreflang errors; pages appear in wrong locale in search results.

### Pitfall 4: @astrojs/sitemap Not in Production Build
**What goes wrong:** Sitemap is empty or missing in production.
**Why it happens:** The current `astro.config.mjs` conditionally loads integrations only in non-production (`process.env.NODE_ENV !== 'production'`). The sitemap integration must be added outside that conditional block, alongside `preact()`.
**How to avoid:** Add `sitemap()` to the integrations array after the conditional block, alongside `integrations.push(preact())`.
**Warning signs:** `/sitemap-index.xml` returns 404 in production.

### Pitfall 5: Mobile Menu Not Keyboard Accessible
**What goes wrong:** Lighthouse Accessibility score drops; keyboard users can't navigate mobile menu.
**Why it happens:** The mobile menu button toggles visibility but doesn't manage `aria-expanded`, and the menu itself has no `aria-hidden` state management.
**How to avoid:** Add `aria-expanded` to the button, `aria-hidden` to the menu, and ensure menu links are not focusable when hidden (use `hidden` attribute or `inert`).
**Warning signs:** Tab key focuses invisible menu items; screen readers announce hidden menu content.

### Pitfall 6: JSON-LD Using Non-Existent Schema Type
**What goes wrong:** Google structured data testing tool reports errors.
**Why it happens:** schema.org does not have an `Animal` type. Using `@type: "Animal"` produces invalid structured data.
**How to avoid:** Use `@type: "Thing"` (or `"Product"` if adoption semantics are desired). Both are valid.
**Warning signs:** Google Rich Results Test shows "Unknown type" error.

## Code Examples

### robots.txt Verification

Astro auto-generates `robots.txt` when `site` is set in config. The current `astro.config.mjs` already has `site: 'https://animalsvidadigna.org'`. No additional work needed for SEO-05 beyond verifying the output after build.

Expected output:
```
User-agent: *
Allow: /

Sitemap: https://animalsvidadigna.org/sitemap-index.xml
```

### JSON-LD Injection in Astro

```astro
---
// In BaseLayout.astro or a dedicated SEO component
const organizationSchema = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Animals Vida Digna",
  "url": Astro.site?.href,
  "logo": new URL("/images/logo.webp", Astro.site).href,
});
---
<script type="application/ld+json" set:html={organizationSchema} />
```

### Contrast-Safe Color Usage

Based on calculated contrast ratios:

| Foreground | Background | Ratio | WCAG AA |
|------------|------------|-------|---------|
| text (#2D1B0E) | surface (#FFF8F0) | 15.64:1 | PASS |
| text-muted (#6B5B4F) | surface (#FFF8F0) | 6.16:1 | PASS |
| primary (#8B5E3C) | surface (#FFF8F0) | 5.30:1 | PASS |
| primary-dark (#6B4226) | surface (#FFF8F0) | 8.20:1 | PASS |
| **accent (#E8A87C)** | **surface (#FFF8F0)** | **1.93:1** | **FAIL** |
| text (#2D1B0E) | accent (#E8A87C) | 8.10:1 | PASS |
| **primary (#8B5E3C)** | **accent (#E8A87C)** | **2.74:1** | **FAIL** |
| surface (#FFF8F0) | primary (#8B5E3C) | 5.30:1 | PASS |
| surface (#FFF8F0) | primary-dark (#6B4226) | 8.20:1 | PASS |

**Rules:**
1. Accent color is safe as a background (use `text` color for text on it) but NEVER as foreground text on light backgrounds.
2. Primary on accent fails -- use `text` color instead if text appears on accent backgrounds.
3. All other combinations pass AA for normal text.

### Current Accent Usage Audit

The accent color is used as:
- **Button backgrounds** (donate buttons, CTA buttons) -- SAFE, text color is `text` (#2D1B0E)
- **Stats numbers** (`text-accent` on surface) -- POTENTIALLY FAILING. The stats section uses `text-accent` for large numbers. At 1.93:1, this fails even for large text (needs 3:1). **Must fix**: change to `text-primary` or `text-primary-dark`.
- **Personality badge text** (`text-accent` on `bg-accent/10`) -- needs verification; low-opacity accent background may pass.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual sitemap XML | `@astrojs/sitemap` with i18n | Astro 3+ | Auto-generates hreflang alternates |
| `:focus` outline | `:focus-visible` outline | Browser support 2023+ | Only shows on keyboard nav, not mouse clicks |
| `font-display: block` | `font-display: swap` or system fonts | Web Vitals emphasis 2020+ | Eliminates FOIT, improves LCP |
| `outline: none` for aesthetics | Visible focus rings | WCAG 2.1 | Keyboard users need visible focus indicators |

**Deprecated/outdated:**
- `schema.org/Animal`: Does not exist; [open issue since 2015](https://github.com/schemaorg/schemaorg/issues/746)
- `:focus` without `:focus-visible`: Causes unwanted focus rings on mouse clicks

## Open Questions

1. **Font loading strategy**
   - What we know: CSS defines "Inter" and "Poppins" but no font files are loaded; system-ui fallback is active
   - What's unclear: Whether the shelter wants these specific branded fonts or is fine with system fonts
   - Recommendation: Keep system-ui for best performance. If branded fonts are needed later, add them with `font-display: swap` and `<link rel="preload">`

2. **Cat JSON-LD type choice**
   - What we know: `Animal` is not a valid schema.org type; `Thing` and `Product` are options
   - What's unclear: Whether Google surfaces any special results for pet adoption structured data
   - Recommendation: Use `Thing` with descriptive properties (name, description, image, url, inLanguage). This is semantically honest and won't cause validation errors. Can upgrade if schema.org adds Animal type later.

3. **OptimizedImage width/height**
   - What we know: The component does NOT output width/height attributes; only uses srcset
   - What's unclear: Whether Cloudflare Image Resizing preserves aspect ratio info that could be used
   - Recommendation: Add optional `width` and `height` props to OptimizedImage. For the cover image, use known dimensions (e.g., aspect-ratio via CSS class). For CLS prevention, the `aspect-ratio` CSS property can substitute for explicit width/height.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEO-01 | Canonical URL and meta tag construction | unit | `pnpm vitest run tests/seo-meta.test.ts -t "canonical"` | Wave 0 |
| SEO-02 | OG tag generation with locale variants | unit | `pnpm vitest run tests/seo-meta.test.ts -t "og"` | Wave 0 |
| SEO-03 | hreflang tag generation (self + alternate + x-default) | unit | `pnpm vitest run tests/seo-meta.test.ts -t "hreflang"` | Wave 0 |
| SEO-04 | Sitemap with hreflang alternates | manual-only | Build and inspect `dist/sitemap-*.xml` | N/A |
| SEO-05 | robots.txt generated correctly | manual-only | Build and inspect `dist/robots.txt` | N/A |
| SEO-06 | JSON-LD structured data output | unit | `pnpm vitest run tests/json-ld.test.ts` | Wave 0 |
| A11Y-01 | Contrast ratios (code verification of color pairs) | unit | `pnpm vitest run tests/a11y-contrast.test.ts` | Wave 0 |
| A11Y-02 | Focus-visible styles applied | manual-only | Keyboard navigation in browser | N/A |
| A11Y-03 | Keyboard navigation and skip-to-content | manual-only | Tab through all pages in browser | N/A |
| A11Y-04 | Alt text present on all images | unit | `pnpm vitest run tests/seo-meta.test.ts -t "alt"` | Wave 0 |
| A11Y-05 | Reduced motion support | manual-only | Toggle prefers-reduced-motion in DevTools | N/A |
| PERF-01 | Lighthouse Performance >= 95 | manual-only | Chrome DevTools Lighthouse audit | N/A |
| PERF-02 | Lighthouse Accessibility >= 95 | manual-only | Chrome DevTools Lighthouse audit | N/A |
| PERF-03 | Lighthouse Best Practices >= 95 | manual-only | Chrome DevTools Lighthouse audit | N/A |
| PERF-04 | Lighthouse SEO >= 95 | manual-only | Chrome DevTools Lighthouse audit | N/A |

### Sampling Rate
- **Per task commit:** `pnpm test`
- **Per wave merge:** `pnpm test` + manual Lighthouse on landing page
- **Phase gate:** Full Lighthouse audit on all page types in both locales

### Wave 0 Gaps
- [ ] `tests/seo-meta.test.ts` -- covers SEO-01, SEO-02, SEO-03, A11Y-04 (pure function tests for URL/meta construction)
- [ ] `tests/json-ld.test.ts` -- covers SEO-06 (JSON-LD object construction)
- [ ] `tests/a11y-contrast.test.ts` -- covers A11Y-01 (programmatic contrast ratio verification)

## Sources

### Primary (HIGH confidence)
- [Astro sitemap docs](https://docs.astro.build/en/guides/integrations-guide/sitemap/) -- i18n config, serialize function, xhtml:link generation
- [Tobii GitHub](https://github.com/midzer/tobii) -- keyboard navigation, focus management, ARIA attributes
- [schema.org/Organization](https://schema.org/Organization) -- JSON-LD Organization type
- npm registry -- @astrojs/sitemap v3.7.1, @midzer/tobii v3.1.3 (verified 2026-03-19)

### Secondary (MEDIUM confidence)
- [schema.org Animal issue #746](https://github.com/schemaorg/schemaorg/issues/746) -- confirms Animal type does not exist
- [WebAIM Contrast Checker methodology](https://webaim.org/resources/contrastchecker/) -- WCAG 2.x contrast calculation reference
- Programmatic contrast ratio calculations for brand palette (verified via luminance formula)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- only one new dependency (@astrojs/sitemap), well-documented official integration
- Architecture: HIGH -- patterns are straightforward HTML meta tags and Astro component props
- Pitfalls: HIGH -- contrast ratios calculated programmatically, font loading verified by inspecting codebase, schema.org verified via direct URL check
- Accessibility: HIGH -- Tobii features confirmed via official GitHub docs; WCAG AA thresholds are well-defined standards

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable domain; schema.org and WCAG AA standards change rarely)
