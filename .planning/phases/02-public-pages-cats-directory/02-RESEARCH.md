# Phase 2: Public Pages & Cats Directory - Research

**Researched:** 2026-03-18
**Domain:** Astro pages, Keystatic Reader API (blocks + markdoc), Preact islands, lightbox gallery, client-side filtering
**Confidence:** HIGH

## Summary

Phase 2 transforms the skeleton from Phase 1 into a full public-facing website. Three distinct areas need implementation: (1) a landing page that reads CMS block-based sections from the Keystatic `landing` singleton and renders them in editor-defined order, (2) a cats directory with SSR-rendered listing page enhanced by a Preact filter island, plus detail pages with markdoc rendering and a lightbox gallery, and (3) donation CTAs wired to the CMS-configurable Teaming URL from site settings.

The existing codebase already has all CMS schemas defined (keystatic.config.tsx), a Keystatic reader helper (src/lib/keystatic.ts), bilingual content helpers (src/i18n/content.ts with `getLocalizedField` and `getLocalizedCat`), full i18n infrastructure, and a base layout with header/footer. The landing page singleton uses `fields.blocks` which returns an array of `{ discriminant, value }` objects -- iterate and switch on `discriminant` to render each section component. Cat descriptions use `fields.markdoc` which returns an async function -- call it to get a Markdoc AST, then use `@markdoc/markdoc` to transform and render to HTML.

**Primary recommendation:** Build three plan waves: (1) landing page with all section components reading from CMS blocks, (2) cats listing + detail pages with Preact filter island, (3) donation CTAs (header/footer/hero wiring + sticky scroll island). Use `@markdoc/markdoc` for rendering cat descriptions, and Tobii for the accessible lightbox gallery.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CATS-01 | Filterable cats listing page with client-side filters (status, age, sex, temperament) rendered as an interactive island | Preact island with `client:load` for filter controls; SSR renders full cat list, Preact shows/hides based on filter state |
| CATS-02 | SSR base for cats listing ensuring SEO crawlability of all cat entries | Astro page renders all cat cards in static HTML; filters are progressive enhancement via Preact island |
| CATS-03 | Cat detail pages at /cat/[slug_ca] and /es/cat/[slug_es] with cover image, gallery, traits, and MDX description | Dynamic route pages using Keystatic reader; markdoc rendered via `@markdoc/markdoc` transform + renderers.html |
| CATS-04 | Lightbox/gallery component with keyboard navigation and reduced-motion support | Tobii library -- zero-dependency, accessible, supports keyboard nav, respects `prefers-reduced-motion` |
| CATS-05 | Featured cats displayed on homepage from CMS-flagged entries | Filter cats collection by `featured: true`, render as card grid on landing page |
| LAND-01 | Landing page renders all CMS-configured sections in editor-defined order | Read `landing` singleton via reader API; iterate `sections` array, switch on `discriminant` to render components |
| LAND-02 | Hero section with CTA (donate + adopt) and hero image | Astro component reading hero block value; donate CTA links to settings.donateUrl |
| LAND-03 | About/Qui Som section with shelter mission and team info | Astro component rendering markdoc content from about block |
| LAND-04 | Stats/impact section with CMS-editable numbers | Astro component iterating stats items array from stats block |
| LAND-05 | Colony information section | Astro component rendering markdoc content from colonies block |
| LAND-06 | Collaboration/volunteer section with CTA | Astro component with CTA button from collaborate block |
| LAND-07 | Contact section with form or CTA | Astro component rendering contactCta block (form is Phase 3) |
| DONA-01 | Teaming donation link visible in header, hero, and footer | Read donateUrl from settings singleton; pass to Header, Footer, and Hero components |
| DONA-02 | Donate URL is CMS-configurable in site settings | Already defined in keystatic.config.tsx as `settings.donateUrl` field |
| DONA-03 | Sticky donate CTA on scroll (interactive island) | Preact island with `client:idle` using IntersectionObserver or scroll listener to show/hide |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| astro | ^5.18.1 | Page rendering, routing, SSR | Already installed; handles static + SSR pages |
| @keystatic/core | ^0.5.48 | Reader API for content access | Already installed; reads singletons and collections |
| @markdoc/markdoc | ^0.4 | Transform + render markdoc AST to HTML | Official Markdoc library; needed for cat description rendering |
| preact | ^10.29.0 | Interactive islands (filters, sticky CTA, gallery) | Already installed; project uses Preact for public islands |
| @astrojs/preact | ^4.1.3 | Astro-Preact integration | Already installed |
| tailwindcss | ^4.2.1 | Styling | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @midzer/tobii | latest | Accessible lightbox gallery | Cat detail page gallery (CATS-04) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tobii | Custom lightbox | Tobii is <5KB, zero-dep, accessible, respects reduced-motion out of the box; custom would be 100+ lines to get right |
| @markdoc/markdoc | Custom markdown parser | Markdoc is what Keystatic stores; using the official renderer avoids any parsing mismatch |
| Preact filter island | Vanilla JS filters | Preact adds state management, reactive UI updates; filter UX is complex enough to justify it |

**Installation:**
```bash
pnpm add @markdoc/markdoc @midzer/tobii
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    landing/           # Landing page section components
      HeroSection.astro
      AboutSection.astro
      StatsSection.astro
      ColoniesSection.astro
      AdoptSection.astro
      CollaborateSection.astro
      ContactCtaSection.astro
      FeaturedCatsSection.astro
    cats/              # Cat-specific components
      CatCard.astro
      CatFilters.tsx        # Preact island
      CatGallery.tsx        # Preact island (wraps Tobii)
      CatTraits.astro
    DonateSticky.tsx         # Preact island for sticky CTA
  lib/
    keystatic.ts             # Already exists -- reader instance
    markdoc.ts               # NEW: helper to render markdoc to HTML string
  pages/
    index.astro              # Landing page (CA) -- reads landing singleton
    es/index.astro           # Landing page (ES)
    cats/index.astro         # Cats listing (CA)
    cat/[slug].astro         # Cat detail (CA)
    es/cats/index.astro      # Cats listing (ES)
    es/cat/[slug].astro      # Cat detail (ES)
```

### Pattern 1: Reading Keystatic Blocks (Landing Sections)

**What:** The `landing` singleton uses `fields.blocks` which returns an array of `{ discriminant: string, value: object }` items. Iterate and switch on `discriminant` to render the correct Astro component for each section.

**When to use:** Landing page rendering.

**Example:**
```astro
---
// src/pages/index.astro
import { reader } from '../lib/keystatic';
import HeroSection from '../components/landing/HeroSection.astro';
import AboutSection from '../components/landing/AboutSection.astro';
// ... other section imports

const landing = await reader.singletons.landing.read();
const settings = await reader.singletons.settings.read();
const locale = 'ca';
---

{landing?.sections.map((section) => {
  switch (section.discriminant) {
    case 'hero':
      return <HeroSection data={section.value} locale={locale} donateUrl={settings?.donateUrl} />;
    case 'about':
      return <AboutSection data={section.value} locale={locale} />;
    // ... other cases
  }
})}
```

### Pattern 2: Rendering Markdoc Content to HTML

**What:** Keystatic markdoc fields return an async function. Call it to get a Markdoc AST node, then use `@markdoc/markdoc` to transform and render to an HTML string. Set the HTML via `set:html` in Astro.

**When to use:** Cat descriptions, landing section rich text (about, colonies, collaborate).

**Example:**
```typescript
// src/lib/markdoc.ts
import Markdoc from '@markdoc/markdoc';

export async function renderMarkdoc(
  asyncContent: () => Promise<{ node: unknown }>
): Promise<string> {
  const content = await asyncContent();
  if (!content?.node) return '';
  const rendered = Markdoc.renderers.html(
    Markdoc.transform(content.node as any)
  );
  return rendered;
}
```

```astro
<!-- In an Astro component -->
<div set:html={htmlContent} />
```

### Pattern 3: SSR Cat Listing with Progressive Enhancement Filters

**What:** The Astro page renders ALL cats as static HTML cards (SEO-crawlable). A Preact island overlays filter controls that hide/show cards via CSS classes or state. The cat data is passed as a JSON prop to the Preact island.

**When to use:** Cats listing page (CATS-01, CATS-02).

**Example:**
```astro
---
// src/pages/cats/index.astro
const allCats = await reader.collections.cats.all();
const localizedCats = allCats.map(({ slug, entry }) => ({
  ...getLocalizedCat(entry, 'ca'),
  keystatic_slug: slug,
}));
---

<CatFilters client:load cats={localizedCats} locale={locale}>
  <!-- Server-rendered cat cards as fallback for no-JS -->
  {localizedCats.map((cat) => (
    <CatCard cat={cat} locale={locale} />
  ))}
</CatFilters>
```

### Pattern 4: Dynamic Cat Detail Routes

**What:** Use `getStaticPaths` to generate pages for each cat slug per locale.

**When to use:** Cat detail pages (CATS-03).

**Example:**
```astro
---
// src/pages/cat/[slug].astro
export async function getStaticPaths() {
  const cats = await reader.collections.cats.all();
  return cats.map(({ slug, entry }) => ({
    params: { slug: entry.slug_ca || slug },
    props: { keystatic_slug: slug },
  }));
}
---
```

### Pattern 5: Sticky Donate CTA (Preact Island)

**What:** A Preact component that appears after scrolling past the hero section. Uses `client:idle` to hydrate after page load.

**When to use:** DONA-03.

**Example:**
```tsx
// src/components/DonateSticky.tsx
import { useEffect, useState } from 'preact/hooks';

export default function DonateSticky({ url, text }: { url: string; text: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return visible ? (
    <a href={url} class="fixed bottom-4 right-4 z-50 rounded-lg bg-accent px-5 py-3 font-semibold shadow-lg transition-transform hover:scale-105">
      {text}
    </a>
  ) : null;
}
```

### Anti-Patterns to Avoid
- **Fetching settings in every component:** Read settings once in the page frontmatter, pass `donateUrl` and other settings as props to child components.
- **Client-side content fetching:** All content comes from Keystatic reader at build/SSR time. Never fetch CMS content from the browser.
- **Rendering markdoc in Preact islands:** Markdoc rendering should happen server-side in Astro frontmatter. Pass the HTML string to components, not the raw AST.
- **Duplicating cat card markup:** Create a single `CatCard.astro` component used by both the listing page and the featured cats section on the homepage.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Lightbox gallery | Custom modal with image navigation | Tobii (@midzer/tobii) | Focus trapping, keyboard nav, swipe, reduced-motion, ARIA -- too many edge cases |
| Markdoc-to-HTML | Custom AST walker | @markdoc/markdoc transform + renderers.html | Markdoc AST format is complex; official library handles all node types |
| Image lazy loading | Custom IntersectionObserver | Native `loading="lazy"` attribute | Browser-native, zero JS, universally supported |
| Scroll-based visibility | Complex scroll math | CSS `position: sticky` where possible, simple scrollY threshold for the donate CTA | Keep it simple; the sticky CTA is the only scroll-dependent interactive element |

**Key insight:** This phase is primarily about rendering CMS content correctly across locales. The interactive parts are limited to three islands (cat filters, gallery lightbox, sticky donate CTA). Keep server-rendered, pass minimal data to islands.

## Common Pitfalls

### Pitfall 1: Markdoc Async Content Not Awaited
**What goes wrong:** Keystatic markdoc fields return an async function, not the content directly. Forgetting to call and await it results in rendering `[Function]` or `[object Promise]`.
**Why it happens:** The reader API returns content lazily to avoid loading all markdoc content when you only need metadata.
**How to avoid:** Always `await contentField()` before passing to Markdoc.transform. Or use `resolveLinkedFiles: true` when reading.
**Warning signs:** Empty content areas or `[object Object]` in rendered HTML.

### Pitfall 2: Locale-Specific Slugs in Routes
**What goes wrong:** Cat detail pages need different slugs per locale (slug_ca vs slug_es). Using the same slug for both locales breaks deep-linking from the language switcher.
**Why it happens:** The Keystatic collection uses `slug_ca` as the primary slug, but `slug_es` is a separate text field.
**How to avoid:** In `getStaticPaths`, generate paths using the locale-specific slug. Build a slug-to-keystatic-slug mapping for lookups.
**Warning signs:** 404s when switching language on a cat detail page.

### Pitfall 3: Filter Island Hydration Mismatch
**What goes wrong:** If the Preact island renders different HTML than the server-rendered Astro output, Preact will throw hydration errors.
**Why it happens:** The filter component tries to re-render what Astro already rendered.
**How to avoid:** Two approaches: (a) the Preact island fully owns the cat card rendering (receives data as JSON prop, renders its own cards), or (b) the Preact island only manages filter state and visibility, with server-rendered cards hidden/shown via CSS data attributes.
**Warning signs:** Console hydration warnings, flickering on page load.

### Pitfall 4: Missing Settings Singleton Data
**What goes wrong:** If the `settings` singleton hasn't been filled in via Keystatic admin, `reader.singletons.settings.read()` returns `null`, causing runtime errors when accessing `donateUrl`.
**Why it happens:** First deployment before any CMS content is created.
**How to avoid:** Always null-check settings reads. Provide sensible fallback values (e.g., `donateUrl ?? '#'`).
**Warning signs:** Build failures or blank sections on first deploy.

### Pitfall 5: Large JSON Props to Preact Islands
**What goes wrong:** Passing all cat data (including markdoc ASTs) as props to the filter island bloats the page HTML with serialized JSON.
**Why it happens:** Astro serializes island props into the HTML.
**How to avoid:** Only pass the fields needed for filtering and display (slug, name, status, age, gender, personality, coverImage, shortDescription). Never pass markdoc content to islands.
**Warning signs:** Page HTML size > 500KB, slow time-to-interactive.

## Code Examples

### Reading Landing Singleton with Blocks
```typescript
// In page frontmatter
const landing = await reader.singletons.landing.read();
// landing.sections is Array<{ discriminant: string, value: object }>
// Each section.discriminant is: 'hero' | 'about' | 'stats' | 'colonies' | 'adopt' | 'collaborate' | 'contactCta' | 'newsletter' | 'faq'
// Each section.value contains the block's schema fields
```

### Reading All Cats with Localized Fields
```typescript
const allCats = await reader.collections.cats.all();
const localizedCats = allCats
  .map(({ slug, entry }) => ({
    ...getLocalizedCat(entry, locale),
    keystatic_slug: slug,
  }))
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
```

### Featured Cats for Homepage
```typescript
const allCats = await reader.collections.cats.all();
const featuredCats = allCats
  .filter(({ entry }) => entry.featured)
  .map(({ slug, entry }) => ({
    ...getLocalizedCat(entry, locale),
    keystatic_slug: slug,
  }));
```

### Rendering Markdoc from Keystatic
```typescript
import Markdoc from '@markdoc/markdoc';

// For cat descriptions (markdoc fields are async functions)
const catEntry = await reader.collections.cats.read(slug, { resolveLinkedFiles: true });
// With resolveLinkedFiles, description_ca is already resolved
// Without it: const content = await catEntry.description_ca();

const htmlContent = Markdoc.renderers.html(
  Markdoc.transform(catEntry.description_ca.node)
);
```

### Tobii Lightbox Integration
```typescript
// In a Preact island or via Astro client script
import Tobii from '@midzer/tobii';
import '@midzer/tobii/dist/tobii.min.css';

// HTML structure needed:
// <a href="full-image.jpg" class="lightbox" data-group="cat-gallery">
//   <img src="thumb.jpg" alt="..." />
// </a>

const tobii = new Tobii({
  captions: true,
  zoom: false,
  autoplayVideo: false,
});
```

### Cat Filter Island (Preact)
```tsx
import { useState } from 'preact/hooks';
import type { FunctionComponent } from 'preact';

interface CatFilterData {
  keystatic_slug: string;
  name: string;
  status: string;
  age: number | null;
  gender: string;
  personality: string[];
  coverImage: { src: string; alt: string } | null;
  shortDescription: string;
  slug: string;
}

interface Props {
  cats: CatFilterData[];
  locale: 'ca' | 'es';
}

const CatFilters: FunctionComponent<Props> = ({ cats, locale }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');

  const filtered = cats.filter((cat) => {
    if (statusFilter !== 'all' && cat.status !== statusFilter) return false;
    if (genderFilter !== 'all' && cat.gender !== genderFilter) return false;
    return true;
  });

  return (
    <div>
      {/* Filter controls */}
      <div class="flex gap-4 mb-6">
        <select value={statusFilter} onChange={(e) => setStatusFilter((e.target as HTMLSelectElement).value)}>
          <option value="all">All</option>
          <option value="available">Available</option>
          <option value="adopted">Adopted</option>
        </select>
        {/* ... more filters */}
      </div>
      {/* Cat cards rendered by Preact */}
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((cat) => (
          <a key={cat.keystatic_slug} href={`/${locale === 'es' ? 'es/' : ''}cat/${cat.slug}`} class="block rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
            {cat.coverImage && <img src={cat.coverImage.src} alt={cat.coverImage.alt} class="h-48 w-full rounded-t-xl object-cover" loading="lazy" />}
            <div class="p-4">
              <h3 class="font-display text-lg font-bold text-primary">{cat.name}</h3>
              <p class="mt-1 text-sm text-text-muted">{cat.shortDescription}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default CatFilters;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Astro Content Collections for Keystatic | Keystatic Reader API directly | Astro 5+ | Reader API gives full control, avoids double-schema definition |
| output: 'hybrid' | Default static + adapter + per-route prerender=false | Astro 5.0 | No config change needed; just add adapter |
| React for islands | Preact for islands (project decision) | Phase 1 | Smaller bundle, same API surface |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | vitest.config.ts |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CATS-01 | Cat filters produce correct filtered results | unit | `pnpm vitest run tests/cats-filter.test.ts -t "CATS-01"` | No -- Wave 0 |
| CATS-02 | Cats listing page renders all cat entries in HTML | smoke | Manual -- verify HTML output contains cat cards | N/A manual |
| CATS-03 | Cat detail route generates correct paths per locale | unit | `pnpm vitest run tests/cats-routes.test.ts -t "CATS-03"` | No -- Wave 0 |
| CATS-04 | Gallery lightbox accessible markup | smoke | Manual -- verify ARIA attributes and keyboard nav | N/A manual |
| CATS-05 | Featured cats filter works | unit | `pnpm vitest run tests/cats-filter.test.ts -t "CATS-05"` | No -- Wave 0 |
| LAND-01 | Landing sections render in CMS order | unit | `pnpm vitest run tests/landing.test.ts -t "LAND-01"` | No -- Wave 0 |
| LAND-02 to LAND-07 | Section components render correct locale content | smoke | Manual -- visual check per locale | N/A manual |
| DONA-01 | Donate URL appears in header, hero, footer | unit | `pnpm vitest run tests/donate.test.ts -t "DONA-01"` | No -- Wave 0 |
| DONA-02 | Donate URL comes from CMS settings | unit | `pnpm vitest run tests/donate.test.ts -t "DONA-02"` | No -- Wave 0 |
| DONA-03 | Sticky CTA shows on scroll | smoke | Manual -- scroll test | N/A manual |

### Sampling Rate
- **Per task commit:** `pnpm test`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/cats-filter.test.ts` -- covers CATS-01, CATS-05 (filter logic unit tests)
- [ ] `tests/cats-routes.test.ts` -- covers CATS-03 (slug mapping logic)
- [ ] `tests/landing.test.ts` -- covers LAND-01 (section ordering from blocks)
- [ ] `tests/donate.test.ts` -- covers DONA-01, DONA-02 (settings reading)
- [ ] `tests/markdoc.test.ts` -- covers markdoc rendering helper
- [ ] Install `@markdoc/markdoc`: `pnpm add @markdoc/markdoc`
- [ ] Install `@midzer/tobii`: `pnpm add @midzer/tobii`

## Open Questions

1. **Markdoc field resolution with `resolveLinkedFiles`**
   - What we know: Reader API supports `{ resolveLinkedFiles: true }` to eagerly resolve async markdoc fields
   - What's unclear: Exact shape of the resolved markdoc field (is it `{ node: MarkdocNode }` directly or still a function?)
   - Recommendation: Test both approaches during implementation; fall back to calling the async function if `resolveLinkedFiles` doesn't simplify things

2. **Tobii and Preact compatibility**
   - What we know: Tobii is vanilla JS, initializes via `new Tobii()` on DOM elements with specific data attributes
   - What's unclear: Whether Tobii cleanup works correctly when Preact re-renders gallery elements
   - Recommendation: Initialize Tobii in a `useEffect` hook with proper cleanup; alternatively, keep gallery as a thin Astro component with a `<script>` tag instead of a Preact island

3. **Cat slug uniqueness across locales**
   - What we know: `slug_ca` is the Keystatic collection slug (auto-generated), `slug_es` is a manual text field
   - What's unclear: Whether `slug_es` could conflict with another cat's `slug_ca`
   - Recommendation: Use locale prefix in the URL path (/cat/[slug] vs /es/cat/[slug]) to avoid conflicts

## Sources

### Primary (HIGH confidence)
- Keystatic config (keystatic.config.tsx) -- reviewed all schema definitions directly
- Keystatic Reader API docs (https://keystatic.com/docs/reader-api) -- singleton/collection reading patterns
- Existing codebase (src/i18n/content.ts) -- getLocalizedCat helper already handles all cat fields
- Existing codebase (src/lib/keystatic.ts) -- reader instance already configured

### Secondary (MEDIUM confidence)
- Keystatic blocks rendering pattern -- discriminant/value structure confirmed by egghead.io tutorial and official docs
- Markdoc rendering -- @markdoc/markdoc transform + renderers.html confirmed by markdoc.dev official docs
- Tobii lightbox (https://github.com/midzer/tobii) -- accessibility features confirmed by README

### Tertiary (LOW confidence)
- Exact markdoc field shape when using `resolveLinkedFiles: true` -- needs runtime verification
- Tobii bundle size exact number -- confirmed "small" but no exact kB figure verified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all core libraries already installed except @markdoc/markdoc and @midzer/tobii
- Architecture: HIGH -- patterns derived from existing codebase patterns and confirmed Keystatic API docs
- Pitfalls: HIGH -- identified from direct codebase analysis (slug handling, async content, island props)
- Validation: MEDIUM -- test patterns follow existing Phase 1 conventions but new test files needed

**Research date:** 2026-03-18
**Valid until:** 2026-04-17 (stable stack, no fast-moving dependencies)
