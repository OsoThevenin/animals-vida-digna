# Roadmap: Animals Vida Digna

## Overview

Rebuild the Animals Vida Digna cat shelter website from Next.js + Payload CMS to Astro + Keystatic + Cloudflare. Four phases: establish the technical foundation and content model, build all public-facing pages, implement server-side functionality (forms and image pipeline), then validate quality across SEO, accessibility, and performance.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation, CMS & i18n** - Astro + Keystatic + Cloudflare skeleton with content model and bilingual routing (completed 2026-03-18)
- [x] **Phase 2: Public Pages & Cats Directory** - Landing page sections, cat listing/detail pages, and donation CTAs (completed 2026-03-18)
- [x] **Phase 3: Forms, Images & Media** - Contact/adoption forms via Resend, R2 image pipeline, and gallery component (completed 2026-03-18)
- [ ] **Phase 4: SEO, Accessibility & Performance** - Full SEO markup, WCAG AA compliance, and Lighthouse 95+ scores

## Phase Details

### Phase 1: Foundation, CMS & i18n
**Goal**: The project skeleton is deployed on Cloudflare with Keystatic CMS operational, all content schemas defined, and bilingual routing working
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, I18N-01, I18N-02, I18N-03, I18N-04, I18N-05, CMS-01, CMS-02, CMS-03, CMS-04, CMS-05
**Success Criteria** (what must be TRUE):
  1. Running `astro build` produces a working site that deploys to Cloudflare Workers without errors
  2. Shelter staff can access Keystatic admin, create a cat entry with localized fields, and see it persisted in the git repo
  3. Visiting `/` shows Catalan content and `/es` shows Spanish content, with the language switcher deep-linking between them
  4. All content schemas (site settings, cats, landing sections, static pages) are defined in Keystatic with localized fields and alt text in both languages
  5. TailwindCSS theme reflects the shelter's brand colors derived from existing logo assets
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Scaffold Astro 5 project with Cloudflare adapter, Tailwind v4 brand theme, R2 config, and Vitest infrastructure
- [x] 01-02-PLAN.md — Define all Keystatic CMS content schemas (settings, cats, landing, pages) with bilingual fields and reader API
- [x] 01-03-PLAN.md — Implement bilingual i18n routing, language switcher, base layout with header/footer

### Phase 2: Public Pages & Cats Directory
**Goal**: Visitors can browse the full website -- landing page with all configurable sections, cat listing with filters, cat detail pages with galleries, and prominent donation CTAs
**Depends on**: Phase 1
**Requirements**: CATS-01, CATS-02, CATS-03, CATS-04, CATS-05, LAND-01, LAND-02, LAND-03, LAND-04, LAND-05, LAND-06, LAND-07, DONA-01, DONA-02, DONA-03
**Success Criteria** (what must be TRUE):
  1. Landing page renders all CMS-configured sections (hero, about, stats, colonies, collaboration, contact CTA) in the order defined by the editor
  2. Cats listing page displays all cats with working client-side filters for status, age, sex, and temperament, and the base HTML is crawlable by search engines
  3. Cat detail pages show cover image, gallery with lightbox, traits, and full MDX description in the correct locale
  4. Teaming donation link appears in header, hero, and footer, plus a sticky donate CTA appears on scroll -- all with CMS-configurable URL
  5. Featured cats flagged in the CMS appear on the homepage
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — Landing page with all CMS section components, donate URL wiring, sticky CTA, and featured cats
- [x] 02-02-PLAN.md — Cats listing with SSR and Preact filter island, cat detail pages with gallery lightbox

### Phase 3: Forms, Images & Media
**Goal**: Visitors can submit contact and adoption forms that deliver emails via Resend, and all images flow through the R2 storage and Cloudflare Image Resizing pipeline
**Depends on**: Phase 2
**Requirements**: FORM-01, FORM-02, FORM-03, FORM-04, FORM-05, FORM-06, IMG-01, IMG-02, IMG-03, IMG-04, IMG-05
**Success Criteria** (what must be TRUE):
  1. Submitting the contact form sends an email to the shelter via Resend with localized confirmation, and the adoption form pre-fills the cat name
  2. Forms validate on both client and server, reject spam via honeypot, and enforce basic rate limiting
  3. Shelter staff can upload images through the admin app (added in the
     content-r2-pipeline milestone, Phase 5) that are stored in R2; at the
     time this phase originally shipped (2026-03-18), image upload was via
     Keystatic's git-backed storage, later superseded
  4. Public images are served through Cloudflare Image Resizing with responsive srcsets, AVIF/WebP auto-format, and long-lived cache headers
  5. Below-fold images and gallery thumbnails lazy-load
**Plans**: 4 plans

Plans:
- [x] 03-01-PLAN.md — Contact form with shared validation/email infrastructure, Resend delivery, honeypot, and rate limiting
- [x] 03-02-PLAN.md — Adoption inquiry form inline on cat detail pages with cat name pre-fill
- [x] 03-03-PLAN.md — OptimizedImage component with Cloudflare Image Resizing and R2 sync script
- [x] 03-04-PLAN.md — Wire OptimizedImage into all cat image rendering (gap closure)

### Phase 4: SEO, Accessibility & Performance
**Goal**: The site meets all SEO, accessibility, and performance standards -- full hreflang/structured data, WCAG AA compliance, and Lighthouse 95+ on all categories
**Depends on**: Phase 3
**Requirements**: SEO-01, SEO-02, SEO-03, SEO-04, SEO-05, SEO-06, A11Y-01, A11Y-02, A11Y-03, A11Y-04, A11Y-05, PERF-01, PERF-02, PERF-03, PERF-04
**Success Criteria** (what must be TRUE):
  1. Every page has correct localized meta tags, Open Graph tags, and hreflang tags pointing to both CA and ES variants
  2. Sitemap.xml includes all pages in both locales with hreflang alternate links, and robots.txt is correctly generated
  3. JSON-LD structured data (Organization, per-cat Thing) renders with correct inLanguage values
  4. All text/background combinations pass WCAG AA contrast, all interactive elements have visible focus states, and the entire site is keyboard-navigable including modals and gallery
  5. Lighthouse scores >= 95 on Performance, Accessibility, Best Practices, and SEO for mobile in both locales
**Plans**: 6 plans

Plans:
- [x] 04-01-PLAN.md — SEO markup: canonical, OG tags, hreflang, @astrojs/sitemap, robots.txt, JSON-LD structured data
- [x] 04-02-PLAN.md — Accessibility: WCAG AA contrast fixes, focus-visible styles, skip-to-content, mobile menu ARIA, OptimizedImage dimensions
- [x] 04-03-PLAN.md — Performance: font stack cleanup, manual Lighthouse 95+ verification checkpoint
- [ ] 04-04-PLAN.md — Create missing robots.txt (gap closure)
- [ ] 04-05-PLAN.md — Performance investigation and fixes: LCP image optimization, CLS prevention, lazy Tobii, deferred hydration (gap closure)
- [ ] 04-06-PLAN.md — Lighthouse score confirmation checkpoint (gap closure)

### Phase 5 (content-r2-pipeline milestone): Content admin & R2
**Goal**: Cat data and images move out of git into Cloudflare D1/R2, edited
through a dedicated admin app, so volunteers no longer need GitHub access
and content changes go live without a pull request
**Depends on**: Phase 3 (this repository's baseline — the R2 image
pipeline Phase 3 already established) plus the content-r2-pipeline plan's
own Phase 0–4. Independent of this repository's Phase 4
(SEO/Accessibility/Performance), which the Progress table above shows still
in progress (3/6 plans) — the content-r2-pipeline milestone does not wait
on it.
**Requirements**: IMG-02 (superseding), CMS-02 (superseding), ADMIN-01,
ADMIN-02, ADMIN-03
**Success Criteria** (what must be TRUE):
  1. A volunteer with only an email address signs in at
     `https://admin.animalsvidadigna.org`, edits a cat, uploads a photo, and
     sees it live on the public site within seconds — no pull request
  2. Cat pages render on demand from D1; cat images are served from R2
     through `images.animalsvidadigna.org`
  3. No volunteer holds GitHub repository Write access
  4. `docs/admin-guide.md` and `docs/admin-runbook.md` exist and match
     reality
**Plans**: see `docs/superpowers/plans/2026-09-03-content-r2-pipeline/README.md`
(phase-0 through phase-6 documents) — status: implementation complete on
branch `worktree-content-r2-impl` as of 2026-09-10, **not yet merged or
deployed**. Phase 6 (this phase) is documentation and cut-over hardening;
several of its items are deliberately deferred to the maintainer because
this sandbox has no Cloudflare or GitHub credentials — remote D1
verification, the live WAF matrix, a real browser click-through, `wrangler
secret list`, creating the second Workers Builds project, and revoking
volunteers' GitHub collaborator access (ADMIN-03). See
`docs/admin-runbook.md` for that checklist.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation, CMS & i18n | 3/3 | Complete    | 2026-03-18 |
| 2. Public Pages & Cats Directory | 2/2 | Complete    | 2026-03-18 |
| 3. Forms, Images & Media | 4/4 | Complete   | 2026-03-18 |
| 4. SEO, Accessibility & Performance | 3/6 | In progress | - |
| 5. Content admin & R2 (content-r2-pipeline) | 7/7 (phase-0..phase-6) | Implementation complete on branch, pending maintainer deploy checklist | 2026-09-10 |
