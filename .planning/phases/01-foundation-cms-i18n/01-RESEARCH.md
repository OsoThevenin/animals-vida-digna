# Phase 1: Foundation, CMS & i18n - Research

**Researched:** 2026-03-17
**Domain:** Astro + Keystatic + Cloudflare Workers + TailwindCSS + i18n
**Confidence:** HIGH

## Summary

This phase establishes the full project skeleton: Astro 5 with the Cloudflare adapter, Keystatic CMS with bilingual content schemas, TailwindCSS v4 theming, and path-based i18n routing for Catalan/Spanish. The project is a complete rebuild from the existing Next.js + Payload CMS codebase -- no code is reused, but the data model (especially the rich Cats collection) must be faithfully ported to Keystatic schemas.

Three critical findings emerged during research: (1) `output: 'hybrid'` no longer exists in Astro 5+ -- static is the default and individual routes opt into SSR via `export const prerender = false` plus an adapter; (2) `@keystatic/astro` does NOT yet list Astro 6 as a peer dependency (only `2 || 3 || 4 || 5`), so the project MUST use Astro 5; (3) Keystatic admin on Cloudflare Workers historically failed due to missing `MessageChannel` API, but this is now resolved with `compatibility_date >= 2025-08-15` or the `expose_global_message_channel` flag -- however, for simplicity the safest approach is conditional loading (Keystatic dev-only, static production).

**Primary recommendation:** Use Astro 5 (latest 5.18.x) with `@astrojs/cloudflare@12` adapter, Keystatic in local mode (dev-only, conditionally loaded), Tailwind v4 via `@tailwindcss/vite`, and Keystatic Reader API for content access. Deploy a hello-world to Cloudflare on day one.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Astro 5 with `output: 'hybrid'` -- static pages by default, SSR for Keystatic admin and API routes
  - **RESEARCH CORRECTION:** `output: 'hybrid'` was removed in Astro 5. The equivalent is the default static mode with adapter installed + `export const prerender = false` on SSR routes. No config change needed -- just add the adapter.
- `@astrojs/cloudflare` adapter with `platformProxy` for local dev via `wrangler`
- Deploy a hello-world to Cloudflare Workers on day one before any feature code
- R2 bucket binding configured in `wrangler.toml` (actual upload workflow is Phase 3)
- `nodejs_compat_v2` compatibility flag enabled for Workers runtime
  - **RESEARCH NOTE:** Current flag name is `nodejs_compat` (not `nodejs_compat_v2`). Verify at install time.
- Tailwind v4 with `@tailwindcss/vite` plugin for Astro integration
- Derive primary/accent colors from existing `logo.webp` brand assets
- Single entity per content type with `_ca`/`_es` field suffixes for localization
- Content schemas: settings singleton, cats collection, landing singleton, pages collection
- Images stored as paths; Phase 1 uses Keystatic local mode with git-committed assets
- Keystatic in `local` storage mode initially
- Astro built-in i18n config: `defaultLocale: 'ca'`, `locales: ['ca', 'es']`, `prefixDefaultLocale: false`
- Catalan at root `/`, Spanish under `/es/`
- UI strings via TypeScript dictionaries (`src/i18n/ca.ts`, `src/i18n/es.ts`)
- Content localization: helper functions to read correct `_ca`/`_es` field based on current locale
- Preact for public-site islands -- do NOT enable Preact `compat` mode
- Phase 1 only needs the language switcher island
- Keystatic admin labels in Catalan

### Claude's Discretion
- Exact Tailwind color values derived from logo analysis
- File/folder structure within `src/` (layouts, components, content directories)
- Keystatic config file organization
- Build/dev script setup in package.json
- Whether to use Astro Content Layer API or Keystatic Reader API directly

### Deferred Ideas (OUT OF SCOPE)
- R2 signed URL upload workflow -- Phase 3
- Cloudflare Image Resizing integration -- Phase 3
- Contact/adoption form endpoints -- Phase 3
- SEO meta tags, hreflang, structured data -- Phase 4
- Social sharing buttons -- v2
- Newsletter signup integration -- v2
- FAQ accordion -- v2
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | Site builds with Astro 5 hybrid mode and deploys to Cloudflare Workers | Astro 5.18.x + @astrojs/cloudflare@12.6.13 + adapter config. No `output: 'hybrid'` needed -- default static + adapter handles it. |
| FOUND-02 | TailwindCSS theme derived from existing brand assets | Tailwind v4 via @tailwindcss/vite, CSS-first config with @theme directive, extract colors from logo.webp |
| FOUND-03 | Keystatic CMS admin accessible for content editing in hybrid SSR mode | Keystatic local mode dev-only; conditionally load in astro.config; admin at /keystatic during dev |
| FOUND-04 | R2 bucket configured for image storage with public access | wrangler.toml R2 binding config; Phase 1 only sets up the binding, actual upload is Phase 3 |
| I18N-01 | Catalan content served at root paths | Astro i18n config: defaultLocale 'ca', prefixDefaultLocale false |
| I18N-02 | Spanish content served under /es paths | Astro i18n config: locales ['ca', 'es'], auto-prefixed /es/ routes |
| I18N-03 | Language switcher deep-links to alternate locale | Preact island using Astro's getRelativeLocaleUrl() or manual path mapping with locale-specific slugs |
| I18N-04 | UI strings localized via TypeScript translation dictionaries | Simple src/i18n/ module with typed key-value objects per locale |
| I18N-05 | No automatic language redirect | Astro i18n routing with manual: true or no redirect middleware |
| CMS-01 | Site settings singleton | Keystatic singleton with _ca/_es suffixed fields for localized content |
| CMS-02 | Cats collection with localized fields | Keystatic collection preserving all fields from existing Payload schema, _ca/_es suffixes |
| CMS-03 | Landing page sections as typed blocks | Keystatic singleton with conditional fields or blocks array for section types |
| CMS-04 | Static pages collection | Keystatic collection for privacy/legal pages with _ca/_es content |
| CMS-05 | All image fields include alt text in both CA and ES | Each image field paired with alt_ca and alt_es text fields |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| astro | ^5.18.1 | Framework | Latest Astro 5.x; Keystatic does not support Astro 6 yet |
| @astrojs/cloudflare | ^12.6.13 | CF Workers adapter | Latest v12 for Astro 5; v13 requires Astro 6 |
| @keystatic/core | ^0.5.48 | CMS | Git-backed, schema-as-code, visual admin UI |
| @keystatic/astro | ^5.0.6 | Keystatic Astro integration | Bridges Keystatic admin into Astro dev server |
| tailwindcss | ^4.2.1 | Styling | CSS-first utility framework, Vite plugin integration |
| @tailwindcss/vite | ^4.2.1 | Tailwind Vite plugin | Official Tailwind v4 integration for Vite-based frameworks |
| typescript | ^5.7 | Type safety | First-class support across all tools |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| preact | ^10.29.0 | Interactive islands | Language switcher (Phase 1), filters/gallery (Phase 2+) |
| @astrojs/preact | ^5.0.1 | Preact Astro integration | Enables `client:*` directives on Preact components |
| react | ^19.0.0 | Keystatic dependency | Required by Keystatic admin; NOT used in public site |
| react-dom | ^19.0.0 | Keystatic dependency | Required by Keystatic admin; NOT used in public site |
| @astrojs/react | latest | Keystatic dependency | Required by @keystatic/astro for admin UI |
| @astrojs/markdoc | latest | Keystatic dependency | Required by Keystatic for document fields |
| wrangler | ^4.75.0 | CF CLI | Local dev, deployment, R2 management |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Astro 5 | Astro 6 | Astro 6 has better CF dev experience but Keystatic does not support it yet |
| Keystatic Reader API | Astro Content Layer API | Content Layer is more "Astro-native" but adds a schema bridge layer; Reader API is simpler and avoids dual-schema pitfall |
| Tailwind v4 | Tailwind v3 | v3 is more documented; v4 CSS-first approach is cleaner but newer |

**Installation:**
```bash
# Create new Astro project (will prompt for config)
pnpm create astro@latest . --template minimal

# Core
pnpm add astro@5 @astrojs/cloudflare@12

# CMS (conditionally loaded, but needs to be installed)
pnpm add @keystatic/core @keystatic/astro @astrojs/react @astrojs/markdoc react react-dom

# Styling
pnpm add tailwindcss @tailwindcss/vite

# Islands
pnpm add preact @astrojs/preact

# Dev
pnpm add -D typescript wrangler @biomejs/biome
```

## Architecture Patterns

### Recommended Project Structure
```
/
├── astro.config.mjs           # Astro config (adapter, i18n, integrations)
├── keystatic.config.tsx       # Keystatic schema (collections + singletons)
├── wrangler.toml              # Cloudflare Workers config (R2 binding)
├── public/
│   └── images/                # Static brand assets (logo.webp, hero_image.webp)
├── src/
│   ├── content/               # Keystatic-managed content (git-tracked YAML/JSON)
│   │   ├── cats/              # One file per cat
│   │   ├── pages/             # Static pages (privacy, legal)
│   │   ├── landing/           # Landing page singleton
│   │   └── settings/          # Site settings singleton
│   ├── components/
│   │   ├── Header.astro       # Sticky header with nav + CTAs
│   │   ├── Footer.astro
│   │   ├── LanguageSwitcher.tsx  # Preact island
│   │   └── ui/                # Shared UI primitives
│   ├── layouts/
│   │   └── BaseLayout.astro   # HTML shell, global styles, nav
│   ├── pages/
│   │   ├── index.astro        # CA landing (root)
│   │   ├── es/
│   │   │   └── index.astro    # ES landing
│   │   └── keystatic/
│   │       └── [...params].astro  # Keystatic admin (prerender: false)
│   ├── i18n/
│   │   ├── ca.ts              # Catalan UI strings
│   │   ├── es.ts              # Spanish UI strings
│   │   ├── index.ts           # Type definitions + helper functions
│   │   └── content.ts         # Locale-aware content field reader
│   ├── lib/
│   │   └── keystatic.ts       # Keystatic reader instance + typed helpers
│   └── styles/
│       └── global.css         # @import "tailwindcss" + @theme customizations
└── biome.json
```

### Pattern 1: Astro 5 Static + Adapter (replaces `output: 'hybrid'`)
**What:** Astro 5 merged static and hybrid modes. Install adapter, default is static. Individual routes opt into SSR with `export const prerender = false`.
**When to use:** Always for this project.
**Example:**
```typescript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// Conditional Keystatic loading (dev-only)
const integrations = [];
if (process.env.NODE_ENV !== 'production') {
  const react = (await import('@astrojs/react')).default;
  const markdoc = (await import('@astrojs/markdoc')).default;
  const keystatic = (await import('@keystatic/astro')).default;
  integrations.push(react(), markdoc(), keystatic());
}

// Preact always available for public site islands
import preact from '@astrojs/preact';
integrations.push(preact());

export default defineConfig({
  adapter: cloudflare(),
  site: 'https://animalsvidadigna.org',
  i18n: {
    defaultLocale: 'ca',
    locales: ['ca', 'es'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations,
  vite: {
    plugins: [tailwindcss()],
  },
});
```
Source: [Astro on-demand rendering docs](https://docs.astro.build/en/guides/on-demand-rendering/), [Tailwind CSS Astro guide](https://tailwindcss.com/docs/installation/framework-guides/astro)

### Pattern 2: Conditional Keystatic Integration
**What:** Load Keystatic + React only in development. In production, the admin UI is excluded and the site deploys as pure static.
**When to use:** When deploying to Cloudflare Workers where Keystatic admin may have runtime issues.
**Why:** Keystatic admin requires React SSR. While MessageChannel is now available in Workers (compatibility_date >= 2025-08-15), conditionally loading avoids shipping React to production entirely. Editors use `pnpm dev` locally or Keystatic GitHub mode.
**Example:** See Pattern 1 above.
Source: [Blog: Astro + Keystatic on Cloudflare](https://allthingstech.ch/blog/how-i-built-this-blog-with-astro-keystatic-and-claude-code/)

### Pattern 3: Keystatic Reader API for Content Access
**What:** Use `createReader()` from `@keystatic/reader` to query content at build time. Do NOT use Astro Content Collections.
**When to use:** All content reading in Astro pages.
**Why:** Single source of truth for schema (keystatic.config.tsx). Avoids the dual-schema anti-pattern.
**Example:**
```typescript
// src/lib/keystatic.ts
import { createReader } from '@keystatic/reader';
import keystaticConfig from '../../keystatic.config';

export const reader = createReader(process.cwd(), keystaticConfig);

// src/i18n/content.ts
import { reader } from '../lib/keystatic';
type Locale = 'ca' | 'es';

export async function getLocalizedCat(slug: string, locale: Locale) {
  const cats = await reader.collections.cats.all();
  const cat = cats.find(c =>
    locale === 'ca' ? c.slug === slug : c.entry.slug_es === slug
  );
  if (!cat) return null;
  return {
    name: cat.entry[`name_${locale}`],
    description: cat.entry[`description_${locale}`],
    shortDescription: cat.entry[`shortDescription_${locale}`],
    // Shared fields
    age: cat.entry.age,
    gender: cat.entry.gender,
    status: cat.entry.status,
    coverImage: cat.entry.coverImage,
    featured: cat.entry.featured,
  };
}
```
Source: [Keystatic Reader API docs](https://keystatic.com/docs/reader-api)

### Pattern 4: Bilingual Content with `_ca`/`_es` Field Suffixes
**What:** Single Keystatic entry per entity. Localized fields use `_ca`/`_es` suffixes. Shared fields (photos, dates, booleans) are single.
**When to use:** All content schemas.
**Example:**
```typescript
// In keystatic.config.tsx
cats: collection({
  label: 'Gats',
  slugField: 'slug_ca',
  path: 'src/content/cats/*',
  schema: {
    // Localized
    slug_ca: fields.slug({ name: { label: 'Slug (CA)' } }),
    slug_es: fields.text({ label: 'Slug (ES)' }),
    name_ca: fields.text({ label: 'Nom (CA)', validation: { isRequired: true } }),
    name_es: fields.text({ label: 'Nombre (ES)', validation: { isRequired: true } }),
    // Shared
    status: fields.select({ label: 'Estat', ... }),
    age: fields.integer({ label: 'Edat' }),
    // Image with bilingual alt
    coverImage: fields.object({
      src: fields.text({ label: 'URL imatge' }),
      alt_ca: fields.text({ label: 'Alt (CA)' }),
      alt_es: fields.text({ label: 'Alt (ES)' }),
    }),
  },
})
```

### Pattern 5: Tailwind v4 CSS-First Theme Configuration
**What:** Tailwind v4 uses `@theme` directive in CSS instead of `tailwind.config.js`.
**When to use:** All styling in this project.
**Example:**
```css
/* src/styles/global.css */
@import "tailwindcss";

@theme {
  --color-primary: #8B5E3C;    /* Warm brown from logo */
  --color-primary-light: #A67C5B;
  --color-primary-dark: #6B4226;
  --color-accent: #E8A87C;     /* Warm peach/orange */
  --color-accent-light: #F0C4A8;
  --color-surface: #FFF8F0;    /* Warm off-white */
  --color-text: #2D1B0E;       /* Dark brown */
  --color-text-muted: #6B5B4F;
  --font-family-sans: 'Inter', system-ui, sans-serif;
  --font-family-display: 'Poppins', system-ui, sans-serif;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
}
```
Source: [Tailwind CSS v4 docs](https://tailwindcss.com/docs/installation/framework-guides/astro)

### Anti-Patterns to Avoid
- **Using `output: 'hybrid'` in astro.config:** Removed in Astro 5. Just install the adapter and use default static mode.
- **Dual schema definition:** Do NOT define schemas in both keystatic.config.tsx AND src/content/config.ts. Use Keystatic Reader API only.
- **Enabling Preact `compat` mode:** Breaks Keystatic's internal React. Never set `compat: true`.
- **Shipping Keystatic/React to production:** Conditionally load integrations to exclude CMS from production builds.
- **Using `@astrojs/tailwind` integration:** Deprecated for Tailwind v4. Use `@tailwindcss/vite` in `vite.plugins` instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| i18n routing | Custom middleware for locale detection | Astro built-in `i18n` config | Handles path prefixes, locale URLs, getRelativeLocaleUrl() |
| Content reading | Custom YAML/JSON file parsers | Keystatic Reader API | Type-safe, schema-validated, handles document fields |
| CSS framework config | Custom PostCSS/Vite plugin chain | `@tailwindcss/vite` | Single plugin, zero config beyond CSS @theme |
| CF Workers adapter | Custom Workers script | `@astrojs/cloudflare` adapter | Handles static + SSR routing, bindings, dev proxy |
| Admin UI | Custom CMS dashboard | Keystatic admin at /keystatic | Full WYSIWYG editor, schema validation, git commits |

**Key insight:** This stack has mature integrations between each layer. The main risk is misconfiguring the integration points, not missing functionality.

## Common Pitfalls

### Pitfall 1: Using `output: 'hybrid'` (Removed in Astro 5)
**What goes wrong:** Config error or silent ignore. Astro 5 merged hybrid into the default static mode.
**Why it happens:** CONTEXT.md and prior research reference `output: 'hybrid'` based on Astro 4 knowledge.
**How to avoid:** Do NOT set `output` at all (or set `output: 'static'`). Just install the adapter. Use `export const prerender = false` on SSR routes.
**Warning signs:** Build warnings about unknown config option.

### Pitfall 2: Keystatic Admin Fails on Cloudflare Workers
**What goes wrong:** Keystatic admin UI returns errors because React SSR needs MessageChannel API.
**Why it happens:** Workers historically lacked MessageChannel; resolved with compatibility_date >= 2025-08-15.
**How to avoid:** Use conditional loading (Keystatic dev-only). OR set `compatibility_date = "2025-08-15"` in wrangler.toml and test.
**Warning signs:** 500 errors on /keystatic in production; blank admin page.

### Pitfall 3: Keystatic Schema Changes Break Existing Content
**What goes wrong:** Renaming/retyping fields causes existing YAML/JSON to be invalid.
**Why it happens:** Keystatic has no migration system. Schema changes require manual content migration.
**How to avoid:** Finalize schema before entering real content. Use test/placeholder data during Phase 1.
**Warning signs:** Keystatic admin shows validation errors on existing entries.

### Pitfall 4: Dual Schema Definition (Keystatic + Astro Content Collections)
**What goes wrong:** Schemas drift between keystatic.config.tsx and src/content/config.ts.
**Why it happens:** Astro has its own Content Collections system; tempting to use both.
**How to avoid:** Use Keystatic Reader API exclusively. Do NOT create src/content/config.ts.
**Warning signs:** TypeScript type mismatches between what Keystatic writes and what Astro reads.

### Pitfall 5: Node.js APIs Failing on Cloudflare Workers
**What goes wrong:** Server-side code using `fs`, `path`, `Buffer` works in dev but fails in production.
**Why it happens:** Workers uses V8 isolates, not Node.js. `nodejs_compat` flag helps but not complete.
**How to avoid:** Deploy hello-world on day one. Test with `wrangler dev`. Avoid Node-specific packages.
**Warning signs:** 500 errors mentioning "X is not a function" in Workers logs.

### Pitfall 6: Preact + React Conflict
**What goes wrong:** Enabling Preact compat aliases React imports globally, breaking Keystatic admin.
**Why it happens:** `compat: true` in @astrojs/preact config.
**How to avoid:** Never set `compat: true`. Keystatic bundles its own React. Preact is only for public islands.
**Warning signs:** Keystatic admin crashes, React hooks errors.

## Code Examples

### Keystatic Config Structure
```typescript
// keystatic.config.tsx
import { config, collection, singleton, fields } from '@keystatic/core';

export default config({
  storage: { kind: 'local' },

  singletons: {
    settings: singleton({
      label: 'Configuracio del Lloc',
      path: 'src/content/settings/global',
      schema: {
        siteName_ca: fields.text({ label: 'Nom del lloc (CA)' }),
        siteName_es: fields.text({ label: 'Nombre del sitio (ES)' }),
        logo: fields.image({ label: 'Logotip', directory: 'public/images' }),
        primaryColor: fields.text({ label: 'Color primari' }),
        donateUrl: fields.url({ label: 'URL de donacio (Teaming)' }),
        contactEmail: fields.text({ label: 'Email de contacte' }),
        social: fields.object({
          facebook: fields.url({ label: 'Facebook' }),
          instagram: fields.url({ label: 'Instagram' }),
          twitter: fields.url({ label: 'X (Twitter)' }),
        }),
        seo: fields.object({
          title_ca: fields.text({ label: 'Titol SEO (CA)' }),
          title_es: fields.text({ label: 'Titulo SEO (ES)' }),
          description_ca: fields.text({ label: 'Descripcio SEO (CA)', multiline: true }),
          description_es: fields.text({ label: 'Descripcion SEO (ES)', multiline: true }),
          image: fields.image({ label: 'Imatge SEO', directory: 'public/images' }),
        }),
      },
    }),

    landing: singleton({
      label: 'Pagina Principal',
      path: 'src/content/landing/home',
      schema: {
        sections: fields.blocks({
          hero: {
            label: 'Hero',
            schema: fields.object({
              title_ca: fields.text({ label: 'Titol (CA)' }),
              title_es: fields.text({ label: 'Titulo (ES)' }),
              subtitle_ca: fields.text({ label: 'Subtitol (CA)' }),
              subtitle_es: fields.text({ label: 'Subtitulo (ES)' }),
              image: fields.image({ label: 'Imatge', directory: 'public/images' }),
              ctaText_ca: fields.text({ label: 'Text CTA (CA)' }),
              ctaText_es: fields.text({ label: 'Texto CTA (ES)' }),
            }),
          },
          // ... more section types
        }, { label: 'Seccions' }),
      },
    }),
  },

  collections: {
    cats: collection({
      label: 'Gats',
      slugField: 'slug_ca',
      path: 'src/content/cats/*',
      schema: {
        // See full schema in Pattern 4 above
      },
    }),

    pages: collection({
      label: 'Pagines',
      slugField: 'slug',
      path: 'src/content/pages/*',
      schema: {
        slug: fields.slug({ name: { label: 'Slug' } }),
        title_ca: fields.text({ label: 'Titol (CA)', validation: { isRequired: true } }),
        title_es: fields.text({ label: 'Titulo (ES)', validation: { isRequired: true } }),
        content_ca: fields.markdoc({ label: 'Contingut (CA)' }),
        content_es: fields.markdoc({ label: 'Contenido (ES)' }),
        seo: fields.object({
          title_ca: fields.text({ label: 'Titol SEO (CA)' }),
          title_es: fields.text({ label: 'Titulo SEO (ES)' }),
          description_ca: fields.text({ label: 'Descripcio SEO (CA)' }),
          description_es: fields.text({ label: 'Descripcion SEO (ES)' }),
        }),
      },
    }),
  },
});
```

### i18n Helper Module
```typescript
// src/i18n/index.ts
export type Locale = 'ca' | 'es';
export const locales: Locale[] = ['ca', 'es'];
export const defaultLocale: Locale = 'ca';

import ca from './ca';
import es from './es';

const translations = { ca, es } as const;

export function t(locale: Locale, key: keyof typeof ca): string {
  return translations[locale][key] ?? translations.ca[key] ?? key;
}

export function getLocaleFromUrl(url: URL): Locale {
  const [, segment] = url.pathname.split('/');
  return segment === 'es' ? 'es' : 'ca';
}

export function getAlternateUrl(url: URL, targetLocale: Locale): string {
  const currentLocale = getLocaleFromUrl(url);
  const path = url.pathname;

  if (currentLocale === 'ca' && targetLocale === 'es') {
    return `/es${path}`;
  }
  if (currentLocale === 'es' && targetLocale === 'ca') {
    return path.replace(/^\/es/, '') || '/';
  }
  return path;
}
```

### wrangler.toml
```toml
name = "animals-vida-digna"
compatibility_date = "2025-08-15"
compatibility_flags = ["nodejs_compat"]

[[r2_buckets]]
binding = "IMAGES_BUCKET"
bucket_name = "animals-vida-digna-images"
```

### Keystatic Admin Route (dev-only SSR page)
```astro
---
// src/pages/keystatic/[...params].astro
export const prerender = false;

import { makeHandler } from '@keystatic/astro/internal';
import keystaticConfig from '../../../keystatic.config';

const handler = makeHandler({ config: keystaticConfig });
const response = await handler(Astro);
return response;
---
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `output: 'hybrid'` | Default static + adapter + `prerender: false` per route | Astro 5.0 (Dec 2024) | Config must NOT include `output: 'hybrid'` |
| `@astrojs/tailwind` integration | `@tailwindcss/vite` in `vite.plugins` | Tailwind v4 (Jan 2025) | Different config location and approach |
| `tailwind.config.js` | CSS `@theme` directive | Tailwind v4 | Theme defined in CSS, not JS |
| Astro Content Collections v1 | Content Layer API (v5) or Keystatic Reader | Astro 5.0 | Legacy content collections removed in Astro 6 |
| MessageChannel missing in Workers | Available with compat_date >= 2025-08-15 | Aug 2025 | React SSR on Workers now possible |

**Deprecated/outdated:**
- `output: 'hybrid'` -- removed in Astro 5, use default static + adapter
- `@astrojs/tailwind` -- deprecated for Tailwind v4, use `@tailwindcss/vite`
- `tailwind.config.js` / `tailwind.config.ts` -- replaced by CSS @theme in Tailwind v4
- `nodejs_compat_v2` flag name -- current flag is `nodejs_compat`

## Open Questions

1. **Keystatic `fields.blocks` API for landing sections**
   - What we know: Keystatic has `fields.blocks` for polymorphic content (different section types)
   - What's unclear: Exact API for defining multiple block types with different schemas, and whether blocks support reordering in the admin UI
   - Recommendation: Test during implementation; if blocks are not flexible enough, use a `fields.array` of `fields.conditional` instead

2. **Keystatic image fields for Phase 1**
   - What we know: Keystatic `fields.image` stores images in the repo (directory option)
   - What's unclear: Whether `fields.image` works well with an object wrapper (for adding alt_ca/alt_es), or if a plain text URL field + separate alt fields is better
   - Recommendation: Use `fields.object` with `fields.image` + text fields for alt. Test in admin UI.

3. **Preact + React coexistence without compat**
   - What we know: Do not enable Preact compat. Keystatic uses React, public site uses Preact.
   - What's unclear: Whether Astro correctly isolates the two when both integrations are loaded
   - Recommendation: Test with conditional loading. If conflicts arise, defer language switcher to vanilla JS.

4. **Astro 5 vs Astro 6 for this project**
   - What we know: Astro 6 has better CF dev experience (workerd in dev). But @keystatic/astro peer deps only list Astro 2-5.
   - What's unclear: Whether @keystatic/astro actually works with Astro 6 despite peer dep listing
   - Recommendation: Use Astro 5 for safety. Upgrade to 6 when Keystatic adds support.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^3.x (not yet installed) |
| Config file | none -- Wave 0 |
| Quick run command | `pnpm vitest run --reporter=verbose` |
| Full suite command | `pnpm vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | Astro builds and deploys to CF | smoke | `pnpm build` (exit code 0) | N/A - build command |
| FOUND-02 | Tailwind theme has brand colors | unit | `vitest run tests/theme.test.ts -x` | Wave 0 |
| FOUND-03 | Keystatic admin accessible in dev | manual-only | Manual: start dev, visit /keystatic | N/A |
| FOUND-04 | R2 bucket binding in wrangler.toml | unit | `vitest run tests/config.test.ts -x` | Wave 0 |
| I18N-01 | CA content at root paths | integration | `vitest run tests/i18n.test.ts -x` | Wave 0 |
| I18N-02 | ES content at /es paths | integration | `vitest run tests/i18n.test.ts -x` | Wave 0 |
| I18N-03 | Language switcher deep-links | unit | `vitest run tests/i18n.test.ts -x` | Wave 0 |
| I18N-04 | UI strings localized | unit | `vitest run tests/i18n.test.ts -x` | Wave 0 |
| I18N-05 | No auto language redirect | integration | `vitest run tests/i18n.test.ts -x` | Wave 0 |
| CMS-01 | Settings singleton schema | unit | `vitest run tests/schemas.test.ts -x` | Wave 0 |
| CMS-02 | Cats collection schema | unit | `vitest run tests/schemas.test.ts -x` | Wave 0 |
| CMS-03 | Landing sections schema | unit | `vitest run tests/schemas.test.ts -x` | Wave 0 |
| CMS-04 | Pages collection schema | unit | `vitest run tests/schemas.test.ts -x` | Wave 0 |
| CMS-05 | Image alt text bilingual | unit | `vitest run tests/schemas.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm build` (verifies build succeeds)
- **Per wave merge:** `pnpm vitest run`
- **Phase gate:** `pnpm build` succeeds + Keystatic admin loads in dev + i18n routes resolve

### Wave 0 Gaps
- [ ] `vitest.config.ts` -- Vitest configuration
- [ ] `tests/i18n.test.ts` -- i18n helpers and URL generation
- [ ] `tests/schemas.test.ts` -- Keystatic schema validation (field existence, required fields)
- [ ] `tests/config.test.ts` -- wrangler.toml has R2 binding, Tailwind theme has brand colors
- [ ] Framework install: `pnpm add -D vitest`

## Sources

### Primary (HIGH confidence)
- [Astro on-demand rendering docs](https://docs.astro.build/en/guides/on-demand-rendering/) -- output mode changes, adapter config
- [Astro Cloudflare adapter docs](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) -- adapter options, wrangler config, Astro 6 changes
- [Tailwind CSS Astro installation guide](https://tailwindcss.com/docs/installation/framework-guides/astro) -- exact v4 setup steps
- [Keystatic Reader API docs](https://keystatic.com/docs/reader-api) -- content reading API
- [Keystatic Astro installation docs](https://keystatic.com/docs/installation-astro) -- integration setup
- npm registry -- verified all package versions and peer dependencies (2026-03-17)

### Secondary (MEDIUM confidence)
- [Astro 6 beta blog post](https://astro.build/blog/astro-6-beta/) -- Astro 6 features and breaking changes
- [Astro upgrade to v6 guide](https://docs.astro.build/en/guides/upgrade-to/v6/) -- migration details
- [Blog: Astro + Keystatic on Cloudflare](https://allthingstech.ch/blog/how-i-built-this-blog-with-astro-keystatic-and-claude-code/) -- conditional loading pattern
- [Cloudflare changelog: MessageChannel](https://developers.cloudflare.com/changelog/post/2025-08-11-messagechannel/) -- MessageChannel availability
- [Keystatic GitHub Issue #1497](https://github.com/Thinkmill/keystatic/issues/1497) -- OAuth on Cloudflare Pages bug

### Tertiary (LOW confidence)
- Keystatic `fields.blocks` API -- limited documentation found, needs testing during implementation
- Preact + React coexistence in Astro -- documented pattern but untested for this specific combination

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified via npm registry, peer deps checked
- Architecture: HIGH -- output mode change verified via official docs, patterns proven in production blogs
- Pitfalls: HIGH -- critical pitfalls (output:hybrid removal, Keystatic+CF) verified with official sources
- Keystatic schema details: MEDIUM -- fields.blocks API needs hands-on testing

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable ecosystem, 30-day window appropriate)
