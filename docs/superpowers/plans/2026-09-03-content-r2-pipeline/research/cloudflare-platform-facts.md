# Cloudflare platform facts (researched 2026-09-03)

Sourced from developers.cloudflare.com and opennext.js.org. Items marked
*unverified* could not be confirmed from an official page.

## 1. Workers limits (Free vs Paid)

| Fact | Free | Paid | Source |
|---|---|---|---|
| Compressed Worker script size | 3 MB | 10 MB | https://developers.cloudflare.com/workers/platform/limits/ |
| CPU time per invocation | 10 ms | 30 s default, configurable to 5 min | same |
| Requests/day | 100,000 | unlimited | same |
| Subrequests per invocation | 50 external, 1,000 to Cloudflare services | 10,000 default | same |
| Workers per account | 100 | 500 | same |
| Memory | 128 MB | 128 MB | same |

Static-asset requests (Workers Assets) do not invoke the Worker and do not
count toward the daily request limit.

Current site Worker measured 2026-09-03: **2.1 MB raw, 0.39 MB gzipped**.

## 2. @opennextjs/cloudflare (Next.js on Workers)

| Fact | Value | Source |
|---|---|---|
| `nodejs_compat` | required, compatibility_date >= 2024-09-23 | https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/ |
| Size limit called out | "3 MiB on the Workers Free plan, 10 MiB on Paid" (compressed) | https://opennext.js.org/cloudflare |
| Incremental cache binding | mandatory: R2 (recommended), KV, or static assets (read-only) | https://opennext.js.org/cloudflare/caching |
| Queue / tag cache (D1 or DO) | only for time-based revalidation / `revalidateTag` | same |
| Typical minimal-app compressed size | *unverified* — no official figure; community reports frequently exceed 3 MB | — |

## 3. Storage free tiers

| Resource | Free tier | Source |
|---|---|---|
| D1 | 5,000,000 rows read/day, 100,000 rows written/day, 5 GB total, 500 MB per DB, 10 DBs. **Hard-enforced since 2026-09-01** (queries error until 00:00 UTC) | https://developers.cloudflare.com/d1/platform/limits/ , https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/ |
| R2 | 10 GB-month, 1M Class A (writes), 10M Class B (reads) per month, zero egress | https://developers.cloudflare.com/r2/pricing/ |
| KV | 100k reads/day, 1k writes/day, 1 GB | https://developers.cloudflare.com/workers/platform/pricing/ |
| Durable Objects | available on Free | same |
| One D1 / one R2 bound to two Workers | Yes — a binding is a config entry naming `database_id` / `bucket_name`; nothing restricts it to one Worker (verified by mechanism, not an explicit sentence) | https://developers.cloudflare.com/d1/get-started/ |

## 4. Workers Builds with a monorepo

| Fact | Value | Source |
|---|---|---|
| Two Workers from one repo | Yes: per-Worker **Root directory** setting | https://developers.cloudflare.com/workers/ci-cd/builds/configuration/ |
| Build watch paths (skip unrelated builds) | supported on Free | https://developers.cloudflare.com/changelog/post/2024-12-29-faster-builds/ |
| Build minutes | Free 3,000/month; Paid 6,000 + $0.005/min | https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/ |
| Concurrent builds | Free 1; Paid 6 | same |
| Build timeout | 20 min | same |

## 5. Images transformations with R2

| Fact | Value | Source |
|---|---|---|
| `/cdn-cgi/image/<opts>/<path>` on Images **Free** | Works for images stored outside Images (R2 named explicitly). 5,000 unique transformations/month; `format=auto` counts once; over quota → error 9422, never billed | https://developers.cloudflare.com/images/pricing/ |
| Enabling | Dashboard → Images → Transformations → enable for the zone | https://developers.cloudflare.com/images/optimization/features/ |
| Source-origin restriction default | same zone only; an explicit allowed-origins entry for the apex does **not** cover subdomains — add `images.<zone>` or `*.<zone>` explicitly | https://developers.cloudflare.com/stream/transform-videos/sources/ (shared with Images) |
| `onerror=redirect` | Redirects to the original when a transformation fails; "works only if the image is in the same zone (**subdomains are accepted**)" | https://developers.cloudflare.com/images/optimization/features/ |
| Images **binding** (`env.IMAGES`) | Tutorial prerequisites: "Add an Images Paid subscription … allows you to bind the Images API to your Worker" → treat the binding as Paid-only | https://developers.cloudflare.com/images/tutorials/optimize-user-uploaded-image/ |

## 6. Cloudflare Access (not chosen; kept for reference)

| Fact | Value | Source |
|---|---|---|
| Seats | 50 users free | https://www.cloudflare.com/plans/zero-trust-services/ |
| One-time PIN login | available on Free | https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/ |
| JWT verification in a Worker | `Cf-Access-Jwt-Assertion` header, JWKS at `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`, check `iss` + `aud` (`jose` `createRemoteJWKSet` + `jwtVerify`) | https://developers.cloudflare.com/changelog/product/workers/6/ |

## Implications

1. Next.js via OpenNext is the only option with a real risk of forcing the $5/month Workers Paid plan (3 MB compressed cap). Astro Workers are ~0.4 MB.
2. D1 + R2 shared between a site Worker and an admin Worker is supported.
3. Two Workers from one repo is a dashboard setting (root directory + watch paths), free.
4. Image resizing is free: store bounded originals in R2, transform via URL on the `images.` subdomain (same zone → `onerror=redirect` works). Never use the Images binding.
5. All D1/R2/Workers budgets exceed a shelter site's needs by orders of magnitude; the only budget to watch is 5,000 unique transformations/month (≈1,250 new images/month at 4 widths).
