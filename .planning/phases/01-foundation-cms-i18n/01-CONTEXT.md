# Phase 1: Foundation, CMS & i18n - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy a working Astro 5 hybrid-mode skeleton to Cloudflare Workers with Keystatic CMS operational, all content schemas defined with CA/ES localized fields, TailwindCSS theme from brand assets, and bilingual path-based routing. No public pages beyond a minimal layout — Phase 2 builds the visible UI.

</domain>

<decisions>
## Implementation Decisions

### Astro + Cloudflare Setup
- Astro 5 with `output: 'hybrid'` — static pages by default, SSR for Keystatic admin and API routes
- `@astrojs/cloudflare` adapter with `platformProxy` for local dev via `wrangler`
- Deploy a hello-world to Cloudflare Workers on day one before any feature code — validate the integration immediately
- R2 bucket binding configured in `wrangler.toml` (actual upload workflow is Phase 3)
- `nodejs_compat_v2` compatibility flag enabled for Workers runtime

### TailwindCSS Theme
- Derive primary/accent colors from existing `logo.webp` brand assets in `public/images/`
- Use Tailwind v4 with `@tailwindcss/vite` plugin for Astro integration
- Design tokens: warm, approachable palette befitting a cat shelter nonprofit — not corporate
- Keep existing nav structure feel: sticky header, donate CTA in header, anchor-linked sections

### Keystatic CMS Schema
- Single entity per content type with `_ca`/`_es` field suffixes for localization (no separate collections per locale)
- **settings** singleton: siteName_ca/es, logo, primaryColor, social links, donateUrl (Teaming), contactEmail, defaultSEO (title/desc/image per locale)
- **cats** collection: slug_ca/es, name_ca/es, status (adoptable/adopted/treatment/unavailable), age, gender, size, personality (multi-select), goodWith (multi-select), healthStatus, vaccinated/microchipped/sterilized booleans, weight, rescueDate, adoptionDate, coverImage (url + alt_ca/es), gallery array (url + alt_ca/es), shortDescription_ca/es, description_ca/es (MDX), featured, order, SEO per locale
- **landing** singleton: sections array of typed blocks (hero, about, stats, colonies, adopt, collaborate, contact-cta, newsletter, FAQ) each with localized fields, reorderable
- **pages** collection: slug, title_ca/es, content_ca/es (MDX), SEO overrides per locale — for privacy/legal pages
- Images stored as paths (R2 public URLs later); for Phase 1, Keystatic local mode with git-committed assets is fine
- Keystatic in `local` storage mode initially (no GitHub OAuth needed); switch to `github` mode when ready for production editing

### i18n Routing
- Astro built-in i18n config: `defaultLocale: 'ca'`, `locales: ['ca', 'es']`, `prefixDefaultLocale: false`
- Catalan at root `/`, Spanish under `/es/` — no auto-redirect
- Language switcher component: reads current path + locale, maps to alternate locale slug
- UI strings via TypeScript dictionaries (`src/i18n/ca.ts`, `src/i18n/es.ts`) — simple key-value, no external i18n library
- Content localization: helper functions to read correct `_ca`/`_es` field based on current locale

### Islands Strategy
- Preact for public-site islands (filters, gallery, forms) — 3KB vs React's 40KB+
- Do NOT enable Preact `compat` mode — it breaks Keystatic's internal React
- Keystatic admin bundles its own React; no conflict as long as admin routes are separate
- Phase 1 only needs the language switcher island; other islands come in Phase 2+

### Claude's Discretion
- Exact Tailwind color values derived from logo analysis
- File/folder structure within `src/` (layouts, components, content directories)
- Keystatic config file organization
- Build/dev script setup in package.json
- Whether to use Astro Content Layer API or Keystatic Reader API directly (research should inform this)

</decisions>

<specifics>
## Specific Ideas

- Existing cat data model in Payload CMS is rich (personality multi-select, goodWith, health booleans, featured flag, order) — preserve all these fields in Keystatic schema, don't simplify
- Header should maintain the same navigation feel: sticky, with "Qui som?", "Adopta'm", "Col·labora", "Apadrina'm", "Colonies felines" anchors, plus donate and adopt CTAs
- Catalan labels for CMS admin fields (matching existing: "Nom", "Raça", "Edat", "Gènere", etc.) — Keystatic admin labels in Catalan
- The site is for a real shelter operating in Catalonia — tone should be warm, personal, not institutional

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `public/images/logo.webp`: Brand logo — use for theme color extraction and site identity
- `public/images/hero_image.webp`: Hero section image — can reuse in new site
- Cats collection schema (`src/cms/collections/Cats/index.ts`): Rich data model with personality, goodWith, health status, featured flag — reference for Keystatic schema design

### Established Patterns
- Existing sections: hero, stats, qui-som, colonies, adopta, colabora, contact, newsletter — these map directly to landing page section types in Keystatic
- TailwindCSS already in use with custom theme (primary color, border-radius, shadows)
- Sticky header with backdrop blur, donate + adopt CTAs in header bar
- Lucide React icons for UI elements

### Integration Points
- This is a full rebuild — no code reuse from Next.js/Payload, but data model and content structure should be preserved
- Existing nav anchors (/#qui-som, /#adopta, /#colabora, /#colonies) define the expected information architecture
- R2 bucket will need Cloudflare Workers bindings in wrangler.toml

</code_context>

<deferred>
## Deferred Ideas

- R2 signed URL upload workflow — Phase 3 (Images & Media)
- Cloudflare Image Resizing integration — Phase 3
- Contact/adoption form endpoints — Phase 3 (Forms)
- SEO meta tags, hreflang, structured data — Phase 4
- Social sharing buttons — v2
- Newsletter signup integration — v2
- FAQ accordion — v2

</deferred>

---

*Phase: 01-foundation-cms-i18n*
*Context gathered: 2026-03-17*
