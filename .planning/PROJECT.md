# Animals Vida Digna — Cat Shelter Website

## What This Is

A nonprofit cat shelter website for Animals Vida Digna, rebuilt from a Next.js + Payload CMS stack to Astro (islands architecture) with Keystatic CMS, deployed on Cloudflare Workers. The site serves as the public face of the shelter — showcasing adoptable cats, accepting contact/adoption inquiries, and driving donations via Teaming. Content is fully CMS-editable in Catalan (default) and Spanish.

## Core Value

Visitors can discover adoptable cats and take action (adopt, donate, contact) in their language, with all content managed by non-technical shelter staff through Keystatic.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Astro islands architecture with TailwindCSS styling
- [ ] Keystatic CMS for all content (pages, cats, settings, landing sections)
- [ ] Cloudflare Workers deployment with R2 image storage
- [ ] CA/ES i18n with path-based locales (ca at root, es under /es)
- [ ] Cats directory with filterable listing and detail pages with galleries
- [ ] Teaming donation CTA (CMS-configurable, prominent in header/hero/footer)
- [ ] Contact and adoption forms via Resend email
- [ ] Full localized SEO (hreflang, OG, structured data, sitemap)
- [x] CMS image uploads to R2 via the admin app's `images.upload` Astro
  Action (superseded the original Worker-signed-URL approach; see
  `docs/superpowers/specs/2026-09-03-content-r2-pipeline-design.md`)
- [ ] Cloudflare Image Resizing for responsive/optimized delivery
- [ ] Landing page with configurable sections (hero, about, featured cats, FAQ, contact CTA, etc.)
- [ ] Language switcher with deep-linking to alternate locale slugs
- [ ] WCAG AA accessibility (contrast, focus states, keyboard nav, alt text in both languages)

### Out of Scope

- User accounts / authentication — shelter staff use Keystatic admin only
- Real-time chat — not needed for a shelter site
- Payment processing — donations handled externally via Teaming link
- Mobile app — web-first, responsive design covers mobile
- Blog / news section — may add in v2 if needed
- Volunteer management system — out of scope for website rebuild

## Context

- **Existing codebase:** Currently built with Next.js 15 (canary) + Payload CMS 3.0 beta + PostgreSQL + Vercel Blob storage. This is a full rebuild, not a migration of the existing code.
- **Brand assets:** Logo (`public/images/logo.webp`) and hero image (`public/images/hero_image.webp`) exist in repo. TailwindCSS theme should be derived from these brand assets.
- **Current content model:** Has cats collection, media, users, and landing page sections (Hero, Stats, QuiSom, Colonies, Adopta, Colabora, Contacte, Newsletter) already defined in Payload CMS.
- **Target audience:** Catalan/Spanish-speaking visitors looking to adopt cats or support the shelter. Non-technical shelter staff manage content.
- **Teaming:** External donation platform — the site links out to it, no payment processing needed on-site.

## Constraints

- **Tech stack**: Astro + Keystatic + TailwindCSS + Cloudflare (Workers + R2) — non-negotiable per project brief
- **Localization**: Catalan default at root (/), Spanish under /es — path-based, no auto-redirect
- **Email**: Resend for transactional email (contact/adoption forms)
- **Images**: R2 storage + Cloudflare Image Resizing — no other CDN or image service
- **Performance**: Lighthouse >= 95 on all four categories (mobile) in both locales
- **CMS**: Keystatic for site settings, landing page, and static pages
  (git-backed, PR-reviewed). Cats live in Cloudflare D1 (`avd-content`) and
  are edited through a dedicated admin app (`apps/admin`,
  `admin.animalsvidadigna.org`) with no PR step — see
  `docs/superpowers/specs/2026-09-03-content-r2-pipeline-design.md`.
- **Accessibility**: WCAG AA minimum

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Astro over Next.js | Islands architecture better suited for content-heavy site with minimal interactivity; simpler deployment on Cloudflare Workers | — Pending |
| Keystatic over Payload CMS | Git-backed CMS eliminates database dependency; simpler for non-technical editors; fits Cloudflare deployment | — Pending |
| Cloudflare over Vercel | R2 for image storage + Image Resizing + Workers — unified platform, cost-effective for nonprofit | — Pending |
| Localized fields in single entity | cats collection uses slug_ca/slug_es, name_ca/name_es pattern — avoids content duplication across locale collections | — Pending |
| Path-based i18n (not subdomain) | Simpler DNS, single deployment, standard for bilingual sites | — Pending |
| Cats moved from git/Keystatic to D1/R2 (2026-09-09) | Weekly content changes forced a PR + maintainer review each time; the repository's branch-protection ruleset must stay for code but must not gate routine cat edits | Implementation complete on branch, pending maintainer deploy checklist |
| Separate `apps/admin` Astro app rather than `/admin` routes in the site | Independent deploy/failure domain; public Worker keeps zero auth code; cookies scoped to `admin.` subdomain | Implementation complete on branch, pending maintainer deploy checklist |
| better-auth `emailOTP` rather than Cloudflare Access for admin login | Keeps login inside the app, no Zero Trust dependency, room for roles later; both are free at this scale | Implementation complete on branch, pending maintainer deploy checklist |
| Cloudflare Images URL transformations rather than the Images binding | The binding requires the Paid plan; URL transformations are free (5,000/month) and work over the R2 custom domain | Implementation complete on branch, pending maintainer deploy checklist |

---
*Last updated: 2026-09-10 — content-r2-pipeline milestone Phase 6 (cutover
& docs) in progress on branch `worktree-content-r2-impl`; nothing merged or
deployed*
