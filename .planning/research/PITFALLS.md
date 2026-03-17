# Domain Pitfalls

**Domain:** Bilingual cat shelter website (Astro + Keystatic + Cloudflare Workers/R2)
**Researched:** 2026-03-17
**Overall Confidence:** MEDIUM (training data only -- WebSearch/WebFetch unavailable for live verification)

## Critical Pitfalls

Mistakes that cause rewrites or major architectural issues.

### Pitfall 1: Keystatic Has No Built-in i18n -- Bilingual Content Requires Manual Schema Design

**What goes wrong:** Teams assume Keystatic has locale-aware fields like Payload CMS or Strapi. It does not. Keystatic is a flat-file, git-backed CMS with no concept of locales, translated fields, or locale variants. If you naively create one collection per language (e.g., `cats-ca` and `cats-es`), content drifts apart. If you use a single collection without a clear naming convention, editors do not know which fields are which language.

**Why it happens:** Coming from Payload CMS (which has localized fields built in), the team may expect similar capability. Keystatic collections are simple key-value schemas with no locale abstraction.

**Consequences:** Content sync issues between languages, confusing editor experience, potential need to restructure all content schemas mid-project.

**Prevention:**
- Use a single collection per entity with explicit `_ca` / `_es` suffixed fields: `name_ca`, `name_es`, `description_ca`, `description_es`. This matches the decision in PROJECT.md.
- Group localized fields using Keystatic's `layout` blocks or field groups so the admin UI clearly separates "Catala" from "Espanyol" sections.
- Build a validation script (pre-commit or CI) that checks all `_es` fields are filled when their `_ca` counterpart exists, preventing half-translated entries.
- Non-localizable fields (photos, dates, booleans like `vaccinated`) remain single fields.

**Detection:** Editor complaints about confusing CMS interface. Missing translations on the live site. Content drift where CA and ES versions describe different things.

**Phase:** Phase 1 (Content Model) -- must be solved before any content is entered.

---

### Pitfall 2: Keystatic Image Storage Does Not Upload to R2 Out of the Box

**What goes wrong:** Keystatic stores images in the git repository by default (alongside content YAML/JSON files in the repo). For a cat shelter with dozens of cats, each with multiple photos, this bloats the git repo quickly (hundreds of MB). Teams assume they can just "point Keystatic at R2" but Keystatic has no native R2 integration.

**Why it happens:** Keystatic is designed for git-backed content. Images go to `public/` or a configured directory in the repo. Keystatic Cloud exists as an image hosting add-on but it is a separate service, not R2.

**Consequences:** Git repo bloats to hundreds of MB. Clone times become painful. GitHub/GitLab may impose size limits. Deployment times increase. Alternatively, trying to hack R2 uploads into Keystatic wastes time.

**Prevention:**
- Accept that Keystatic stores image _references_ (filenames/paths) in git, but the actual image files need a separate upload pipeline.
- Option A: Use Keystatic's local image storage during editing, then have a build/deploy step that syncs images to R2 and rewrites references. This is complex.
- Option B (recommended): Store images in git via Keystatic (in a dedicated `src/content/images/` directory), but use `.gitattributes` with Git LFS for image files. At build time, use Cloudflare Image Resizing to serve optimized variants from R2. Upload images to R2 as a deploy step.
- Option C: Build a custom Astro API endpoint that handles uploads to R2 via signed URLs, and have the Keystatic admin link to these. Keystatic fields store the R2 key/URL rather than a local file path.
- The PROJECT.md specifies "CMS image uploads to R2 via Worker-signed URLs" -- this means Option C. Build this as a custom integration, not expecting Keystatic to handle it natively.

**Detection:** Git repo exceeding 100MB. Slow `git clone`. Deployment timeouts.

**Phase:** Phase 1-2 -- the image upload pipeline must be designed alongside the content model. Do not defer this.

---

### Pitfall 3: Astro Cloudflare Adapter -- Node.js APIs Not Available in Workers Runtime

**What goes wrong:** Developers write Astro server-side code (API routes, SSR pages, middleware) using Node.js APIs like `fs`, `path`, `crypto`, `Buffer`, or Node-specific npm packages. These fail silently or crash at runtime on Cloudflare Workers, which uses a V8 isolate (not Node.js).

**Why it happens:** Astro development runs on Node.js locally. Everything works in `astro dev`. The Cloudflare Workers runtime only supports Web APIs and a subset of Node.js APIs via compatibility flags. The mismatch only surfaces at deploy time.

**Consequences:** Forms break in production. Email sending fails. Image processing crashes. The site appears to work locally but is broken on Cloudflare.

**Prevention:**
- Set `compatibility_flags = ["nodejs_compat_v2"]` in `wrangler.toml` from day one. This enables the broadest Node.js compatibility in Workers (as of 2025). Verify that Resend SDK works under this flag.
- Use the `@astrojs/cloudflare` adapter and test on Cloudflare early (Phase 1). Do not wait until the end.
- Run `wrangler dev` locally instead of `astro dev` for integration testing -- this simulates the Workers runtime.
- Avoid npm packages that depend on native Node.js modules (e.g., `sharp` for image processing -- use Cloudflare Image Resizing instead).
- For email via Resend: verify the Resend SDK works in Workers. If not, use Resend's REST API directly with `fetch()`.

**Detection:** Build succeeds but pages/API routes return 500 errors on Cloudflare. Errors mentioning "X is not a function" or "module not found" in Workers logs.

**Phase:** Phase 1 (Project Setup) -- deploy a "Hello World" to Cloudflare Workers on day one to validate the adapter.

---

### Pitfall 4: Keystatic Requires a Running Server -- Conflicts with Astro's Static Output Default

**What goes wrong:** Astro defaults to `output: 'static'` (full SSG). Keystatic's admin UI (`/keystatic`) requires a server-rendered route because it needs API endpoints to read/write content files. Teams configure Astro as fully static and then the Keystatic admin panel does not work in production.

**Why it happens:** The project wants a mostly-static site (content pages, cat listings). But Keystatic's admin interface needs server routes. These two requirements seem contradictory.

**Consequences:** Keystatic admin is inaccessible in production. Content editors cannot update the site without a separate local development setup.

**Prevention:**
- Use Astro's `output: 'hybrid'` or `output: 'server'` mode. Hybrid is preferred: most pages are prerendered (static), but `/keystatic` routes are server-rendered.
- With hybrid mode, add `export const prerender = true` to all public-facing pages (home, cat listings, cat detail, contact). The Keystatic routes remain server-rendered.
- Alternatively, if the team is comfortable with a local-only editing workflow (editors run `npm run dev` locally or use Keystatic Cloud's GitHub-based editing), then `output: 'static'` works and Keystatic admin is local-only.
- **Decision needed:** Will shelter staff edit content via a deployed admin UI (needs hybrid mode + auth) or via GitHub/local (static mode is fine)?

**Detection:** Keystatic admin returns 404 or blank page on the deployed site. Editors report they cannot access the CMS.

**Phase:** Phase 1 (Project Setup) -- this architectural decision must be made before any page is built.

---

### Pitfall 5: Cloudflare Image Resizing Only Works on Custom Domains (Not workers.dev)

**What goes wrong:** The team builds image optimization using Cloudflare Image Resizing (`/cdn-cgi/image/` URLs or `cf.image` object in Workers), tests on `*.workers.dev`, and it does not work. Image Resizing is only available on domains with a Cloudflare Pro plan (or higher) or on custom domains routed through Cloudflare.

**Why it happens:** Cloudflare Image Resizing is a paid feature tied to the zone/domain, not the Workers plan. The `workers.dev` subdomain does not support it. Developers building locally or on staging with `workers.dev` never see it working.

**Consequences:** Images are served unoptimized (full-size JPGs/PNGs), destroying Lighthouse performance scores. The team may waste time debugging why transforms are not applied.

**Prevention:**
- Set up the custom domain on Cloudflare from day one (e.g., `animalsvidadigna.org`).
- Verify Image Resizing is enabled on the Cloudflare dashboard (requires at least a Pro plan on the zone, or a Business/Enterprise plan -- check pricing for nonprofits).
- As a fallback, generate responsive image variants at build time using `astro:assets` with `sharp` (in the build step, which runs on Node.js, not Workers). Store variants in R2.
- Use `<picture>` with `srcset` pointing to pre-generated sizes rather than relying solely on runtime Image Resizing.

**Detection:** Images on the live site are full-size (check network tab). Lighthouse flags large image payloads. `/cdn-cgi/image/` URLs return errors or unmodified images.

**Phase:** Phase 1 (Setup) for domain configuration. Phase 3 (Images) for the full implementation.

## Moderate Pitfalls

### Pitfall 6: Path-Based i18n with Missing hreflang and Canonical Tags

**What goes wrong:** The site has `/gats/mimi` (Catalan) and `/es/gatos/mimi` (Spanish), but pages lack proper `<link rel="alternate" hreflang="ca" href="...">` tags. Google indexes both versions but cannot associate them, leading to duplicate content penalties or one language dominating search results.

**Prevention:**
- Every page must emit `hreflang` tags for all language variants, including `x-default` pointing to the Catalan version.
- Build a helper function that takes a slug and generates all alternate URLs. Use this in the `<head>` of every layout.
- Generate a multilingual sitemap with `<xhtml:link rel="alternate">` entries.
- **Catalan-specific:** Use `hreflang="ca"`, not `hreflang="cat"`. The correct ISO 639-1 code for Catalan is `ca`.

**Detection:** Google Search Console shows "pages with hreflang errors." One language version has zero impressions.

**Phase:** Phase 2 (Pages/Layouts) -- build into the base layout from the start.

---

### Pitfall 7: Keystatic Content Schema Changes Break Existing Content

**What goes wrong:** After content is entered, the team changes the Keystatic schema (renames a field, changes field type, adds a required field). Existing content files no longer match the schema. Keystatic may show errors, lose data, or render fields as empty.

**Why it happens:** Keystatic stores content as flat files (YAML/JSON/MDX). There is no migration system like a database ORM has. Schema changes require manual migration of existing content files.

**Prevention:**
- Finalize the content schema before editors start entering real content. Use placeholder/test data during development.
- When schema changes are unavoidable, write a Node.js script that migrates existing content files (parse YAML/JSON, transform, write back).
- Use optional fields (not required) for new additions. Add required fields only when migrating existing content simultaneously.
- Keep a changelog of schema changes so migration scripts can be verified.

**Detection:** Keystatic admin shows validation errors on existing entries. Fields appear empty that previously had content.

**Phase:** Phase 1 (Content Model) -- get the schema right before Phase 2 content entry begins.

---

### Pitfall 8: R2 CORS Configuration Missing for Direct Browser Uploads

**What goes wrong:** The signed URL approach for uploading images from the Keystatic admin to R2 fails because R2 buckets have no CORS policy by default. The browser blocks the PUT/POST request to R2.

**Prevention:**
- Configure R2 CORS rules to allow requests from the admin domain (or localhost during development).
- Example R2 CORS config: allow origins `https://yourdomain.org` and `http://localhost:4321`, methods `PUT, GET`, headers `Content-Type`.
- Test upload flow from the browser early, not just from server-side Workers code.

**Detection:** Browser console shows CORS errors when uploading images. Network tab shows preflight (OPTIONS) requests being blocked.

**Phase:** Phase 2 (Image Pipeline) -- must be configured when building the upload flow.

---

### Pitfall 9: Form Submissions Fail Silently Without Server-Side Validation

**What goes wrong:** Contact and adoption forms use client-side validation only. Bots bypass it. Malicious input reaches Resend. No rate limiting means the Resend quota is exhausted by spam.

**Prevention:**
- Server-side validation on all form API endpoints (Astro API routes in the Workers runtime).
- Implement Cloudflare Turnstile (free CAPTCHA alternative) on all forms -- it works natively with Workers.
- Rate limit form submissions using Cloudflare's built-in rate limiting or a simple in-memory/KV counter.
- Validate email addresses server-side before sending via Resend.
- Sanitize all input to prevent injection in email content.

**Detection:** Spike in Resend usage. Spam emails arriving at shelter. Form submissions from bots.

**Phase:** Phase 3 (Forms) -- build validation and Turnstile into the form implementation from the start.

---

### Pitfall 10: Astro Content Collections vs Keystatic -- Double Schema Definition

**What goes wrong:** The team defines content schemas twice -- once in Keystatic's config (`keystatic.config.ts`) and again in Astro's Content Collections (`src/content/config.ts`). These drift apart, causing type mismatches and runtime errors.

**Prevention:**
- Use `@keystatic/astro` integration which bridges Keystatic collections to Astro's content layer. Define schemas in Keystatic config and let the integration expose them to Astro.
- If using Astro Content Collections directly (reading from `src/content/`), derive Zod schemas from the same source of truth as Keystatic's field definitions.
- Alternatively, skip Astro Content Collections entirely and use Keystatic's reader API (`createReader()`) to query content at build time.

**Detection:** TypeScript errors about mismatched types. Content renders with missing or wrong fields.

**Phase:** Phase 1 (Project Setup) -- decide the content access pattern before building pages.

## Minor Pitfalls

### Pitfall 11: Catalan is Not Always Recognized by Libraries and Tools

**What goes wrong:** Some i18n libraries, date formatters, or SEO tools do not recognize `ca` as a valid locale. They fall back to Spanish or English silently.

**Prevention:**
- Test all locale-dependent features with `ca` locale explicitly: `Intl.DateTimeFormat('ca')`, `Intl.NumberFormat('ca')`.
- Verify that the Astro i18n config correctly lists `ca` as a locale (not `cat` or `ca-ES`).
- For Open Graph tags, use `og:locale` with `ca_ES` (Facebook format) not `ca`.

**Detection:** Dates showing in English/Spanish on Catalan pages. OG tags showing wrong locale in social previews.

**Phase:** Phase 2 (i18n Implementation).

---

### Pitfall 12: Forgetting to Rebuild/Redeploy After Content Changes (Static Pages)

**What goes wrong:** With prerendered (static) pages, content changes in Keystatic are committed to git but the site is not rebuilt. The live site shows stale content. Editors add a new cat, save, and expect it to appear -- but nothing changes.

**Prevention:**
- Set up a GitHub Actions webhook or Cloudflare Pages git integration that triggers a rebuild on every push to `main`.
- Document the content publishing workflow clearly for editors: "Save in Keystatic -> Push to GitHub -> Site rebuilds in 2-3 minutes."
- Consider adding a "last updated" timestamp in the footer to make staleness visible.

**Detection:** Editors report content is not updating. The site shows old data despite recent commits.

**Phase:** Phase 4 (Deployment/CI) -- must be configured before handing off to editors.

---

### Pitfall 13: Overly Large Cat Image Uploads Without Size Constraints

**What goes wrong:** Shelter volunteers upload 8MB phone photos directly. Without constraints, the site becomes slow even with Image Resizing, because the original upload to R2 is slow and R2 storage costs increase.

**Prevention:**
- Validate image uploads: max 2MB per file, accept only JPEG/PNG/WebP.
- Client-side: resize images before upload using Canvas API (target 1600px max dimension).
- Server-side: reject files exceeding size limits in the Worker upload endpoint.
- Store originals in R2 at a reasonable max resolution (2000px), not at camera native resolution (4000+ px).

**Detection:** R2 storage costs rising unexpectedly. Upload timeouts for editors on slow connections.

**Phase:** Phase 2 (Image Pipeline).

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Project Setup | Cloudflare adapter + Node.js compat | Deploy hello-world to Workers on day one (Pitfall 3) |
| Project Setup | Keystatic + Astro output mode conflict | Decide hybrid vs static + local-only editing (Pitfall 4) |
| Content Model | No i18n in Keystatic | Use `_ca`/`_es` suffix pattern with field grouping (Pitfall 1) |
| Content Model | Schema changes breaking content | Finalize schema before real content entry (Pitfall 7) |
| Image Pipeline | Keystatic images in git repo | Build R2 upload pipeline, do not store images in git (Pitfall 2) |
| Image Pipeline | R2 CORS for browser uploads | Configure CORS on R2 bucket early (Pitfall 8) |
| Image Pipeline | Cloudflare Image Resizing needs custom domain | Set up custom domain + verify plan supports it (Pitfall 5) |
| Pages/Layouts | Missing hreflang tags | Build into base layout with helper function (Pitfall 6) |
| Pages/Layouts | Dual schema definitions | Use Keystatic reader API or `@keystatic/astro` bridge (Pitfall 10) |
| Forms | No server validation or spam protection | Turnstile + server validation + rate limiting (Pitfall 9) |
| Deployment/CI | Stale content after edits | Auto-rebuild on git push (Pitfall 12) |

## Confidence Notes

- **Pitfalls 1, 2, 4, 7, 10:** HIGH confidence -- well-documented limitations of Keystatic's architecture.
- **Pitfalls 3, 5, 8:** HIGH confidence -- Cloudflare Workers/R2 constraints are well-known.
- **Pitfall 6:** HIGH confidence -- standard SEO requirement for multilingual sites.
- **Pitfall 9:** MEDIUM confidence -- standard web security, but Turnstile + Workers specifics should be verified.
- **Pitfalls 11, 12, 13:** MEDIUM confidence -- based on general ecosystem experience. Verify Catalan locale support in specific libraries during implementation.

## Sources

- Training knowledge of Keystatic CMS architecture and limitations (git-backed, no i18n, no native cloud storage)
- Training knowledge of Cloudflare Workers runtime constraints (V8 isolate, no native Node.js APIs)
- Training knowledge of Cloudflare R2 CORS and Image Resizing requirements
- Training knowledge of Astro output modes and adapter system
- Project-specific: existing Cats collection schema in `/src/cms/collections/Cats/index.ts`
- Project-specific: decisions documented in `.planning/PROJECT.md`

**Note:** WebSearch and WebFetch were unavailable during this research session. All findings are based on training data (cutoff May 2025). Verify Keystatic's current capabilities and Cloudflare adapter version compatibility against live documentation before implementation.
