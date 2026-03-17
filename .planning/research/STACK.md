# Technology Stack

**Project:** Animals Vida Digna -- Cat Shelter Website
**Researched:** 2026-03-17
**Overall Confidence:** MEDIUM (versions based on training data through mid-2025; verify with `npm view <pkg> version` before installing)

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Astro | ^5.x | Static site generator with islands architecture | Content-heavy site with minimal JS; built-in i18n routing; Cloudflare adapter; perfect for shelter site that is 95% static HTML | MEDIUM |
| TypeScript | ^5.7 | Type safety | Astro, Keystatic, and all tooling have first-class TS support; catches i18n key mismatches at build time | HIGH |
| Node.js | >=20.x | Runtime | Required by Astro 5; LTS version with native fetch support | HIGH |
| pnpm | ^9.x | Package manager | Already in use; fast, disk-efficient, strict dependency resolution | HIGH |

**Why Astro 5 specifically:** Astro 5 introduced Content Layer API (replacing Content Collections v1), improved `astro:content` with type-safe schemas, better Cloudflare Workers support, and stable Server Islands. Astro 4 is viable but the Content Layer API in v5 is a significant improvement for CMS-driven sites.

### CMS

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @keystatic/core | ^0.5.x | Content management | Git-backed CMS; no database; visual editor for non-technical staff; schema-as-code; works with Astro's content layer | MEDIUM |
| @keystatic/astro | ^5.x | Astro integration | Provides Keystatic admin UI route within Astro; handles reader API integration | MEDIUM |

**Keystatic operating mode:** Use **local mode** for development and **GitHub mode** for production. In GitHub mode, Keystatic commits content changes directly to the repo, triggering Cloudflare Pages/Workers rebuild. This means shelter staff edit content through the Keystatic admin UI, which creates a git commit, which triggers a deploy.

**IMPORTANT Keystatic + Cloudflare caveat:** Keystatic's admin UI requires a server-rendered route (`/keystatic`). On Cloudflare, this means the site needs `output: 'hybrid'` (static by default, server routes where needed) or `output: 'server'` with `prerender: true` on static pages. Hybrid mode is the correct choice -- it keeps most pages static while allowing the `/keystatic` admin route and API endpoints (contact form, etc.) to run on Workers.

### Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| TailwindCSS | ^4.x | Utility-first CSS | Project requirement; excellent for component-based design; Astro has first-class support | MEDIUM |
| @astrojs/tailwind | ^6.x (if still needed) | Astro + Tailwind integration | Handles PostCSS/Vite config automatically. NOTE: With Tailwind v4, this integration may have changed -- Tailwind v4 uses a CSS-first config approach and may work via a simple CSS import without an integration. Verify at install time. | LOW |

**Tailwind v4 vs v3:** Tailwind v4 dropped the `tailwind.config.js` file in favor of CSS-based configuration (`@theme` directive). If this causes friction with tooling, falling back to Tailwind v3 (`^3.4`) is perfectly fine -- it is stable and well-documented. For a nonprofit shelter site, v3 stability may be preferable over v4's newer paradigm.

**Recommendation:** Start with Tailwind v4. If integration issues arise with Astro or Keystatic, fall back to v3 without hesitation.

### Deployment & Infrastructure

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @astrojs/cloudflare | ^12.x | Astro adapter for CF Workers | Compiles Astro server routes to Workers-compatible format; handles bindings (R2, KV, etc.) | MEDIUM |
| Cloudflare Workers | -- | Server runtime | Runs SSR routes (Keystatic admin, form handlers); free tier generous for nonprofit | HIGH |
| Cloudflare R2 | -- | Object storage for images | S3-compatible; no egress fees; direct integration via Worker bindings; stores cat photos, hero images | HIGH |
| Cloudflare Image Resizing | -- | Responsive image delivery | On-the-fly resize/format conversion via `cdn-cgi/image/` URL prefix; no build-time image processing needed | HIGH |
| Wrangler | ^3.x | CLI for Cloudflare deployment | Deploys Workers, manages R2 buckets, local dev with miniflare | HIGH |

**Deployment model:** Use Cloudflare Pages (which runs on Workers under the hood) rather than raw Workers. Pages provides git-based deployments, preview deployments per branch, and automatic HTTPS. The `@astrojs/cloudflare` adapter handles both Pages and Workers deployment targets.

### Email

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| resend | ^4.x | Transactional email SDK | Simple API; good deliverability; generous free tier (100 emails/day); project requirement | MEDIUM |
| @react-email/components | ^0.x | Email templates | JSX email templates that render to HTML; works with Resend; type-safe | MEDIUM |

**Email architecture:** Contact and adoption forms POST to an Astro API route (`src/pages/api/contact.ts`) that runs on Cloudflare Workers. The route validates input, sends email via Resend, and returns a JSON response. No React needed on the client -- the form itself is plain HTML with progressive enhancement.

### i18n (Internationalization)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Astro built-in i18n | (part of Astro) | Route-based locale handling | Astro 4+ has built-in i18n routing: `defaultLocale: 'ca'`, `locales: ['ca', 'es']`, path-based routing. No library needed. | HIGH |

**No external i18n library needed.** Astro's built-in i18n provides:
- Path-based routing: `/about` (Catalan), `/es/about` (Spanish)
- `getRelativeLocaleUrl()` for language switcher links
- Middleware for locale detection (though we do NOT auto-redirect per project constraints)
- Type-safe locale configuration

**Translation strings approach:** Use a simple `src/i18n/` directory with TypeScript objects:
```
src/i18n/
  ui.ts        # UI strings: { ca: { nav.home: "Inici" }, es: { nav.home: "Inicio" } }
  utils.ts     # Helper: useTranslations(locale) returns t() function
```
No need for i18next or similar -- the site has two locales and finite UI strings. Keep it simple.

**Content localization (cats, pages):** Handled at the Keystatic schema level with localized fields (`name_ca`, `name_es`, `description_ca`, `description_es`). The Astro page reads the correct field based on the current locale.

### SEO & Metadata

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @astrojs/sitemap | ^3.x | XML sitemap generation | Auto-generates sitemap with hreflang annotations for both locales | HIGH |
| astro-seo | ^0.8.x | SEO meta tags component | Provides `<SEO>` component for OpenGraph, Twitter cards, JSON-LD; less boilerplate than manual `<meta>` tags | MEDIUM |

**Alternative to astro-seo:** Astro's built-in `<head>` and `Astro.props` are sufficient for SEO. If you prefer no extra dependency, just build a `<SEO>` component manually. For a bilingual site, the manual approach gives more control over hreflang tags.

### Image Handling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Astro `<Image>` component | (part of Astro) | Optimized image rendering | Built-in `astro:assets` provides `<Image>` and `<Picture>` components with lazy loading, dimensions, format hints | HIGH |

**Image pipeline:**
1. Staff uploads cat photos through Keystatic admin
2. Images stored in R2 via a Worker-signed upload URL
3. Pages reference R2 image URLs
4. Cloudflare Image Resizing serves responsive variants on the fly: `/cdn-cgi/image/width=400,format=auto/[r2-url]`
5. The `<Image>` component or a custom `<CatImage>` component generates srcset with CF Image Resizing URLs

**No `sharp` or `@astrojs/image` needed** -- Cloudflare Image Resizing replaces build-time image optimization entirely.

### Form Handling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zod | ^3.x | Form validation | Schema validation for contact/adoption form data on the server side; Astro already depends on Zod internally | HIGH |

**No form library on the client.** Forms are plain HTML `<form>` elements that POST to Astro API routes. Progressive enhancement with a small island component (Preact or vanilla JS) for inline validation and AJAX submission. No React, no Formik, no React Hook Form.

### UI Islands (Interactive Components)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @astrojs/preact | ^4.x | Interactive islands | Lighter than React (3KB vs 40KB+); sufficient for image galleries, filter UI, language switcher, form enhancement | HIGH |
| preact | ^10.x | UI library for islands | API-compatible with React but much smaller; perfect for islands architecture where JS budget matters | HIGH |

**Why Preact over React:** The site needs minimal interactivity -- image carousel, cat filter, form validation, language switcher. Preact delivers this at a fraction of React's bundle size. Keystatic admin uses React internally but that is a separate admin route, not the public site.

**Why not vanilla JS:** A cat filter with state management (breed, age, status checkboxes) is cleaner as a Preact component than vanilla DOM manipulation. The gallery/carousel also benefits from component state.

### Accessibility

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @axe-core/cli | ^4.x | Automated a11y testing | Catches WCAG AA violations in CI; runs against built pages | HIGH |
| pa11y | ^8.x | Alternative a11y testing | Page-level accessibility testing; good for CI integration | MEDIUM |

### Development & Quality

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Biome | ^2.x | Linter + formatter | Already in use in current project; replaces ESLint + Prettier with a single fast tool | HIGH |
| Vitest | ^3.x | Unit/integration tests | Vite-native test runner; works with Astro's Vite-based build; fast | HIGH |
| Playwright | ^1.x | E2E testing | Tests full pages including i18n routing, form submission, image loading | MEDIUM |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Astro 5 | Next.js 15 | Overkill for content site; more complex CF deployment; current stack already uses it and project is explicitly moving away |
| CMS | Keystatic | Payload CMS | Requires database (PostgreSQL); heavier; current stack uses it and project is moving away for simplicity |
| CMS | Keystatic | Sanity | External hosted CMS; vendor lock-in; monthly cost for media; git-backed is simpler for this scale |
| CMS | Keystatic | Tina CMS | Similar to Keystatic but less mature Astro integration; Keystatic's API is cleaner |
| Styling | TailwindCSS | UnoCSS | Compatible alternative but Tailwind has larger ecosystem, more component libraries, better docs |
| Islands | Preact | React | 40KB+ bundle for minimal interactivity is wasteful; Preact is API-compatible at 3KB |
| Islands | Preact | Svelte | Good option but team familiarity with JSX (from existing Next.js codebase) favors Preact |
| Islands | Preact | Alpine.js | Fine for simple interactions but cat filter state management is cleaner in a component model |
| Email | Resend | SendGrid | More complex API; overkill pricing for nonprofit volume; Resend's DX is superior |
| i18n | Built-in Astro | i18next | External library adds complexity for just 2 locales; Astro's built-in routing handles path-based locales natively |
| Validation | Zod | Yup | Zod has better TypeScript inference; Astro already uses Zod internally for content schemas |
| Testing | Vitest | Jest | Vitest is Vite-native (Astro uses Vite); faster, better ESM support |
| Formatter | Biome | ESLint + Prettier | Biome is faster, single tool, already configured in this project |

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| React (for public site) | Too heavy for islands; use Preact instead. Keep React only for Keystatic admin (it bundles its own). |
| next-intl / i18next | Overkill for 2 locales. Astro built-in i18n + simple TS objects is sufficient. |
| Prisma / Drizzle | No database. Keystatic is git-backed. Content is markdown/JSON in the repo. |
| Vercel Blob | Moving away from Vercel. R2 is the image storage. |
| sharp | No build-time image processing. Cloudflare Image Resizing handles everything at the edge. |
| @astrojs/image (legacy) | Deprecated in favor of `astro:assets` built-in. |
| Framer Motion | Too heavy for simple animations. Use CSS transitions/animations or Astro view transitions. |
| Storybook | Overkill for a nonprofit site with limited components. Test in-page instead. |
| MDX | Keystatic handles rich content. Pages are Astro components, not MDX files. |

## Installation

```bash
# Core framework
pnpm add astro @astrojs/cloudflare @astrojs/sitemap

# CMS
pnpm add @keystatic/core @keystatic/astro

# Styling (verify Tailwind v4 Astro integration at install time)
pnpm add tailwindcss
# If using Tailwind v4 with Astro, may need:
# pnpm add @tailwindcss/vite
# If Tailwind v4 causes issues, fall back to:
# pnpm add tailwindcss@3 @astrojs/tailwind postcss autoprefixer

# Islands
pnpm add preact @astrojs/preact

# Email
pnpm add resend

# Validation
pnpm add zod

# Dev dependencies
pnpm add -D typescript wrangler vitest @biomejs/biome
# Optional: pnpm add -D playwright @axe-core/cli
```

## Key Configuration Notes

### astro.config.mjs (skeleton)

```typescript
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import preact from '@astrojs/preact';
import keystatic from '@keystatic/astro';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  output: 'hybrid',          // Static by default, server where needed
  adapter: cloudflare({
    imageService: 'cloudflare', // Use CF Image Resizing
  }),
  site: 'https://animalsvida digna.org', // Update with actual domain
  i18n: {
    defaultLocale: 'ca',
    locales: ['ca', 'es'],
    routing: {
      prefixDefaultLocale: false, // ca at root (/), es at /es/
    },
  },
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
});
```

### wrangler.toml (skeleton)

```toml
name = "animals-vida-digna"
compatibility_date = "2025-01-01"

[site]
bucket = "./dist"

[[r2_buckets]]
binding = "IMAGES_BUCKET"
bucket_name = "animals-vida-digna-images"
```

## Version Verification Needed

**IMPORTANT:** All versions listed are based on training data through mid-2025. Before installing, run:

```bash
npm view astro version
npm view @keystatic/core version
npm view @keystatic/astro version
npm view @astrojs/cloudflare version
npm view tailwindcss version
npm view resend version
npm view @astrojs/preact version
npm view @astrojs/sitemap version
```

Key areas where versions may have changed significantly:
- **Astro:** v5 was stable as of early 2025; may be on v5.x minor or even v6
- **@astrojs/cloudflare:** This adapter has had breaking changes between majors; verify compatibility with current Astro version
- **Keystatic:** Was still on 0.x (pre-1.0) as of mid-2025; API may have changed
- **TailwindCSS v4:** Was newly released in early 2025; Astro integration may have matured

## Sources

- Astro documentation (astro.build/docs) -- HIGH confidence for architecture patterns
- Keystatic documentation (keystatic.com/docs) -- HIGH confidence for CMS patterns
- Cloudflare Workers/R2 documentation (developers.cloudflare.com) -- HIGH confidence for infrastructure
- Resend documentation (resend.com/docs) -- HIGH confidence for email integration
- TailwindCSS documentation (tailwindcss.com/docs) -- HIGH confidence for styling patterns
- Training data (through mid-2025) -- MEDIUM confidence for specific version numbers
