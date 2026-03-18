# Phase 3: Forms, Images & Media - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Visitors can submit contact and adoption forms that deliver emails via Resend, and all images flow through R2 storage and Cloudflare Image Resizing pipeline. Gallery component and lazy loading already exist from Phase 2 — this phase adds the server-side form endpoints, email delivery, image storage pipeline, and responsive image serving.

</domain>

<decisions>
## Implementation Decisions

### Contact form design
- Minimal fields: name, email, message — low friction for nonprofit site
- Lives on a dedicated /contact page (and /es/contact for Spanish)
- Landing page contact CTA section links to this page
- No file attachments — keep it simple
- Inline success message after submission (form replaced with "Thank you" on same page, no redirect)

### Adoption form flow
- Form appears inline on the cat detail page (below description), not on a separate page
- Cat name is pre-filled from the page context
- Fields: name, email, phone (optional), living situation dropdown (flat, house with garden, etc.), message
- Only shown for cats with 'adoptable' status — other statuses show a message instead (e.g., "in treatment", "adopted")
- Same inline success message pattern as contact form: "Thank you, we'll be in touch about [cat name]"

### Email notifications
- All submissions go to the single contactEmail configured in Keystatic site settings
- Submitter receives a localized confirmation email (CA/ES based on form submission locale)
- Shelter notification email includes reply-to header set to submitter's email — staff can hit Reply directly
- Warm, personal tone matching the shelter brand: "Gràcies per contactar amb nosaltres! Et respondrem aviat."
- Email templates in both CA and ES

### Image upload & serving
- Keystatic local mode: staff upload images through Keystatic admin (git-committed locally)
- Standalone `npm run sync-images` script uploads local images to R2 — explicit, not build-coupled
- Shared `<OptimizedImage>` Astro component used site-wide for all images
- Cloudflare Image Resizing with standard responsive srcset: 320w, 640w, 960w, 1280w
- Auto-format negotiation (AVIF/WebP) handled by Cloudflare
- Long-lived immutable cache headers on image assets

### Claude's Discretion
- Form validation UX details (inline vs on-submit, field-level error display)
- Honeypot field implementation and rate limiting approach
- Email template HTML/styling
- R2 sync script implementation details (wrangler r2 vs S3 SDK)
- OptimizedImage component API (props, default sizes, fallback behavior)
- Living situation dropdown options for adoption form
- How to handle Cloudflare Image Resizing in local dev (fallback to original images)

</decisions>

<specifics>
## Specific Ideas

- Adoption form inline on cat detail page keeps the emotional connection — visitor sees the cat while filling out the form
- Warm email tone: "Gràcies per contactar amb nosaltres!" not institutional "Hem rebut la teva consulta. Ref: #123."
- Reply-to header on shelter notifications is important — staff should be able to reply directly without copying email addresses
- Contact form is the first server-side route in the project — establishes the pattern for Astro API endpoints on Cloudflare Workers

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CatFilters.tsx`: Preact island pattern with form elements (select dropdowns, state management) — reuse for form islands
- `DonateSticky.tsx`: Preact island with `client:load` directive — same hydration pattern for forms
- Form styling baseline from CatFilters: `rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text focus:border-primary`
- `bilingualImage()` helper in keystatic.config.tsx: bilingual alt text pattern for images
- `getLocalizedField()` in `src/i18n/content.ts`: locale-aware field extraction

### Established Patterns
- Preact islands receive serializable data only — form translations passed as plain objects
- i18n strings in `src/i18n/ca.ts` and `es.ts` — form labels/messages extend these files
- No existing API endpoints — contact form establishes the pattern for `src/pages/api/` routes
- Astro hybrid mode with Cloudflare adapter — SSR endpoints access `context.locals.runtime.env` for bindings

### Integration Points
- `wrangler.toml`: R2 bucket binding `IMAGES_BUCKET` already configured (bucket: `animals-vida-digna-images`)
- Keystatic site settings singleton has `contactEmail` field — form endpoint reads this for delivery
- Cat detail page (`src/pages/cat/[slug].astro`) — adoption form integrates here as Preact island
- Landing page ContactCtaSection — update link to point to new /contact page
- `.env.example` needs `RESEND_API_KEY` added

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-forms-images-media*
*Context gathered: 2026-03-18*
