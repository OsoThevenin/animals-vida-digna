# Architecture Patterns

**Domain:** Nonprofit cat shelter website (content-heavy, minimal interactivity)
**Researched:** 2026-03-17
**Confidence:** MEDIUM (training data only -- WebSearch/WebFetch/Context7 unavailable)

## Recommended Architecture

**Hybrid SSG + SSR Astro site with Keystatic git-backed CMS, deployed on Cloudflare Workers with R2 image storage.**

The system has four distinct layers:

```
[Browser] <-- static HTML + island JS
    |
[Cloudflare Workers] <-- serves pre-rendered pages + handles SSR API routes
    |
[Cloudflare R2] <-- image storage + Cloudflare Image Resizing
    |
[Git repo / Keystatic] <-- content source of truth (YAML/JSON/MDX files)
```

### Why This Shape

1. **Content-heavy, low-interactivity** -- the vast majority of pages (landing, cat listings, cat detail, about) are static content. Pre-rendering at build time gives maximum performance and zero cold-start cost.
2. **SSR only where needed** -- contact/adoption form submissions and the Keystatic admin API require server-side processing. Cloudflare Workers handles these endpoints.
3. **Git-backed content** -- Keystatic stores content as files in the repo. No database to manage, no connection strings, no cold starts. Content changes trigger a rebuild and redeploy.
4. **R2 for images** -- images uploaded through Keystatic's admin UI get stored in R2. Cloudflare Image Resizing transforms them on-the-fly at the CDN edge (no build-time image processing needed).

## Project Structure

```
/
├── astro.config.mjs           # Astro config (Cloudflare adapter, i18n, integrations)
├── keystatic.config.tsx        # Keystatic schema (collections + singletons)
├── wrangler.toml              # Cloudflare Workers config (R2 bindings, routes)
├── public/
│   └── images/                # Static brand assets (logo, hero)
├── src/
│   ├── content/               # Keystatic-managed content (git-tracked)
│   │   ├── cats/              # One YAML/JSON file per cat
│   │   │   ├── misha.yaml
│   │   │   └── luna.yaml
│   │   ├── pages/             # Singleton page content
│   │   │   ├── home.yaml      # Landing section content (hero, stats, about, etc.)
│   │   │   └── contact.yaml
│   │   └── settings/          # Global settings (site title, social, Teaming URL)
│   │       └── global.yaml
│   ├── components/            # Astro + framework components
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── CatCard.astro
│   │   ├── ui/               # Shared UI primitives
│   │   └── islands/          # Preact islands (interactive, hydrated on client)
│   │       ├── CatGallery.tsx     # Swipeable photo gallery
│   │       ├── CatFilters.tsx     # Filter controls (status, age, etc.)
│   │       ├── FormEnhancer.tsx   # AJAX form submission + validation
│   │       └── LanguageSwitcher.tsx
│   ├── layouts/
│   │   └── BaseLayout.astro   # HTML shell, meta, i18n, global styles
│   ├── pages/
│   │   ├── index.astro        # CA landing (default locale)
│   │   ├── gats/
│   │   │   ├── index.astro    # CA cat listing
│   │   │   └── [slug].astro   # CA cat detail
│   │   ├── contacte.astro     # CA contact page
│   │   ├── es/                # ES locale mirror
│   │   │   ├── index.astro
│   │   │   ├── gatos/
│   │   │   │   ├── index.astro
│   │   │   │   └── [slug].astro
│   │   │   └── contacto.astro
│   │   ├── api/
│   │   │   ├── contact.ts     # Form submission -> Resend email
│   │   │   └── adoption.ts    # Adoption inquiry -> Resend email
│   │   └── keystatic/         # Keystatic admin route (auto-generated)
│   │       └── [...params].astro
│   ├── lib/
│   │   ├── i18n.ts            # Translation strings + locale helpers
│   │   ├── content.ts         # Content reading helpers (wraps Keystatic reader)
│   │   ├── email.ts           # Resend email sending
│   │   └── images.ts          # R2 URL helpers + Image Resizing URL builder
│   ├── styles/
│   │   └── global.css         # TailwindCSS imports + custom properties
│   └── types/
│       └── content.ts         # TypeScript types (auto-generated from Keystatic schema)
└── functions/                 # (Optional) Cloudflare Workers functions if needed
    └── _middleware.ts         # Edge middleware for redirects, headers
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Astro Pages** | Route handling, data loading, HTML rendering | Keystatic Reader, Layout, Components |
| **Keystatic Config** | Content schema definition, admin UI config | Content files in `src/content/` |
| **Keystatic Reader** | Type-safe content reading API | Content files (read), Astro Pages (consumed by) |
| **Preact Islands** | Interactive UI (gallery, filters, form enhancement) | Browser APIs, API routes (form POST) |
| **API Routes** | Server-side form processing | Resend API, form data from islands |
| **BaseLayout** | HTML shell, SEO meta, hreflang, global nav | i18n helpers, all pages |
| **i18n Module** | Translation strings, locale detection, URL mapping | Pages, Layout, Components |
| **R2 + Image Resizing** | Image storage and on-demand transformation | Keystatic (upload), Pages (display) |
| **Cloudflare Workers** | Serves built output, runs SSR endpoints | All server-side components |

### Data Flow

#### Content Authoring Flow
```
Shelter staff -> Keystatic Admin UI (localhost or GitHub mode)
  -> Edits content files in src/content/
  -> Git commit + push
  -> CI/CD rebuild
  -> Cloudflare Pages/Workers deploys new static build
```

#### Page Render Flow (Static -- majority of pages)
```
Build time:
  Keystatic Reader reads src/content/ files
  -> Astro generates static HTML per route per locale
  -> HTML references R2 image URLs via Cloudflare Image Resizing
  -> Output deployed to Cloudflare

Runtime:
  Browser requests /gats/misha
  -> Cloudflare CDN serves pre-rendered HTML (instant, no compute)
  -> Browser hydrates Preact islands (gallery, filters) only when visible
```

#### Form Submission Flow (SSR)
```
User fills contact form (plain HTML <form>)
  -> FormEnhancer.tsx island intercepts submit (progressive enhancement)
  -> POST to /api/contact (Astro SSR endpoint on Cloudflare Workers)
  -> Server validates input with Zod
  -> Calls Resend API to send email
  -> Returns success/error JSON
  -> Island shows confirmation message

Fallback (no JS): form POSTs natively, server returns redirect with status
```

#### Image Upload Flow
```
Staff uploads image in Keystatic admin
  -> Image stored to R2 bucket via Worker-signed URL or local during dev
  -> Content file references R2 object key
  -> At render time, image URL constructed with Cloudflare Image Resizing params
  -> e.g., /cdn-cgi/image/width=400,format=auto/r2-bucket/cats/misha-1.jpg
```

## Patterns to Follow

### Pattern 1: Content-Driven i18n with Localized Fields

Store both languages in a single content file per entity. Use field suffixes for locale-specific content.

**What:** Each cat (or page) has `name_ca`, `name_es`, `description_ca`, `description_es` fields in a single file. Shared fields (age, status, photos) are locale-independent.

**Why:** Avoids content duplication. Editors see all languages together. No risk of orphaned translations.

**Example Keystatic schema:**
```typescript
// keystatic.config.tsx
import { config, collection, fields } from '@keystatic/core';

export default config({
  storage: { kind: 'local' }, // or 'github' for production
  collections: {
    cats: collection({
      label: 'Gats',
      slugField: 'slug_ca',
      path: 'src/content/cats/*',
      schema: {
        // Locale-specific fields
        slug_ca: fields.slug({ name: { label: 'Slug (CA)' } }),
        slug_es: fields.text({ label: 'Slug (ES)' }),
        name_ca: fields.text({ label: 'Nom (CA)', validation: { isRequired: true } }),
        name_es: fields.text({ label: 'Nombre (ES)', validation: { isRequired: true } }),
        description_ca: fields.text({ label: 'Descripci (CA)', multiline: true }),
        description_es: fields.text({ label: 'Descripcion (ES)', multiline: true }),
        // Shared fields
        age: fields.integer({ label: 'Edat (anys)' }),
        gender: fields.select({
          label: 'Genere',
          options: [
            { label: 'Mascle', value: 'male' },
            { label: 'Femella', value: 'female' },
          ],
          defaultValue: 'male',
        }),
        status: fields.select({
          label: 'Estat',
          options: [
            { label: 'Disponible', value: 'available' },
            { label: 'Adoptat', value: 'adopted' },
            { label: 'En Tractament', value: 'treatment' },
          ],
          defaultValue: 'available',
        }),
        photo: fields.image({ label: 'Foto principal', directory: 'public/images/cats' }),
        featured: fields.checkbox({ label: 'Destacat', defaultValue: false }),
      },
    }),
  },
});
```

### Pattern 2: Astro Islands with Preact for Interactivity

Use Astro's static-first approach. Only hydrate interactive components with Preact (not React).

**What:** Most of the site is static Astro components. Only CatGallery (swipeable carousel), CatFilters (reactive filtering), and FormEnhancer (validation + AJAX submission) need client-side JS. These are Preact components, not React -- 3KB vs 40KB+ bundle cost.

**When:** Any component that responds to user interaction beyond link clicks.

**Example:**
```astro
---
// src/pages/gats/[slug].astro
import BaseLayout from '../../layouts/BaseLayout.astro';
import Gallery from '../../components/islands/CatGallery.tsx';
import { getEntry } from '../../lib/content';

const { slug } = Astro.params;
const cat = await getEntry('cats', slug, 'ca');
---
<BaseLayout title={cat.name_ca}>
  <h1>{cat.name_ca}</h1>
  <!-- Static: no JS shipped -->
  <p>{cat.description_ca}</p>

  <!-- Interactive: hydrated only when visible in viewport (lazy) -->
  <Gallery client:visible photos={cat.photos} alt={cat.name_ca} />
</BaseLayout>
```

**Why Preact over React:** The public site needs minimal interactivity. Keystatic admin bundles its own React internally -- that is isolated to `/keystatic` routes and does not affect public page bundle size. Do NOT enable `compat: true` in the Preact integration, as it would alias React imports and break Keystatic's admin UI.

### Pattern 3: Shared Content Helper with Locale Parameter

Centralize content reading to avoid locale logic duplication across pages.

**What:** A `lib/content.ts` module wraps Keystatic's reader and provides locale-aware accessors that return the right `_ca` or `_es` field based on the requested locale.

**Example:**
```typescript
// src/lib/content.ts
import { createReader } from '@keystatic/reader';
import keystaticConfig from '../../keystatic.config';

const reader = createReader(process.cwd(), keystaticConfig);

type Locale = 'ca' | 'es';

export async function getCats(locale: Locale) {
  const allCats = await reader.collections.cats.all();
  return allCats
    .filter(cat => cat.entry.status === 'available')
    .map(cat => ({
      slug: locale === 'ca' ? cat.slug : cat.entry.slug_es,
      name: cat.entry[`name_${locale}`],
      description: cat.entry[`description_${locale}`],
      // Shared fields pass through
      age: cat.entry.age,
      gender: cat.entry.gender,
      photo: cat.entry.photo,
      featured: cat.entry.featured,
    }));
}
```

### Pattern 4: Cloudflare Image Resizing URLs

Construct responsive image URLs using Cloudflare's built-in Image Resizing.

**What:** Instead of generating multiple image sizes at build time, use Cloudflare Image Resizing to transform images on-demand at the CDN edge.

**Example:**
```typescript
// src/lib/images.ts
export function imageUrl(
  src: string,
  options: { width?: number; height?: number; format?: 'auto' | 'webp' | 'avif'; fit?: 'cover' | 'contain' }
) {
  const params = Object.entries(options)
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join(',');
  return `/cdn-cgi/image/${params}/${src}`;
}
```

### Pattern 5: Progressive Enhancement for Forms

**What:** HTML forms that work without JavaScript. Preact island enhances with AJAX + client validation.
**When:** All forms (contact, adoption).

```astro
<!-- src/pages/contacte.astro -->
<form action="/api/contact" method="POST" id="contact-form">
  <label for="name">{t('form.name')}</label>
  <input id="name" name="name" required />

  <label for="email">{t('form.email')}</label>
  <input id="email" name="email" type="email" required />

  <label for="message">{t('form.message')}</label>
  <textarea id="message" name="message" required></textarea>

  <button type="submit">{t('form.submit')}</button>
</form>

<!-- Progressive enhancement: AJAX submission + inline validation -->
<FormEnhancer client:load formId="contact-form" locale="ca" />
```

The form works without JS (native POST + server redirect). The Preact island adds:
- Client-side validation feedback before submit
- AJAX submission (no page reload)
- Loading state and success/error messages

## Anti-Patterns to Avoid

### Anti-Pattern 1: Using Astro Content Collections Instead of Keystatic Reader
**What:** Defining content schemas in Astro's `src/content/config.ts` AND in `keystatic.config.tsx`, creating duplicate schema definitions.
**Why bad:** Two sources of truth for content shape. Schema drift causes runtime errors. Keystatic's reader already provides type-safe access.
**Instead:** Use Keystatic's reader API (`@keystatic/reader`) as the sole content access layer. Do NOT use Astro's `getCollection()` / `getEntry()` for Keystatic-managed content. Keystatic writes files that Astro Content Collections could read, but the schema should live only in `keystatic.config.tsx`.

### Anti-Pattern 2: Hydrating Everything with Preact/React
**What:** Using Preact components with `client:load` for static content like headers, footers, cat cards.
**Why bad:** Ships unnecessary JavaScript. Kills Lighthouse performance scores. Defeats the purpose of Astro's islands architecture.
**Instead:** Use `.astro` components for everything static. Reserve Preact (with `client:visible` or `client:idle`) only for truly interactive elements: gallery carousel, filter controls, form enhancement.

### Anti-Pattern 3: Separate Content Files Per Locale
**What:** Having `src/content/cats/ca/misha.yaml` and `src/content/cats/es/misha.yaml` as separate files.
**Why bad:** Content duplication for shared fields (photos, status, age). Editors must update two files for each cat. Shared field drift.
**Instead:** Single file per entity with `_ca` / `_es` field suffixes for translatable fields. Shared fields (photos, dates, status) defined once.

### Anti-Pattern 4: Build-Time Image Processing
**What:** Using `@astrojs/image` or sharp to generate responsive image variants at build time.
**Why bad:** Dramatically increases build time as cat count grows. Requires sharp in the build environment (not available on Cloudflare). Generates hundreds of files.
**Instead:** Use Cloudflare Image Resizing with on-demand URL-based transforms. Zero build cost, CDN-cached.

### Anti-Pattern 5: Full SSR Mode
**What:** Setting `output: 'server'` globally and rendering all pages on every request.
**Why bad:** Cold starts on Workers, higher compute costs, slower TTFB for content that changes infrequently (cats update weekly, not per-second).
**Instead:** Use `output: 'hybrid'` (default static, opt-in SSR per route). Only form API endpoints and the Keystatic admin route need SSR. Everything else pre-renders at build time.

### Anti-Pattern 6: Enabling Preact compat mode
**What:** Setting `compat: true` in `@astrojs/preact` integration config.
**Why bad:** Aliases all `react`/`react-dom` imports to `preact/compat` globally, including Keystatic's internal React. Breaks Keystatic admin UI.
**Instead:** Use Preact natively for public-site islands. Keystatic manages its own React bundle internally.

## Architecture Decision: Hybrid Output Mode

**Decision:** Use Astro's `output: 'hybrid'` mode.

- **Default: pre-rendered (static)** -- landing page, cat listings, cat details, about pages. These change only when content is edited and rebuilt.
- **Opt-in SSR** -- API routes (`/api/contact`, `/api/adoption`) and Keystatic admin (`/keystatic/[...params]`).

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import preact from '@astrojs/preact';
import keystatic from '@keystatic/astro';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  output: 'hybrid',
  adapter: cloudflare({
    imageService: 'cloudflare',
  }),
  site: 'https://animalsvidadigna.org', // Update with actual domain
  integrations: [
    preact(),
    keystatic(),
    sitemap({
      i18n: {
        defaultLocale: 'ca',
        locales: { ca: 'ca', es: 'es' },
      },
    }),
  ],
  i18n: {
    defaultLocale: 'ca',
    locales: ['ca', 'es'],
    routing: {
      prefixDefaultLocale: false, // ca at root, es under /es
    },
  },
});
```

## Architecture Decision: Keystatic Storage Mode

**Development:** `storage: { kind: 'local' }` -- reads/writes directly to filesystem. Keystatic admin runs at `/keystatic` as part of the Astro dev server.

**Production:** `storage: { kind: 'github', repo: 'owner/animals-vida-digna' }` -- Keystatic admin (if deployed) commits directly to the GitHub repo, triggering a rebuild. Alternatively, staff edits content locally and pushes, which is simpler for a small team.

**Recommendation:** Start with local-only. The shelter staff are the developer (or work closely with them). GitHub mode adds OAuth complexity that may not be worth it for a small nonprofit. If staff need to edit content independently, add GitHub mode in a later phase.

## Architecture Decision: Image Storage with R2

```
Upload flow:
  Keystatic admin -> local file during dev (public/images/cats/)
  CI/CD pipeline -> syncs images to R2 bucket
  OR
  Custom upload Worker -> signs R2 PUT URL -> direct browser upload to R2

Display flow:
  Astro template references image path
  -> Cloudflare Image Resizing transforms at edge
  -> Cached at CDN
```

**Key consideration:** Keystatic natively handles images as local files in the repo. For a small shelter with maybe 50-100 cat photos, storing images in the git repo (under `public/images/cats/`) is viable and much simpler than R2 integration. R2 becomes necessary only if the image volume grows large enough to bloat the repo.

**Recommendation:** Phase 1 stores images in the repo (Keystatic default). Phase 2+ migrates to R2 if needed. This avoids early complexity with signed URLs and Worker middleware.

## Scalability Considerations

| Concern | Current (~30 cats) | Growth (~200 cats) | Large (~1000+ cats) |
|---------|--------------------|--------------------|---------------------|
| Build time | <30s, no issue | 1-2min, acceptable | 3-5min, consider ISR or pagination |
| Image storage | Git repo (~50MB) | Git repo bloating (~500MB) | Must use R2 |
| Content editing | Local Keystatic | May need GitHub mode | Definitely GitHub mode |
| Page count | ~80 pages (2 locales) | ~500 pages | ~2500 pages, consider dynamic routes |
| Search | Client-side filter | Client-side filter | May need server-side search |

For a cat shelter, the 200-cat tier is likely the ceiling. The architecture handles this comfortably.

## Sources

- Astro documentation (training data, May 2025 -- covers hybrid mode, i18n routing, Cloudflare adapter)
- Keystatic documentation (training data -- covers Astro integration, reader API, storage modes)
- Cloudflare Workers/R2 documentation (training data -- covers Image Resizing, R2 bindings)
- Existing codebase analysis (`payload.config.ts`, Cats collection, sections, queries)

**NOTE:** WebSearch, WebFetch, and Context7 were unavailable during this research. All findings are based on training data (cutoff May 2025). Confidence is MEDIUM. Verify Astro Cloudflare adapter API and Keystatic Astro integration API against current docs before implementation.
