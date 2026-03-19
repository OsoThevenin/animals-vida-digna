# Requirements: Animals Vida Digna

**Defined:** 2026-03-17
**Core Value:** Visitors can discover adoptable cats and take action (adopt, donate, contact) in their language, with all content managed by non-technical shelter staff through Keystatic.

## v1 Requirements

### Foundation

- [x] **FOUND-01**: Site builds with Astro 5 hybrid mode and deploys to Cloudflare Workers
- [x] **FOUND-02**: TailwindCSS theme derived from existing brand assets (logo, colors)
- [ ] **FOUND-03**: Keystatic CMS admin accessible for content editing in hybrid SSR mode
- [x] **FOUND-04**: R2 bucket configured for image storage with public access

### Internationalization

- [x] **I18N-01**: Catalan content served at root paths (/, /cats, /cat/[slug])
- [x] **I18N-02**: Spanish content served under /es paths (/es, /es/cats, /es/cat/[slug])
- [x] **I18N-03**: Language switcher deep-links to the alternate locale's equivalent page/slug
- [x] **I18N-04**: UI strings localized via TypeScript translation dictionaries (CA/ES)
- [x] **I18N-05**: No automatic language redirect — user chooses explicitly

### CMS Content Model

- [ ] **CMS-01**: Site settings singleton (site name, logo, primary color, social links, donate URL, contact email, default SEO — all with CA/ES variants where applicable)
- [ ] **CMS-02**: Cats collection with localized fields (slug, name, short/long description, SEO per locale) and non-localized fields (status, age, sex, temperament, weight, cover image, gallery)
- [ ] **CMS-03**: Landing page sections configurable as typed blocks (hero, about, how-it-works, featured-cats, testimonials, FAQ, contact-cta) with localized fields and reorderable
- [ ] **CMS-04**: Optional static pages collection (privacy, legal) with per-locale content and SEO
- [ ] **CMS-05**: All image fields include alt text in both CA and ES

### Cats Directory

- [x] **CATS-01**: Filterable cats listing page with client-side filters (status, age, sex, temperament) rendered as an interactive island
- [x] **CATS-02**: SSR base for cats listing ensuring SEO crawlability of all cat entries
- [x] **CATS-03**: Cat detail pages at /cat/[slug_ca] and /es/cat/[slug_es] with cover image, gallery, traits, and MDX description
- [x] **CATS-04**: Lightbox/gallery component with keyboard navigation and reduced-motion support
- [x] **CATS-05**: Featured cats displayed on homepage from CMS-flagged entries

### Landing Page

- [x] **LAND-01**: Landing page renders all CMS-configured sections in editor-defined order
- [x] **LAND-02**: Hero section with CTA (donate + adopt) and hero image
- [x] **LAND-03**: About/Qui Som section with shelter mission and team info
- [x] **LAND-04**: Stats/impact section with CMS-editable numbers
- [x] **LAND-05**: Colony information section
- [x] **LAND-06**: Collaboration/volunteer section with CTA
- [x] **LAND-07**: Contact section with form or CTA

### Donations

- [x] **DONA-01**: Teaming donation link visible in header, hero, and footer
- [x] **DONA-02**: Donate URL is CMS-configurable in site settings
- [x] **DONA-03**: Sticky donate CTA on scroll (interactive island)

### Forms & Email

- [x] **FORM-01**: Contact form posts to Cloudflare Worker endpoint with Resend delivery
- [x] **FORM-02**: Adoption inquiry form pre-fills cat name and posts to Worker with Resend
- [x] **FORM-03**: Form validation (client + server) with honeypot spam protection
- [x] **FORM-04**: Basic rate limiting on form submission endpoints
- [x] **FORM-05**: Localized success/error messages returned based on submission locale
- [x] **FORM-06**: Email templates with CA/ES variants

### SEO

- [x] **SEO-01**: Per-page and per-cat meta tags (title, description, canonical) with localized values
- [x] **SEO-02**: Open Graph tags with localized title/description/image per page and per cat
- [x] **SEO-03**: hreflang tags (ca, es, x-default) on every page
- [x] **SEO-04**: Sitemap.xml with xhtml:link rel="alternate" hreflang entries for both locales
- [x] **SEO-05**: robots.txt generated correctly
- [x] **SEO-06**: JSON-LD structured data (Organization, per-cat Animal/Product) with inLanguage

### Images & Performance

- [x] **IMG-01**: Images stored in Cloudflare R2 and served via Cloudflare CDN
- [x] **IMG-02**: CMS image uploads via Worker-signed URLs to R2
- [x] **IMG-03**: Responsive images using Cloudflare Image Resizing (/cdn-cgi/image/) with AVIF/WebP auto-format
- [x] **IMG-04**: Long-lived immutable cache headers on image assets
- [x] **IMG-05**: Lazy loading for below-fold images and gallery thumbnails

### Accessibility

- [ ] **A11Y-01**: WCAG AA contrast ratios on all text/background combinations
- [ ] **A11Y-02**: Visible focus states on all interactive elements
- [ ] **A11Y-03**: Full keyboard navigation support (tabs, modals, gallery, forms)
- [ ] **A11Y-04**: Alt text required in both CA and ES for all images (enforced by CMS schema)
- [ ] **A11Y-05**: Reduced-motion support for gallery/carousel animations

### Performance

- [ ] **PERF-01**: Lighthouse >= 95 on Performance (mobile) in both locales
- [ ] **PERF-02**: Lighthouse >= 95 on Accessibility (mobile) in both locales
- [ ] **PERF-03**: Lighthouse >= 95 on Best Practices (mobile) in both locales
- [ ] **PERF-04**: Lighthouse >= 95 on SEO (mobile) in both locales

## v2 Requirements

### Content & Engagement

- **ENG-01**: Social sharing buttons on cat profiles (WhatsApp, Telegram, Facebook, X)
- **ENG-02**: Newsletter signup form with locale preference capture
- **ENG-03**: Urgent needs CMS-editable banner (toggleable)
- **ENG-04**: Success stories / adopted cats gallery with optional "happy ending" content
- **ENG-05**: FAQ section with CMS-managed accordion
- **ENG-06**: Personality-based matching badges/icons on cat cards

### Technical Enhancements

- **TECH-01**: Automated statistics from cat data (count adopted, rescued, colonies)
- **TECH-02**: PWA manifest and icons for mobile add-to-home
- **TECH-03**: Blog/news section (only if staff capacity confirmed)

## Out of Scope

| Feature | Reason |
|---------|--------|
| User accounts / authentication | No user-facing auth needed; shelter staff use Keystatic admin |
| Online payment processing | Teaming handles donations externally; avoids PCI compliance |
| Real-time chat / chatbot | Volunteer staff can't guarantee immediate response |
| Volunteer management system | Better handled by dedicated external tools |
| Mobile app | Responsive web covers mobile; app stores add overhead |
| Cat matching quiz | With < 50 cats, good filters are more effective |
| Multi-step adoption application | Over-engineered; simple inquiry + personal follow-up is better |
| Event calendar | Rare events; better promoted via social media |
| Map-based cat search | Single shelter location; address + Maps embed suffices |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Complete |
| I18N-01 | Phase 1 | Complete |
| I18N-02 | Phase 1 | Complete |
| I18N-03 | Phase 1 | Complete |
| I18N-04 | Phase 1 | Complete |
| I18N-05 | Phase 1 | Complete |
| CMS-01 | Phase 1 | Pending |
| CMS-02 | Phase 1 | Pending |
| CMS-03 | Phase 1 | Pending |
| CMS-04 | Phase 1 | Pending |
| CMS-05 | Phase 1 | Pending |
| CATS-01 | Phase 2 | Complete |
| CATS-02 | Phase 2 | Complete |
| CATS-03 | Phase 2 | Complete |
| CATS-04 | Phase 2 | Complete |
| CATS-05 | Phase 2 | Complete |
| LAND-01 | Phase 2 | Complete |
| LAND-02 | Phase 2 | Complete |
| LAND-03 | Phase 2 | Complete |
| LAND-04 | Phase 2 | Complete |
| LAND-05 | Phase 2 | Complete |
| LAND-06 | Phase 2 | Complete |
| LAND-07 | Phase 2 | Complete |
| DONA-01 | Phase 2 | Complete |
| DONA-02 | Phase 2 | Complete |
| DONA-03 | Phase 2 | Complete |
| FORM-01 | Phase 3 | Complete |
| FORM-02 | Phase 3 | Complete |
| FORM-03 | Phase 3 | Complete |
| FORM-04 | Phase 3 | Complete |
| FORM-05 | Phase 3 | Complete |
| FORM-06 | Phase 3 | Complete |
| IMG-01 | Phase 3 | Complete |
| IMG-02 | Phase 3 | Complete |
| IMG-03 | Phase 3 | Complete |
| IMG-04 | Phase 3 | Complete |
| IMG-05 | Phase 3 | Complete |
| SEO-01 | Phase 4 | Complete |
| SEO-02 | Phase 4 | Complete |
| SEO-03 | Phase 4 | Complete |
| SEO-04 | Phase 4 | Complete |
| SEO-05 | Phase 4 | Complete |
| SEO-06 | Phase 4 | Complete |
| A11Y-01 | Phase 4 | Pending |
| A11Y-02 | Phase 4 | Pending |
| A11Y-03 | Phase 4 | Pending |
| A11Y-04 | Phase 4 | Pending |
| A11Y-05 | Phase 4 | Pending |
| PERF-01 | Phase 4 | Pending |
| PERF-02 | Phase 4 | Pending |
| PERF-03 | Phase 4 | Pending |
| PERF-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 45 total
- Mapped to phases: 45
- Unmapped: 0

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 after roadmap creation*
