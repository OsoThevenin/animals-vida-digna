# Feature Landscape

**Domain:** Cat shelter / animal rescue nonprofit website
**Researched:** 2026-03-17
**Confidence:** MEDIUM (based on domain knowledge of shelter websites; no live web search available for verification)

## Table Stakes

Features visitors expect from any animal shelter website. Missing any of these and users leave or lose trust.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Adoptable cats listing** | Primary reason visitors come to the site. Must show available cats with photos, key traits, and status | Medium | Filterable by age, gender, size, personality. Already modeled in existing Cats collection |
| **Individual cat profile pages** | Users want detail before deciding to adopt: personality, health, compatibility, photo gallery | Medium | Must include multiple photos, personality traits, "good with" info, health status, and a clear adopt CTA |
| **Adoption inquiry form** | The conversion point. Users must be able to express interest in a specific cat | Low | Email via Resend. Should pre-fill the cat's name. Requires basic validation, honeypot spam protection |
| **Contact form** | General inquiries (volunteering, lost cats, partnerships, questions) | Low | Separate from adoption form. Same Resend infrastructure |
| **About the shelter** | Trust signal. Who are these people? What is their mission? | Low | CMS-editable "Qui Som" section. Photos of team/facility add credibility |
| **Donation CTA** | Nonprofits live on donations. Must be prominent and easy to find | Low | Teaming link. Should appear in header, hero, footer, and cat profile pages. CMS-configurable URL |
| **Mobile-responsive design** | 60-70% of shelter site traffic is mobile (people browsing on phones, sharing cats via messaging apps) | Low | Baked into TailwindCSS approach. Not a "feature" to build, but a constraint to enforce |
| **Photo gallery per cat** | A single photo is not enough. Users want to see the cat from multiple angles, in different settings | Low | Already modeled (photo + additionalPhotos in Cats collection). Needs a lightbox or swipeable gallery UI |
| **Bilingual content (CA/ES)** | The shelter operates in Catalonia. Catalan-first with Spanish support is essential for the audience | High | Path-based i18n, localized slugs, language switcher, hreflang tags. Already scoped in PROJECT.md |
| **SEO basics** | Cats should be discoverable via Google ("adopt cat Barcelona", "gat en adopcio") | Medium | Structured data (JSON-LD for Organization, individual animals), OG tags, sitemap, hreflang |
| **Fast page loads** | Shelter sites are image-heavy. Slow = bounce. Lighthouse >= 95 is the project constraint | Medium | Astro SSG + Cloudflare CDN + Image Resizing handles this architecturally |
| **Accessibility (WCAG AA)** | Legal requirement in Spain (transposition of EU Web Accessibility Directive for public-interest sites). Also the right thing to do | Medium | Contrast, focus states, keyboard nav, alt text in both languages. Scoped in PROJECT.md |

## Differentiators

Features that set this shelter apart. Not expected, but create emotional connection and increase conversions.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Featured cats on homepage** | Draws attention to cats that need homes most urgently (special needs, long-term residents) | Low | Already modeled (`featured` flag + `order` field in Cats collection). Display 3-4 featured cats in a homepage section |
| **Personality-based matching hints** | Beyond filters: display "good with children", "ideal for flats", "needs a calm home" as visual badges on cat cards | Low | Data already exists (personality, goodWith fields). Just needs good UI presentation with icons/badges |
| **Cat status transparency** | Show "vaccinated", "microchipped", "sterilized" as trust badges on each cat profile | Low | Already modeled as checkboxes. Display as visual indicators (check marks, shields) |
| **Success stories section** | "Adopted" cats shown in a separate gallery with adoption date. Builds trust that the shelter is active and cats find homes | Low | Filter cats by `status: adopted`. Could add an optional "happy ending" photo/text field later |
| **Colony information page** | Educates about feral cat colonies the shelter manages. Differentiates from pure-adoption sites by showing the full mission | Low | Already a section in the existing site ("Colonies"). CMS-editable content |
| **Social sharing for cat profiles** | "Share this cat" buttons (WhatsApp, Telegram, Facebook, X). Cat adoption relies heavily on word-of-mouth sharing | Low | OG tags per cat page + share buttons. WhatsApp and Telegram are primary channels in Catalonia |
| **FAQ section** | "How does adoption work?", "What does the adoption fee cover?", "Can I visit the shelter?" Reduces repetitive contact inquiries | Low | CMS-managed accordion. Reduces shelter staff workload significantly |
| **Newsletter signup** | Stay in touch with supporters. Announce new cats, events, urgent needs | Low | Already a section in existing site. Collect email + locale preference. Integrate with a free-tier email service (Resend or Mailchimp) |
| **Urgent needs banner** | "We urgently need: wet food, blankets, foster homes" -- a CMS-editable alert that drives immediate action | Low | A simple CMS-managed banner/alert that can be toggled on/off. Very high impact for low effort |
| **Statistics/impact section** | "142 cats rescued", "98 adopted", "12 colonies managed" -- builds credibility and emotional connection | Low | Already exists as "Stats" section. CMS-editable numbers. Automate counts from cat data if feasible |
| **Structured data for pets** | Schema.org `Animal` or `Product` structured data makes cats appear in Google rich results for pet adoption searches | Medium | Not many shelters do this well. Can improve organic discovery significantly |

## Anti-Features

Features to explicitly NOT build. Either out of scope, counterproductive, or over-engineered for this project.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **User accounts / login** | Massive complexity for zero benefit. Shelter staff use Keystatic admin. Visitors don't need accounts | Keep anonymous forms (contact, adoption inquiry). No auth system |
| **Online payment processing** | PCI compliance, legal overhead, Stripe integration complexity. Teaming already handles this | Link to Teaming. Prominent CTA buttons that open Teaming in new tab |
| **Real-time chat / chatbot** | Shelter staff are volunteers, not customer support agents. Chat creates expectation of immediate response | Contact form with clear response time expectation ("we'll reply within 48h") |
| **Blog / news system** | Content creation burden on volunteer staff. Blogs need regular updates or they look abandoned and harm credibility | Social media links for updates. Add blog in v2 only if staff demonstrates content creation capacity |
| **Volunteer management system** | Complex scheduling, roles, permissions. A separate tool (Google Sheets, Volunteero) handles this better | Link to external volunteer signup or simple "I want to volunteer" option in contact form |
| **Cat search with map** | Shelter cats are at one location. Map adds complexity with no value for a single-shelter site | Address + Google Maps embed on contact page is sufficient |
| **Wishlist / favorites** | Requires user accounts or local storage complexity. Cats get adopted quickly; wishlists create false expectations | Share buttons let people save/send cat profiles via messaging apps |
| **Online adoption applications with multi-step forms** | Over-engineered for a small shelter. Complex forms discourage submissions | Simple adoption inquiry form (name, email, phone, message, which cat). Staff follows up personally |
| **Event calendar** | Another content maintenance burden. Events are rare and better promoted via social media | Mention events in the urgent needs banner or homepage. Link to social media for details |
| **Mobile app** | Web-first responsive site covers mobile. App stores add maintenance and review overhead | PWA basics (manifest, icons) if desired later, but not a priority |
| **Automated cat matching quiz** | "Answer 10 questions to find your perfect cat" -- fun but gimmicky. With < 50 cats at any time, users can browse directly | Good filter UI on the cats listing page is more honest and effective |

## Feature Dependencies

```
Cats Collection (content model) --> Cat Listing Page --> Cat Detail Page --> Adoption Inquiry Form
                                                    |
                                                    +--> Cat Filters (age, gender, size, personality)
                                                    |
                                                    +--> Social Sharing (requires OG tags per cat)
                                                    |
                                                    +--> Featured Cats on Homepage

i18n Framework --> All pages (bilingual content rendering)
              |
              +--> Language Switcher (requires localized slug mapping)
              |
              +--> Localized SEO (hreflang, localized sitemaps)
              |
              +--> Localized Forms (labels, validation messages, email templates)

CMS Content Model --> Landing Page Sections (hero, stats, about, colonies, adopt CTA, collaborate, contact, newsletter)
                  |
                  +--> FAQ Section
                  |
                  +--> Urgent Needs Banner

Image Pipeline (R2 + Cloudflare Image Resizing) --> Cat Photos (listing thumbnails, detail gallery)
                                                 |
                                                 +--> CMS Media Uploads

Contact Form --> Resend Email Integration <-- Adoption Inquiry Form

SEO Foundation (meta tags, sitemap, robots.txt) --> Structured Data (Organization, Animal)
                                                |
                                                +--> OG Tags (per page + per cat)
```

## MVP Recommendation

**Prioritize (Phase 1 -- Core):**
1. Cats listing with filters and detail pages with photo gallery
2. i18n framework (CA/ES) with language switcher
3. Landing page with CMS-editable sections (hero, about, stats, featured cats, donate CTA)
4. Contact form + Adoption inquiry form via Resend
5. Donation CTA (Teaming links) in header, hero, footer, cat pages
6. Basic SEO (meta tags, sitemap, OG tags)
7. Accessibility (WCAG AA)

**Prioritize (Phase 2 -- Polish):**
1. Social sharing buttons on cat profiles
2. FAQ section
3. Urgent needs banner
4. Newsletter signup integration
5. Structured data (Schema.org)
6. Success stories / adopted cats gallery
7. Colony information page

**Defer (v2 / if needed):**
- Blog / news
- Statistics automation (auto-count from cat data)
- PWA features

## Sources

- Existing codebase analysis (Cats collection schema, landing page sections)
- PROJECT.md requirements and constraints
- Domain expertise on animal shelter / nonprofit website patterns (MEDIUM confidence -- no live web search to verify current trends)
- Note: WebSearch was unavailable during this research. Findings are based on established domain patterns for shelter websites. Recommend validating against competitor sites (e.g., protectorabcn.es, gatera.org) during implementation.
