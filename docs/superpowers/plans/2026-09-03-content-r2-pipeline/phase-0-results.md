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
| Allowed origins / Sources listed | maintainer to confirm `images.animalsvidadigna.org` is listed explicitly; per `research/cloudflare-platform-facts.md` §5 an apex entry does not cover subdomains. The checks below passed regardless, which suggests same-zone R2 custom domains are permitted without an explicit source entry. |

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
| `animalsvidadigna.org` verified in Resend | **maintainer to confirm** at `resend.com/domains` |
| `RESEND_API_KEY` present (`wrangler secret list`) | **yes** — present on Worker `animals-vida-digna` alongside `KEYSTATIC_SECRET` |
| Test email sent from `no-reply@animalsvidadigna.org` | **blocked** — the key is not retrievable (`wrangler secret list` returns names only, by design) and no gitignored `.dev.vars` exists locally. Per this task's own instruction the key must never be pasted into an agent session, so the maintainer must run the `curl` in Task 7 Step 3 from their own shell. |
| Test email received | pending the above |

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
