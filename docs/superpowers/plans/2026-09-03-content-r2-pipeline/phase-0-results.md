# Phase 0 results — platform spike

Date: 2026-09-04
Executed by: perebvilalta@gmail.com (agent-driven, maintainer performed the
dashboard steps)

## Verdict

**GO**

Cloudflare Images URL transformations work over the R2 custom domain
`images.animalsvidadigna.org` on the Free plan. Task 6 Step 1 and Step 2 —
the only two checks that gate the verdict — both passed exactly as specified:
`HTTP/2 200`, `content-type: image/avif`, a `cf-resized: internal=ok/…`
header, and a transformed `content-length` of **1463 bytes against a 6562
byte original**.

The spec's chosen *Image URLs* contract stands. The NO-GO fallback ("browser
generates the four widths and uploads all of them") is **not** needed.

## Findings that change later phases

### 1. `fit=cover` with only a width is rejected as a fit mode (affects Phase 2)

The core check returned, alongside its 200:

```
warning: cf-images 299 "cover fit mode needs both width and height"
```

The spec's binding contract
(`docs/superpowers/specs/2026-09-03-content-r2-pipeline-design.md:257`)
specifies:

```
`${origin}/cdn-cgi/image/width=${width},fit=cover,quality=80,format=auto,onerror=redirect/${key}`
```

`imageUrl(key, width, origin)` takes no height, so `fit=cover` can never be
satisfied and Cloudflare silently falls back to a plain width scale. The
image is still correctly resized — hence the GO — but the parameter is
misleading and the warning header is returned on every single image request.

**Required before Phase 2 implements `packages/content/src/image-url.ts`:**
amend the spec contract to either

- `fit=scale-down` (or `contain`), which is well-defined with width alone and
  matches what the edge is actually doing today, or
- extend `imageUrl()` to take the stored height and keep `fit=cover`.

`fit=scale-down` is the smaller change and preserves current behaviour. This
decision is the maintainer's; do not let a phase writer pick silently.

### 2. `onerror=redirect` could not be verified (informational)

Task 6 Step 4 expected `HTTP/2 302` with a `location:` back to the original
object. The deliberately invalid `width=abc` did **not** fail — Cloudflare
ignored the malformed parameter and returned `HTTP/2 200`,
`content-type: image/jpeg`, `content-length: 18081`. Because no error was
provoked, the redirect path is untested rather than broken. It does not
affect the verdict (only Steps 1–2 gate it). Keep `onerror=redirect` in the
URL contract — it costs nothing — but do not rely on it as a proven
behaviour.

### 3. Restricting Sources to the images subdomain alone breaks apex transforms (affects Phase 3)

The maintainer first set zone → Images → Transformations → **Sources** to
*Specified origins* listing only `images.animalsvidadigna.org`. That is correct
for the R2 pipeline but silently breaks the site's *own* static-asset
transforms, because the panel's "Specified origins" mode does not include the
apex or other subdomains:

```
$ curl -sI "https://animalsvidadigna.org/cdn-cgi/image/width=320,format=auto/images/logo.webp"
HTTP/2 403
cf-resized: err=9401          ← origin not allowed

$ curl -sI "https://animalsvidadigna.org/images/logo.webp"
HTTP/2 200                     ← the untransformed original is unaffected
```

No visitor saw a broken image, because the live site currently emits no
`/cdn-cgi/image/` URLs at all (verified on `/`, `/cats`, `/contact`, `/es`).
But the spec keeps `OptimizedImage.astro`'s existing behaviour for
site-relative static assets — hero, logo, landing images — which build
*apex-relative* transform URLs. Phase 3 would therefore have shipped a hero
image that fails to load, and no unit test would catch it, because the tests
assert the URL string rather than whether Cloudflare accepts the origin.

**Resolved 2026-09-04:** switched to **"This zone only"**, which allows
`animalsvidadigna.org` and `*.animalsvidadigna.org` in one setting — covering
both the apex assets and the R2 subdomain, while still refusing arbitrary
third-party sources. Re-verified after the change: the apex returns `200` with
`cf-resized: internal=ok`, and `images.animalsvidadigna.org` still returns a
640px AVIF at 2431 bytes.

### 4. Quota abuse is a denial-of-service risk, not a billing risk

Recorded because the maintainer asked whether the transform endpoint needed a
secret. It does not, and one would not work: transform URLs appear verbatim in
public HTML `<img src>` attributes, and `/cdn-cgi/` is handled by Cloudflare's
edge *before* any Worker runs, so there is nothing to verify a signature in
without putting a Worker in front of every image request — which the spec
rejected for the same reason it rejected `assets.run_worker_first`.

Per the Images pricing documentation, exceeding 5,000 unique transformations on
the Free plan returns error `9422` for new transformations, keeps serving
cached ones, and **"You will not be charged for exceeding the limits in the
Free plan."** R2, the only usage-billed product on this account, charges no
egress and gives 10M Class B operations per month, and objects are served
`max-age=31536000, immutable` so repeat requests are cache hits that never
reach the bucket.

The real exposure is an attacker walking the `width` parameter to exhaust the
month's uniques, after which images degrade to full-size originals via
`onerror=redirect` — a Lighthouse regression, not an invoice. Mitigations, in
order of value: the Sources restriction above (already in place), and a WAF
custom rule allowlisting the exact transform parameter strings. Note the Free
plan has **no regex support** in custom rules and a 5-rule limit, so the rule
must be written with `starts_with` alternatives rather than a pattern, and
there is no *Log* action available to trial it safely — it must be verified
with live requests immediately after deployment.

### 5. WAF custom rules DO intercept `/cdn-cgi/image/` — quota is now capped

It was not documented anywhere whether Cloudflare's WAF evaluates custom rules
before the `/cdn-cgi/image/` handler, or whether that path bypasses the WAF
entirely. **It intercepts.** Verified live on 2026-09-04 after the maintainer
deployed the rule below.

Free-plan constraints that shaped the rule: **no regex support** in custom
rules (so `matches` is unavailable and the allowlist is written as
`starts_with` alternatives), a 5-rule limit, and no *Log* action — meaning the
rule cannot be trialled in observation mode and must be verified with live
requests immediately after deployment.

Deployed rule — action **Block**, scoped to the images host only so the apex's
legacy `format=auto,fit=cover,width=W,quality=80` path for static assets is
untouched:

```
(http.host eq "images.animalsvidadigna.org"
 and starts_with(http.request.uri.path, "/cdn-cgi/image/")
 and not starts_with(http.request.uri.path, "/cdn-cgi/image/width=320,fit=scale-down,quality=80,format=auto,onerror=redirect/")
 and not starts_with(http.request.uri.path, "/cdn-cgi/image/width=640,fit=scale-down,quality=80,format=auto,onerror=redirect/")
 and not starts_with(http.request.uri.path, "/cdn-cgi/image/width=960,fit=scale-down,quality=80,format=auto,onerror=redirect/")
 and not starts_with(http.request.uri.path, "/cdn-cgi/image/width=1280,fit=scale-down,quality=80,format=auto,onerror=redirect/"))
```

Measured behaviour against `cats/spike/test.webp`:

| Request | Status |
|---|---|
| `width=320,fit=scale-down,quality=80,format=auto,onerror=redirect` | 200 |
| `width=640,…` / `width=960,…` / `width=1280,…` (same shape) | 200 |
| `width=321,…` (walked width) | **403** |
| `width=7,format=auto` (walked width) | **403** |
| `format=auto,width=320,fit=scale-down,quality=80` (reordered) | **403** |
| `width=320` (bare) | **403** |
| `cats/spike/test.webp` (untransformed original) | 200 |

Monthly unique transformations are therefore bounded by 4 × the number of real
images, not by attacker input, and the untransformed original still serves —
so `onerror=redirect` degradation continues to work if the quota is ever
exhausted.

**Consequence for every later phase:** the URL contract is now enforced in
production. Any deviation — a reordered parameter, a fifth width, a dropped
`onerror=redirect` — returns 403 to real visitors. Phase 3's Playwright suite
asserts that rendered cat-image URLs use `fit=scale-down` and one of the four
allowed widths; keep that assertion, and update the WAF rule *first* if the
width set ever changes.

## Plan state

| Check | Result |
|---|---|
| `wrangler whoami` account | Perebvilalta@gmail.com's Account — `6437933877bc012f250ad229cad358f8` |
| Workers Paid subscription | absent (maintainer-confirmed) |
| Images Paid subscription | absent (maintainer-confirmed) |
| R2 subscription | **present** — usage-based, pre-existing for an unrelated project (`dress-up`). Not one of the two forbidden subscriptions; R2 bills only above the permanent free allowance (10 GB-month, 1M Class A, 10M Class B ops). Maintainer has a $10 budget alert. |
| Zero Trust | not provisioned |

## D1

| Field | Value |
|---|---|
| Database name | `avd-content` |
| `database_id` | `e2cda706-7e56-4679-91d9-5976b20e9722` |
| Region | WEUR |
| `wrangler d1 list` confirms it | yes |

Note: `wrangler d1 create` suggested the binding name `avd_content`. The
spec's *Cloudflare resources* contract requires the binding **`DB`**, which is
what Phase 1/2 `wrangler.toml` uses. The suggestion is ignored.

## R2

| Field | Value |
|---|---|
| Bucket | `animals-vida-digna-images` — **did not exist**; created during this phase (see Deviations) |
| Custom domain | `images.animalsvidadigna.org` |
| Zone ID used | `d27371a8fedf4969594194225fa0e373` |
| Domain add method | `wrangler r2 bucket domain add … --min-tls 1.2` |
| Domain status | active (ownership + SSL went from `pending` to serving 200 in under a minute) |

## Images transformations zone setting

| Field | Value |
|---|---|
| Transformations enabled for `animalsvidadigna.org` | yes — enabled by the maintainer during this phase |
| Allowed origins / Sources listed | **"This zone only"** (covers `animalsvidadigna.org` and `*.animalsvidadigna.org`) — see *Findings* §3 for why the initial "Specified origins" setting had to be changed. |

## Test object

| Field | Value |
|---|---|
| Key | `cats/spike/test.webp` |
| Local generation command | `npx --yes sharp-cli -i test.svg -o test.webp resize 1500 1000 -f webp` (from an inline 1500×1000 SVG) |
| Original size (bytes) | `6562` |
| Upload command | `wrangler r2 object put animals-vida-digna-images/cats/spike/test.webp --file … --content-type image/webp --cache-control "public, max-age=31536000, immutable" --remote` |
| Upload result | Upload complete. Round-tripped back out with `r2 object get` at an identical 6562 bytes. |

## Go/no-go checks

### 1. Direct object fetch — PASS

```
$ curl -sI https://images.animalsvidadigna.org/cats/spike/test.webp
HTTP/2 200
content-type: image/webp
content-length: 6562
cache-control: public, max-age=31536000, immutable
etag: "676eae9520a76c0343e856264c75e33a"
last-modified: Fri, 04 Sep 2026 09:10:25 GMT
accept-ranges: bytes
server: cloudflare
cf-cache-status: HIT
```

Result: **PASS** — 200, correct content-type, and the exact `cache-control`
set at upload survives to the edge.

### 2. Transformation (core check) — PASS

```
$ curl -sI -H 'Accept: image/avif,image/webp' \
  "https://images.animalsvidadigna.org/cdn-cgi/image/width=320,fit=cover,quality=80,format=auto,onerror=redirect/cats/spike/test.webp"
HTTP/2 200
content-type: image/avif
content-length: 1463
cf-cache-status: MISS
cache-control: public, max-age=31536000, immutable
vary: accept
cf-resized: internal=ok/m q=0 n=317+85 c=17+38 v=2026.9.0 l=1463 f=true c2=0 wv=2026.8.0
warning: cf-images 299 "cover fit mode needs both width and height"
content-security-policy: default-src 'none'; navigate-to 'none'; form-action 'none'; img-src data:; style-src 'unsafe-inline';
x-content-type-options: nosniff
```

Result: **PASS** — `cf-resized: internal=ok/…` present, `format=auto`
negotiated AVIF from the `Accept` header, `vary: accept` set for correct
caching.
`content-length` vs original: **1463 vs 6562** (77.7% smaller).
See *Findings* §1 for the `warning` header.

### 3. Apex secondary path (informational, does not affect verdict)

```
$ curl -sI "https://animalsvidadigna.org/cdn-cgi/image/width=320,format=auto/https://images.animalsvidadigna.org/cats/spike/test.webp"
HTTP/2 200
content-type: image/jpeg
content-length: 2156
vary: accept
```

Works: **yes** (JPEG rather than AVIF only because this call sent no `Accept`
header). The spec never builds URLs this way; recorded for completeness.

### 4. Deliberate failure + onerror=redirect

```
$ curl -sI "https://images.animalsvidadigna.org/cdn-cgi/image/width=abc,onerror=redirect/cats/spike/test.webp"
HTTP/2 200
content-type: image/jpeg
content-length: 18081
vary: accept
```

Result: **INCONCLUSIVE** — the invalid width did not provoke an error, so the
redirect path never engaged. See *Findings* §2.

### 5. Unique transformation counter

| | Before | After | Delta |
|---|---|---|---|
| Dashboard → Images → Transformations usage | `0` (maintainer: transformations had just been enabled, none performed) | maintainer to read | expected 2 |

Both requests returned 200:

```
$ curl -s -o /dev/null "…/cdn-cgi/image/width=320,format=auto/cats/spike/test.webp"   # 200
$ curl -s -o /dev/null "…/cdn-cgi/image/width=640,format=auto/cats/spike/test.webp"   # 200
```

Note: several other transformations were issued by checks 2–4 above, so the
counter will read higher than 2 overall. What matters for the spec's cost
model is that two *widths* of the same object count as two uniques and that
`format=auto` does not multiply the count per negotiated output format.

## Resend

| Check | Result |
|---|---|
| `animalsvidadigna.org` verified in Resend | yes — implied by the accepted send below |
| `RESEND_API_KEY` present (`wrangler secret list`) | **yes** — present on Worker `animals-vida-digna` alongside `KEYSTATIC_SECRET` |
| Test email sent from `no-reply@animalsvidadigna.org` | **yes** — the maintainer ran Task 7 Step 3 from their own shell on 2026-09-04 (the key is not retrievable by an agent and must never enter a session). The API returned a JSON body containing an `"id"` UUID and no `"statusCode"` error field, which is the documented success shape. |
| Test email received | **yes** — maintainer confirmed arrival on 2026-09-04. Phase 4 better-auth `emailOTP` login can rely on this sender. |

## Admin hostname reservation

| Check | Result |
|---|---|
| `dig +short admin.animalsvidadigna.org` | empty (2026-09-04) — the hostname is free for Phase 4 |
| DNS dashboard row for `admin` | maintainer to confirm absent |

## Limits snapshot (date: 2026-09-04)

| Resource | Value |
|---|---|
| Workers requests today | maintainer to read from Workers & Pages → Metrics; limit 100,000/day |
| D1 rows read/day limit | 5,000,000 (unused — `avd-content` has zero rows) |
| D1 rows written/day limit | 100,000 (unused — new database) |
| D1 storage limit | 500 MB per DB / 5 GB total, 10 DBs max; hard-enforced since 2026-09-01 |
| R2 storage used | `wrangler r2 bucket info` reports `object_count: 0`, `bucket_size: 0 B` as of 2026-09-04 — bucket metrics lag behind writes; the spike object is present and fetchable. Free allowance 10 GB. |

## Deviations from the phase plan

1. **Task 3, Step 1** assumed the bucket `animals-vida-digna-images` already
   existed because `scripts/sync-images.ts` names it. `wrangler r2 bucket list`
   returned only `dress-up`, so that script has never been run against this
   account. The bucket was created with
   `wrangler r2 bucket create animals-vida-digna-images` (Standard class,
   WEUR). No later phase step changes as a result.
2. **Task 5** wrote its throwaway files to the session scratchpad rather than
   `/tmp/avd-spike`, which the task permits. Nothing was written under
   `public/` or `src/`, and nothing was committed.
3. **Task 6, Step 4** did not reproduce the documented failure mode — see
   *Findings* §2.
4. Steps requiring the Cloudflare or Resend dashboard, and the live Resend
   email, were left to the maintainer and are marked as such above rather
   than guessed at.
