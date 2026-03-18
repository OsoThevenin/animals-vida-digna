# Phase 3: Forms, Images & Media - Research

**Researched:** 2026-03-18
**Domain:** Form endpoints with email delivery (Resend), image storage (R2), and responsive image serving (Cloudflare Image Resizing)
**Confidence:** HIGH

## Summary

This phase introduces the first server-side API endpoints to the project, handling contact and adoption form submissions with email delivery via Resend, plus an image pipeline from Keystatic-managed local files through R2 storage to Cloudflare Image Resizing. The project runs Astro 5 hybrid mode on Cloudflare Workers with `@astrojs/cloudflare` v12+. Resend is fully compatible with the Workers runtime (uses Fetch API, not Node.js networking). Cloudflare's native Rate Limiting binding (GA since Sept 2025) provides the simplest rate limiting without external services.

The image pipeline is split into two concerns: (1) a standalone `npm run sync-images` script that uploads local `public/images/` files to R2, and (2) an `<OptimizedImage>` Astro component that generates responsive `srcset` URLs using the `/cdn-cgi/image/` path. Cloudflare handles format negotiation (AVIF/WebP) automatically with `format=auto`.

**Primary recommendation:** Use Astro API routes at `src/pages/api/contact.ts` and `src/pages/api/adopt.ts` with `export const prerender = false`, Resend SDK for email, native Cloudflare Rate Limiting binding, and a thin `<OptimizedImage>` component wrapping `/cdn-cgi/image/` URLs.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Contact form: minimal fields (name, email, message), dedicated /contact page, inline success message (no redirect)
- Adoption form: inline on cat detail page, pre-fills cat name, fields: name, email, phone (optional), living situation dropdown, message
- Only shown for cats with 'adoptable' status
- All submissions go to single contactEmail from Keystatic site settings
- Submitter receives localized confirmation email (CA/ES)
- Shelter notification includes reply-to header set to submitter email
- Warm, personal email tone: "Gracies per contactar amb nosaltres!"
- Email templates in both CA and ES
- Keystatic local mode: images git-committed locally
- Standalone `npm run sync-images` script uploads to R2 (not build-coupled)
- Shared `<OptimizedImage>` Astro component for all images site-wide
- Cloudflare Image Resizing with srcset: 320w, 640w, 960w, 1280w
- Auto-format negotiation (AVIF/WebP) via Cloudflare
- Long-lived immutable cache headers

### Claude's Discretion
- Form validation UX details (inline vs on-submit, field-level error display)
- Honeypot field implementation and rate limiting approach
- Email template HTML/styling
- R2 sync script implementation details (wrangler r2 vs S3 SDK)
- OptimizedImage component API (props, default sizes, fallback behavior)
- Living situation dropdown options for adoption form
- How to handle Cloudflare Image Resizing in local dev (fallback to original images)

### Deferred Ideas (OUT OF SCOPE)
None

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FORM-01 | Contact form posts to Cloudflare Worker endpoint with Resend delivery | Astro API route pattern + Resend SDK on Workers confirmed compatible |
| FORM-02 | Adoption inquiry form pre-fills cat name and posts to Worker with Resend | Same endpoint pattern; cat name from page context passed as hidden field |
| FORM-03 | Form validation (client + server) with honeypot spam protection | Preact island handles client validation; server re-validates; hidden honeypot field |
| FORM-04 | Basic rate limiting on form submission endpoints | Cloudflare native Rate Limiting binding (GA) — wrangler.toml config |
| FORM-05 | Localized success/error messages returned based on submission locale | Endpoint receives locale param; returns localized JSON response |
| FORM-06 | Email templates with CA/ES variants | HTML string templates with locale switch; Resend `html` parameter |
| IMG-01 | Images stored in R2 and served via Cloudflare CDN | R2 bucket binding already configured in wrangler.toml; sync script uploads |
| IMG-02 | CMS image uploads via Worker-signed URLs to R2 | Keystatic local mode stores locally; sync script handles R2 upload |
| IMG-03 | Responsive images using Cloudflare Image Resizing with AVIF/WebP | `/cdn-cgi/image/format=auto,width=N/` URL pattern; OptimizedImage component |
| IMG-04 | Long-lived immutable cache headers on image assets | Cloudflare caches resized images based on origin cache headers; set on R2 object metadata |
| IMG-05 | Lazy loading for below-fold images and gallery thumbnails | `loading="lazy"` attribute; OptimizedImage includes this by default |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| resend | latest (1.x) | Email delivery from Workers | Official SDK, Fetch-based (Workers-compatible), simple API |
| @cloudflare/workers-types | latest | TypeScript types for Workers bindings | Needed for R2Bucket, RateLimit type definitions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| aws4fetch | latest | S3-compatible signed requests for R2 | In sync-images script for R2 upload via S3 API |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| resend SDK | Raw fetch to Resend API | SDK adds convenience (types, error handling) but is small dependency |
| aws4fetch for sync | wrangler r2 object put CLI | wrangler CLI is simpler for scripting but less flexible for batch ops |
| Native Rate Limiting | KV-based DIY limiter | Native binding is GA, zero latency, no extra setup |

**Installation:**
```bash
pnpm add resend
pnpm add -D @cloudflare/workers-types
```

For the sync script (dev dependency):
```bash
pnpm add -D aws4fetch
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  pages/
    api/
      contact.ts          # POST endpoint for contact form
      adopt.ts            # POST endpoint for adoption form
    contact.astro         # Contact page (CA)
    es/
      contact.astro       # Contact page (ES)
  components/
    forms/
      ContactForm.tsx     # Preact island - contact form
      AdoptionForm.tsx    # Preact island - adoption form
    OptimizedImage.astro  # Shared responsive image component
  lib/
    email.ts              # Resend client + email templates
    validation.ts         # Shared form validation schemas
scripts/
  sync-images.ts          # R2 upload script (standalone)
```

### Pattern 1: Astro API Endpoint on Cloudflare Workers

**What:** Server-side POST handler accessing Cloudflare bindings
**When to use:** All form submission endpoints
**Example:**
```typescript
// src/pages/api/contact.ts
// Source: https://docs.astro.build/en/recipes/build-forms-api/
import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const data = await request.formData();
  const name = data.get('name') as string;
  const email = data.get('email') as string;
  const message = data.get('message') as string;
  const locale = data.get('locale') as 'ca' | 'es';
  const honeypot = data.get('website') as string; // honeypot field

  // Reject bots
  if (honeypot) {
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  // Server-side validation
  if (!name || !email || !message) {
    return new Response(
      JSON.stringify({ success: false, error: 'missing_fields' }),
      { status: 400 }
    );
  }

  // ... send email via Resend
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
```

### Pattern 2: Accessing Cloudflare Bindings in Astro

**What:** Import env bindings from `cloudflare:workers` module
**When to use:** Any SSR page or API route needing R2, KV, secrets, or rate limiting
**Example:**
```typescript
// Source: https://docs.astro.build/en/guides/integrations-guide/cloudflare/
// In @astrojs/cloudflare v13+:
import { env } from 'cloudflare:workers';

const resend = new Resend(env.RESEND_API_KEY);
const bucket = env.IMAGES_BUCKET; // R2Bucket
const limiter = env.FORM_RATE_LIMITER; // RateLimit

// For @astrojs/cloudflare v12 (current project version):
// Access may need Astro.locals.runtime.env pattern
// Verify which access pattern works with v12.6.13
```

**Important note:** The project currently uses `@astrojs/cloudflare` v12.6.13. The `cloudflare:workers` import pattern is documented for v13+. The older `Astro.locals.runtime.env` pattern may be needed, or the adapter should be updated. The CONTEXT.md mentions `context.locals.runtime.env` as the expected pattern. Verify during implementation.

### Pattern 3: Preact Form Island with Fetch Submission

**What:** Preact island handles form UI, validation, and async submission
**When to use:** Contact and adoption forms
**Example:**
```typescript
// Preact island pattern matching CatFilters.tsx
interface Props {
  locale: 'ca' | 'es';
  translations: FormTranslations;
  catName?: string; // For adoption form pre-fill
}

export default function ContactForm({ locale, translations: t, catName }: Props) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    formData.append('locale', locale);

    setStatus('submitting');
    const res = await fetch('/api/contact', { method: 'POST', body: formData });
    const result = await res.json();
    setStatus(result.success ? 'success' : 'error');
  };

  if (status === 'success') {
    return <div class="rounded-lg bg-green-50 p-6 text-green-800">{t.successMessage}</div>;
  }

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Pattern 4: OptimizedImage Component

**What:** Astro component generating Cloudflare Image Resizing srcset URLs
**When to use:** Every image rendered on the site
**Example:**
```astro
---
// src/components/OptimizedImage.astro
interface Props {
  src: string;
  alt: string;
  widths?: number[];
  sizes?: string;
  class?: string;
  loading?: 'lazy' | 'eager';
}

const {
  src,
  alt,
  widths = [320, 640, 960, 1280],
  sizes = '(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw',
  class: className,
  loading = 'lazy',
} = Astro.props;

const isDev = import.meta.env.DEV;

function imageUrl(src: string, width: number): string {
  if (isDev) return src; // Fallback in dev — no Image Resizing
  return `/cdn-cgi/image/format=auto,fit=cover,width=${width},quality=80/${src}`;
}

const srcset = widths.map(w => `${imageUrl(src, w)} ${w}w`).join(', ');
const fallbackSrc = imageUrl(src, widths[widths.length - 1]);
---

<img
  src={fallbackSrc}
  srcset={srcset}
  sizes={sizes}
  alt={alt}
  class={className}
  loading={loading}
  decoding="async"
/>
```

### Pattern 5: Honeypot Anti-Spam

**What:** Hidden field that bots fill but humans don't
**When to use:** All public-facing forms
**Example:**
```html
<!-- Visually hidden but present in DOM -->
<div class="absolute -left-[9999px]" aria-hidden="true">
  <input type="text" name="website" tabindex="-1" autocomplete="off" />
</div>
```
Server silently accepts (200 OK) but discards submission if honeypot is filled. This avoids revealing the protection mechanism to bot operators.

### Anti-Patterns to Avoid
- **Using import.meta.env for runtime secrets:** Cloudflare Workers secrets must be accessed via bindings, not import.meta.env (which is build-time only)
- **Building custom email sending with fetch:** Use the Resend SDK; it handles retries, error types, and rate limit headers
- **Coupling R2 sync to the build process:** Keep image upload as a separate manual step; build should not require R2 credentials
- **Using React Email in Workers:** JSX email templates add complexity; plain HTML string templates work fine for simple transactional emails

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email delivery | Custom SMTP/fetch to mail APIs | Resend SDK | Handles retries, rate limits, error types, deliverability |
| Rate limiting | KV-based counter + TTL logic | Cloudflare native Rate Limiting binding | GA, zero latency, configured in wrangler.toml |
| Image format negotiation | Manual AVIF/WebP detection | Cloudflare `format=auto` | Browser Accept header negotiation handled at CDN edge |
| Form validation | Manual field-by-field checks | Shared validation functions (or lightweight schema) | Reuse between client and server; consistent error messages |
| R2 upload auth | Custom signature logic | aws4fetch or wrangler CLI | S3 signature v4 is complex; aws4fetch handles it |

**Key insight:** Cloudflare provides native bindings for rate limiting and image transformation that are faster and more reliable than any custom solution. Resend's SDK is tiny and Workers-compatible. Don't fight the platform.

## Common Pitfalls

### Pitfall 1: Cloudflare Adapter Version and Binding Access
**What goes wrong:** Code uses `import { env } from 'cloudflare:workers'` but adapter v12 may not support it
**Why it happens:** Docs describe v13+ patterns; project is on v12.6.13
**How to avoid:** Check which binding access pattern works. If v12, use `Astro.locals.runtime.env`. Consider upgrading to v13 if needed.
**Warning signs:** Build errors about unresolved `cloudflare:workers` module

### Pitfall 2: Resend From Address Domain
**What goes wrong:** Emails land in spam or get rejected because `from` address uses unverified domain
**Why it happens:** Resend requires domain verification before sending from custom domains
**How to avoid:** Use `onboarding@resend.dev` for development; verify `animalsvidadigna.org` domain in Resend dashboard before production
**Warning signs:** 403 errors from Resend API

### Pitfall 3: Form Submission CORS Issues
**What goes wrong:** Fetch POST to /api/contact fails with CORS error
**Why it happens:** Same-origin requests shouldn't have CORS issues, but misconfigured redirects or protocol mismatches can cause them
**How to avoid:** Ensure API route returns proper Content-Type headers; forms submit to same origin
**Warning signs:** Browser console shows CORS preflight failures

### Pitfall 4: R2 Image Path Mismatch
**What goes wrong:** Sync script uploads images to R2 with different keys than what OptimizedImage generates
**Why it happens:** Local paths (`public/images/cats/foo.jpg`) must map consistently to R2 keys and `/cdn-cgi/image/` source paths
**How to avoid:** Define a clear path convention: local `public/images/cats/foo.jpg` -> R2 key `images/cats/foo.jpg` -> CDN source `/images/cats/foo.jpg`
**Warning signs:** 404s or broken images after sync

### Pitfall 5: Cloudflare Image Resizing Not Available in Dev
**What goes wrong:** `/cdn-cgi/image/` URLs return 404 in local development
**Why it happens:** Image Resizing is a Cloudflare edge feature, not available in wrangler dev
**How to avoid:** OptimizedImage component detects `import.meta.env.DEV` and falls back to raw image path
**Warning signs:** Broken images only in development

### Pitfall 6: Rate Limiter is Per-Location
**What goes wrong:** Rate limits seem ineffective against distributed attacks
**Why it happens:** Cloudflare native rate limiting counters are local to the Cloudflare location (PoP) where the Worker runs
**How to avoid:** Accept this limitation for basic protection; it's sufficient for a small nonprofit site. For this use case, per-location limiting is fine.
**Warning signs:** Not a real concern for this project's scale

## Code Examples

### Resend Email Sending (Verified Pattern)
```typescript
// Source: https://resend.com/docs/send-with-nodejs
import { Resend } from 'resend';

// In Cloudflare Workers, access API key from env binding
const resend = new Resend(apiKey);

const { data, error } = await resend.emails.send({
  from: 'Animals Vida Digna <no-reply@animalsvidadigna.org>',
  to: [contactEmail],
  replyTo: submitterEmail, // Staff can hit Reply
  subject: 'Nova consulta de contacte',
  html: emailHtml,
});

if (error) {
  return new Response(JSON.stringify({ success: false }), { status: 500 });
}
```

### Cloudflare Rate Limiting Configuration
```toml
# wrangler.toml addition
# Source: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
[[ratelimits]]
name = "FORM_RATE_LIMITER"
namespace_id = "1001"

  [ratelimits.simple]
  limit = 5
  period = 60
```

### Rate Limiting in API Route
```typescript
// Source: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
const ip = request.headers.get('cf-connecting-ip') || 'unknown';
const { success } = await env.FORM_RATE_LIMITER.limit({ key: ip });

if (!success) {
  return new Response(
    JSON.stringify({ success: false, error: 'rate_limited' }),
    { status: 429 }
  );
}
```

### Responsive Image srcset with Cloudflare
```html
<!-- Source: https://developers.cloudflare.com/images/transform-images/make-responsive-images/ -->
<img
  src="/cdn-cgi/image/format=auto,fit=cover,width=1280,quality=80/images/cats/misi.jpg"
  srcset="
    /cdn-cgi/image/format=auto,fit=cover,width=320,quality=80/images/cats/misi.jpg 320w,
    /cdn-cgi/image/format=auto,fit=cover,width=640,quality=80/images/cats/misi.jpg 640w,
    /cdn-cgi/image/format=auto,fit=cover,width=960,quality=80/images/cats/misi.jpg 960w,
    /cdn-cgi/image/format=auto,fit=cover,width=1280,quality=80/images/cats/misi.jpg 1280w
  "
  sizes="(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw"
  alt="Misi"
  loading="lazy"
  decoding="async"
/>
```

### R2 Sync Script Pattern
```typescript
// scripts/sync-images.ts — using wrangler CLI (simplest approach)
// Run: npx wrangler r2 object put animals-vida-digna-images/images/cats/misi.jpg --file public/images/cats/misi.jpg
// Or batch with glob + child_process

import { execSync } from 'node:child_process';
import { globSync } from 'node:fs';

const files = globSync('public/images/**/*.{jpg,jpeg,png,webp,avif}');
for (const file of files) {
  const key = file.replace('public/', '');
  execSync(
    `npx wrangler r2 object put animals-vida-digna-images/${key} --file ${file} --content-type image/${ext}`,
    { stdio: 'inherit' }
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Astro.locals.runtime.env` | `import { env } from 'cloudflare:workers'` | @astrojs/cloudflare v13 | Cleaner binding access; may need adapter upgrade |
| Custom KV rate limiters | Native Rate Limiting binding | Sept 2025 (GA) | Zero latency, declarative config |
| Nodemailer / SendGrid | Resend (Fetch-based) | 2023+ | Works in Workers without Node.js polyfills |
| `<picture>` with manual sources | `format=auto` in Image Resizing URL | Stable for years | Browser content negotiation at CDN edge |

**Deprecated/outdated:**
- `output: 'hybrid'` in Astro config: Deprecated in Astro 5; now all pages default to static unless `prerender = false`
- `Astro.locals.runtime`: Being replaced by direct `cloudflare:workers` import in adapter v13+

## Open Questions

1. **Cloudflare adapter version and binding access**
   - What we know: Project is on @astrojs/cloudflare v12.6.13. Docs show `cloudflare:workers` for v13+.
   - What's unclear: Whether v12 supports `cloudflare:workers` or requires `locals.runtime.env`
   - Recommendation: Try `cloudflare:workers` first; if it fails, either upgrade adapter or use legacy pattern

2. **Resend domain verification timeline**
   - What we know: Custom `from` domains require DNS verification in Resend dashboard
   - What's unclear: Whether domain is already verified or needs setup
   - Recommendation: Use `onboarding@resend.dev` for development; add domain verification as a deployment task

3. **Image Resizing plan requirement**
   - What we know: Image Resizing is available on Pro+ plans or as a paid add-on
   - What's unclear: Whether the Cloudflare account has Image Resizing enabled
   - Recommendation: Verify in Cloudflare dashboard; if not available, the OptimizedImage component falls back gracefully to original images

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | vitest.config.ts (tests in `tests/` directory) |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FORM-01 | Contact form endpoint receives data and calls Resend | unit | `pnpm vitest run tests/contact-api.test.ts -t "contact"` | No - Wave 0 |
| FORM-02 | Adoption form endpoint pre-fills cat name in email | unit | `pnpm vitest run tests/adopt-api.test.ts -t "adopt"` | No - Wave 0 |
| FORM-03 | Validation rejects invalid input; honeypot discards bots | unit | `pnpm vitest run tests/form-validation.test.ts` | No - Wave 0 |
| FORM-04 | Rate limiter returns 429 on excess requests | unit | `pnpm vitest run tests/contact-api.test.ts -t "rate"` | No - Wave 0 |
| FORM-05 | Localized messages returned for CA and ES | unit | `pnpm vitest run tests/form-validation.test.ts -t "locale"` | No - Wave 0 |
| FORM-06 | Email templates render CA and ES variants | unit | `pnpm vitest run tests/email-templates.test.ts` | No - Wave 0 |
| IMG-01 | Sync script uploads images to R2 | manual-only | Manual — requires R2 credentials | N/A |
| IMG-02 | CMS images stored in R2 via sync script | manual-only | Manual — requires R2 credentials | N/A |
| IMG-03 | OptimizedImage generates correct srcset URLs | unit | `pnpm vitest run tests/optimized-image.test.ts` | No - Wave 0 |
| IMG-04 | Cache headers set on R2 objects | manual-only | Manual — verify in Cloudflare dashboard | N/A |
| IMG-05 | Lazy loading attribute present on images | unit | `pnpm vitest run tests/optimized-image.test.ts -t "lazy"` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/form-validation.test.ts` -- covers FORM-03, FORM-05 (pure validation logic)
- [ ] `tests/email-templates.test.ts` -- covers FORM-06 (template rendering)
- [ ] `tests/contact-api.test.ts` -- covers FORM-01, FORM-04 (endpoint logic with mocked Resend)
- [ ] `tests/adopt-api.test.ts` -- covers FORM-02 (adoption endpoint)
- [ ] `tests/optimized-image.test.ts` -- covers IMG-03, IMG-05 (URL generation, attributes)

## Sources

### Primary (HIGH confidence)
- [Resend Node.js docs](https://resend.com/docs/send-with-nodejs) - SDK usage, API, error handling
- [Resend Cloudflare Workers docs](https://resend.com/docs/send-with-cloudflare-workers) - Workers compatibility confirmed
- [Cloudflare Image Resizing - Responsive](https://developers.cloudflare.com/images/transform-images/make-responsive-images/) - srcset patterns
- [Cloudflare Image Resizing - URL transform](https://developers.cloudflare.com/images/transform-images/transform-via-url/) - URL format, options, caching
- [Cloudflare Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) - wrangler config, API usage
- [Astro form recipe](https://docs.astro.build/en/recipes/build-forms-api/) - API endpoint pattern
- [Astro Cloudflare adapter docs](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) - Binding access patterns

### Secondary (MEDIUM confidence)
- [Cloudflare form + Resend tutorial](https://developers.cloudflare.com/developer-spotlight/tutorials/handle-form-submission-with-astro-resend/) - End-to-end tutorial
- [LaunchFa.st R2 presigned URLs guide](https://www.launchfa.st/blog/cloudflare-r2-storage-cloudflare-workers) - R2 upload patterns with Astro

### Tertiary (LOW confidence)
- Adapter v12 vs v13 binding access pattern — needs verification during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Resend, native rate limiting, Cloudflare Image Resizing all well-documented
- Architecture: HIGH - Follows established Astro API route patterns and existing project conventions
- Pitfalls: HIGH - Well-known issues (dev fallback, domain verification, path mapping)
- Binding access: MEDIUM - v12 adapter may need different pattern than v13 docs show

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable APIs, unlikely to change)
