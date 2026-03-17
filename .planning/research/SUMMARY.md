# Research Summary: Animals Vida Digna

**Domain:** Nonprofit cat shelter website (content-heavy, bilingual, CMS-driven)
**Researched:** 2026-03-17
**Overall confidence:** MEDIUM (limited to training data -- WebSearch and WebFetch were unavailable for verification)

## Executive Summary

The Astro + Keystatic + Cloudflare stack is a strong fit for this project. Astro's islands architecture delivers near-zero JavaScript for a content-heavy shelter site, while Keystatic provides a git-backed CMS that eliminates database dependencies entirely. Cloudflare Workers + R2 + Image Resizing offers a unified, cost-effective platform ideal for a nonprofit.

The biggest architectural decision is using Astro's `hybrid` output mode. Most pages (home, about, cat listings, cat detail) are statically generated at build time for maximum performance. Server-rendered routes handle the Keystatic admin UI, contact/adoption form API endpoints, and R2 image upload signing. This gives the best of both worlds: Lighthouse 95+ scores on public pages with dynamic functionality where needed.

The i18n approach is straightforward. Astro has built-in path-based locale routing that matches the project requirements exactly (Catalan at root, Spanish under `/es`). With only two locales, no external i18n library is needed -- a simple TypeScript translation map covers UI strings, while Keystatic handles content localization through field-level locale variants (`name_ca`/`name_es`).

The main risk areas are: Keystatic's pre-1.0 status (API may evolve), Tailwind v4's relatively new Astro integration, and the R2 image upload workflow needing a custom Worker endpoint for signed URLs. None of these are blockers, but they need careful implementation.

## Key Findings

**Stack:** Astro 5 (hybrid mode) + Keystatic (GitHub mode) + Preact (islands) + TailwindCSS + Cloudflare Workers/R2 + Resend. No database, no React on public pages, no external i18n library.

**Architecture:** Static-first with server islands. Content lives in git (via Keystatic). Images in R2 with edge resizing. Forms POST to Worker API routes. Two-locale path-based routing with Astro built-in i18n.

**Critical pitfall:** Keystatic admin requires a server route, which forces `output: 'hybrid'` mode -- cannot use pure `output: 'static'`. This affects the Cloudflare adapter configuration and deployment model.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Foundation** - Set up Astro + Cloudflare + Keystatic skeleton
   - Addresses: Project scaffolding, deployment pipeline, CMS admin access
   - Avoids: Building features before infrastructure is proven
   - Rationale: The Astro-Cloudflare-Keystatic integration is the riskiest technical coupling; validate it first

2. **Content Model & i18n** - Define Keystatic schemas, implement i18n routing
   - Addresses: Cat collection schema, page content schemas, translation system
   - Avoids: Building UI before the data model is stable
   - Rationale: Everything depends on the content model; get it right early

3. **Public Pages & Design** - Landing page sections, cat listing/detail, static pages
   - Addresses: Hero, about, featured cats, cat directory with filters, detail pages with galleries
   - Avoids: Premature optimization
   - Rationale: Bulk of the visible work; depends on content model being stable

4. **Forms & Email** - Contact form, adoption inquiry form, Resend integration
   - Addresses: Contact form, adoption form, email delivery
   - Avoids: Mixing infrastructure work with UX work
   - Rationale: Server-side API routes need Cloudflare Workers; simpler after foundation is proven

5. **Images & Media** - R2 upload workflow, Image Resizing, gallery component
   - Addresses: CMS image uploads to R2, responsive image delivery, cat photo galleries
   - Avoids: Image handling complexity blocking core content pages
   - Rationale: Image pipeline has multiple moving parts (signed URLs, R2 bindings, CF Image Resizing)

6. **SEO, A11y & Polish** - Sitemap, hreflang, structured data, WCAG AA audit, performance tuning
   - Addresses: SEO requirements, accessibility compliance, Lighthouse scores
   - Avoids: Premature optimization before content is in place
   - Rationale: SEO and a11y are best tested against real content

**Phase ordering rationale:**
- Foundation must come first because Astro + Cloudflare + Keystatic integration is unproven in this combination
- Content model before UI because page templates depend on schema shape
- Forms and images can be partially parallel but both need Workers infrastructure from Phase 1
- SEO/a11y last because they validate the whole system

**Research flags for phases:**
- Phase 1: Likely needs deeper research (Keystatic + Cloudflare adapter compatibility, hybrid mode config)
- Phase 2: Likely needs deeper research (Keystatic localized field patterns, Content Layer API)
- Phase 5: Likely needs deeper research (R2 signed URL workflow, CF Image Resizing URL format)
- Phase 3, 4, 6: Standard patterns, less likely to need research

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Core technologies are well-known but exact versions need verification (no npm/web access during research) |
| Features | HIGH | Feature set is well-defined in PROJECT.md; standard for shelter/nonprofit sites |
| Architecture | HIGH | Astro hybrid + Keystatic + Cloudflare is a documented pattern; i18n routing is built-in |
| Pitfalls | MEDIUM | Known pitfalls from training data but may miss recent issues with newer versions |

## Gaps to Address

- Exact current versions of all packages (run `npm view <pkg> version` before installing)
- Keystatic's current API stability -- was pre-1.0 as of mid-2025, may have reached 1.0
- Tailwind v4's Astro integration maturity -- may need `@tailwindcss/vite` plugin or may work natively
- Cloudflare Image Resizing pricing for nonprofits (included in Pro plan; may need to verify free tier availability)
- R2 signed URL implementation details for CMS image uploads
- Whether `@astrojs/cloudflare` adapter version aligns with current Astro version
