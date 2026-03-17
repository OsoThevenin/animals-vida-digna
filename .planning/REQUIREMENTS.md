# Requirements: Animals Vida Digna

**Defined:** 2026-03-17
**Core Value:** Visitors can discover adoptable cats and take action (adopt, donate, contact) in their language, with all content managed by non-technical shelter staff through Keystatic.

## v1 Requirements

### Foundation

- [ ] **FOUND-01**: Site builds with Astro 5 hybrid mode and deploys to Cloudflare Workers
- [ ] **FOUND-02**: TailwindCSS theme derived from existing brand assets (logo, colors)
- [ ] **FOUND-03**: Keystatic CMS admin accessible for content editing in hybrid SSR mode
- [ ] **FOUND-04**: R2 bucket configured for image storage with public access

### Internationalization

- [ ] **I18N-01**: Catalan content served at root paths (/, /cats, /cat/[slug])
- [ ] **I18N-02**: Spanish content served under /es paths (/es, /es/cats, /es/cat/[slug])
- [ ] **I18N-03**: Language switcher deep-links to the alternate locale's equivalent page/slug
- [ ] **I18N-04**: UI strings localized via TypeScript translation dictionaries (CA/ES)
- [ ] **I18N-05**: No automatic language redirect — user chooses explicitly

### CMS Content Model

- [ ] **CMS-01**: Site settings singleton (site name, logo, primary color, social links, donate URL, contact email, default SEO — all with CA/ES variants where applicable)
- [ ] **CMS-02**: Cats collection with localized fields (slug, name, short/long description, SEO per locale) and non-localized fields (status, age, sex, temperament, weight, cover image, gallery)
- [ ] **CMS-03**: Landing page sections configurable as typed blocks (hero, about, how-it-works, featured-cats, testimonials, FAQ, contact-cta) with localized fields and reorderable
- [ ] **CMS-04**: Optional static pages collection (privacy, legal) with per-locale content and SEO
- [ ] **CMS-05**: All image fields include alt text in both CA and ES

### Cats Directory

- [ ] **CATS-01**: Filterable cats listing page with client-side filters (status, age, sex, temperament) rendered as an interactive island
- [ ] **CATS-02**: SSR base for cats listing ensuring SEO crawlability of all cat entries
- [ ] **CATS-03**: Cat detail pages at /cat/[slug_ca] and /es/cat/[slug_es] with cover image, gallery, traits, and MDX description
- [ ] **CATS-04**: Lightbox/gallery component with keyboard navigation and reduced-motion support
- [ ] **CATS-05**: Featured cats displayed on homepage from CMS-flagged entries

### Landing Page

- [ ] **LAND-01**: Landing page renders all CMS-configured sections in editor-defined order
- [ ] **LAND-02**: Hero section with CTA (donate + adopt) and hero image
- [ ] **LAND-03**: About/Qui Som section with shelter mission and team info
- [ ] **LAND-04**: Stats/impact section with CMS-editable numbers
- [ ] **LAND-05**: Colony information section
- [ ] **LAND-06**: Collaboration/volunteer section with CTA
- [ ] **LAND-07**: Contact section with form or CTA

### Donations

- [ ] **DONA-01**: Teaming donation link visible in header, hero, and footer
- [ ] **DONA-02**: Donate URL is CMS-configurable in site settings
- [ ] **DONA-03**: Sticky donate CTA on scroll (interactive island)

### Forms & Email

- [ ] **FORM-01**: Contact form posts to Cloudflare Worker endpoint with Resend delivery
- [ ] **FORM-02**: Adoption inquiry form pre-fills cat name and posts to Worker with Resend
- [ ] **FORM-03**: Form validation (client + server) with honeypot spam protection
- [ ] **FORM-04**: Basic rate limiting on form submission endpoints
- [ ] **FORM-05**: Localized success/error messages returned based on submission locale
- [ ] **FORM-06**: Email templates with CA/ES variants

### SEO

- [ ] **SEO-01**: Per-page and per-cat meta tags (title, description, canonical) with localized values
- [ ] **SEO-02**: Open Graph tags with localized title/description/image per page and per cat
- [ ] **SEO-03**: hreflang tags (ca, es, x-default) on every page
- [ ] **SEO-04**: Sitemap.xml with xhtml:link rel="alternate" hreflang entries for both locales
- [ ] **SEO-05**: robots.txt generated correctly
- [ ] **SEO-06**: JSON-LD structured data (Organization, per-cat Animal/Product) with inLanguage

### Images & Performance

- [ ] **IMG-01**: Images stored in Cloudflare R2 and served via Cloudflare CDN
- [ ] **IMG-02**: CMS image uploads via Worker-signed URLs to R2
- [ ] **IMG-03**: Responsive images using Cloudflare Image Resizing (/cdn-cgi/image/) with AVIF/WebP auto-format
- [ ] **IMG-04**: Long-lived immutable cache headers on image assets
- [ ] **IMG-05**: Lazy loading for below-fold images and gallery thumbnails

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
| *(populated during roadmap creation)* | | |

**Coverage:**
- v1 requirements: 45 total
- Mapped to phases: 0
- Unmapped: 45 ⚠️

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 after initial definition*
