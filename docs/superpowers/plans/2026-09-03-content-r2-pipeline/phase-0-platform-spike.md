# Phase 0: Platform spike & provisioning — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove, with real HTTP checks against the Free plan, that Cloudflare
Images URL transformations (`/cdn-cgi/image/…`) work over the R2 custom domain
`images.animalsvidadigna.org`, and provision the Cloudflare resources (D1
database, R2 custom domain, Images zone setting) that every later phase binds
to. This phase writes no application code — its only code-adjacent deliverable
is `docs/superpowers/plans/2026-09-03-content-r2-pipeline/phase-0-results.md`,
a filled-in record of every ID, URL, header and measurement collected below.

**Architecture:** Command-line and dashboard steps run directly against the
Cloudflare account that already hosts `animalsvidadigna.org` and the R2 bucket
`animals-vida-digna-images` (used today by `scripts/sync-images.ts`). Nothing
is deployed; the Worker `animals-vida-digna` and its `wrangler.toml` are not
touched. One throwaway object is uploaded to R2 under `cats/spike/` for the
transformation checks and is not referenced by any other phase.

**Tech Stack:** Wrangler CLI (`^4.75.0`, already a devDependency — verify with
`npx wrangler --version`), `curl`, `dig`, `npx sharp-cli` (invoked ad hoc, not
added to `package.json`), the Cloudflare dashboard, the Resend HTTP API.

**Spec:** `docs/superpowers/specs/2026-09-03-content-r2-pipeline-design.md` —
read it first; the *Interface contract* section is binding for every phase.

**Research (facts with sources):** `research/cloudflare-platform-facts.md`.

## Global Constraints

- Free tiers only: Workers Free (3 MB compressed script, 10 ms CPU, 100k req/day), D1 Free (5M reads/100k writes per day, hard-enforced), R2 Free (10 GB), Images Free (5,000 unique transformations/month). Never add the Images binding or the Workers Paid plan.
- `astro ^5.18`, `@astrojs/cloudflare ^12.6` — use `context.locals.runtime.env`; never Astro 6 / adapter 13 APIs.
- `compatibility_flags = ["nodejs_compat"]` on both Workers.
- Biome: kebab-case filenames, single quotes, semicolons, lineWidth 80, sorted Tailwind classes.
- Tests: Vitest, flat `tests/*.test.ts` per app/package, pure-function style; TDD (failing test first) on every task.
- Lighthouse ≥ 95 on all four mobile categories for `/`, `/cats`, `/cat/<slug>` in both locales must still hold after Phase 3.
- Commit style `type(scope): summary` with scopes `monorepo`, `content`, `web`, `admin`, `images`, `docs`.
- No secrets in git. Runtime secrets via `wrangler secret put`; local copies in `.dev.vars` (gitignored).

---

### Task 1: Confirm account plan state

**Files:** none (verification only).

**Interfaces:**
- Consumes: nothing.
- Produces: the "Plan state" table in `phase-0-results.md` (Task 10), consumed by no other phase but required before spending any effort on Task 3–6.

- [ ] **Step 1: Confirm Wrangler is authenticated to the right account**

Run: `npx wrangler whoami`
Expected output includes a line `You are logged in with an OAuth Token` (or API
token) and an "Account Name" / "Account ID" table listing the account that
owns `animalsvidadigna.org`. If it prints "You are not authenticated", run
`npx wrangler login` first and re-run.

- [ ] **Step 2: Confirm Workers plan is Free**

Dashboard path: `dash.cloudflare.com` → account → **Manage Account** → **Billing** → **Subscriptions**.
Expected: no "Workers Paid" line item. If one exists, stop and tell the
maintainer before continuing — Phase 0's go/no-go logic assumes Free.

- [ ] **Step 3: Confirm Images plan is Free**

Dashboard path: same **Subscriptions** page.
Expected: no "Images Paid" (a.k.a. "Cloudflare Images") line item. Free-plan
accounts have no Images subscription at all; URL transformations are a zone
feature, not a subscription (see Task 4).

- [ ] **Step 4: Confirm Zero Trust is not provisioned**

Dashboard path: left sidebar → **Zero Trust**.
Expected: either the option is absent, or it shows the unconfigured
onboarding screen. Zero Trust is out of scope for this plan (spec: "Why
better-auth rather than Cloudflare Access") — this step only confirms no
prior configuration exists that later phases would collide with. Record
"not provisioned" or "provisioned, ignored" in the results file.

- [ ] **Step 5: Record findings**

Add the four findings above to the "Plan state" section of
`phase-0-results.md` (filled in during Task 10). Do not create the file yet —
just note the values so they are not lost.

---

### Task 2: Create the D1 database

**Files:** none (the database is a Cloudflare resource, not a repo file;
`wrangler.toml` bindings for it are added in Phase 1/2, not here).

**Interfaces:**
- Consumes: Task 1's confirmed account (via `wrangler whoami`).
- Produces: `database_id` for `avd-content`, recorded in `phase-0-results.md`
  and consumed verbatim by Phase 1's `wrangler.toml` `[[d1_databases]]` block
  and Phase 2's migrations.

- [ ] **Step 1: Create the database**

Run: `npx wrangler d1 create avd-content`
Expected output (values will differ):
```
✅ Successfully created DB 'avd-content'

[[d1_databases]]
binding = "DB"
database_name = "avd-content"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

- [ ] **Step 2: Verify it is listed**

Run: `npx wrangler d1 list`
Expected: a table containing a row with `avd-content` and the same
`database_id` printed in Step 1.

- [ ] **Step 3: Record the database_id**

Copy the `database_id` value into the "D1" row of `phase-0-results.md`
(filled in during Task 10). This value is the binding contract from the spec
(`packages/content/migrations`, table `Cloudflare resources` — D1 database
`avd-content` bound as `DB`).

---

### Task 3: R2 bucket and custom domain

**Files:** none.

**Interfaces:**
- Consumes: nothing new.
- Produces: confirmation that `images.animalsvidadigna.org` resolves to R2
  and is `active`, recorded in `phase-0-results.md`; consumed by Task 6's
  `curl` checks and by every later phase that builds an `images.` URL.

- [ ] **Step 1: Confirm the bucket already exists**

Run: `npx wrangler r2 bucket list`
Expected: the output includes a bucket named `animals-vida-digna-images`
(this bucket is already used by `scripts/sync-images.ts` for
`public/images/**`, per its `BUCKET_NAME` constant).

- [ ] **Step 2: Find the zone ID for animalsvidadigna.org**

Dashboard path: `dash.cloudflare.com` → select the `animalsvidadigna.org`
zone → right sidebar **API** panel (or the zone Overview page) shows **Zone
ID** as a copyable hex string. Record it — Step 3 needs it.

- [ ] **Step 3: Attach the custom domain to the bucket**

Run (replace `<zone-id>` with the value from Step 2):
```
npx wrangler r2 bucket domain add animals-vida-digna-images \
  --domain images.animalsvidadigna.org \
  --zone-id <zone-id>
```
Expected output: a confirmation that the custom domain was added, e.g.
`✨ Custom Domain 'images.animalsvidadigna.org' added successfully.` If the
command errors with "unrecognized command" or "unknown flag" (CLI surface for
this can change between Wrangler versions), fall back to the dashboard path
instead: zone → **R2** → bucket `animals-vida-digna-images` → **Settings**
tab → **Custom Domains** → **Connect Domain** → enter
`images.animalsvidadigna.org` → **Continue** → **Connect Domain**. Note in
the results file which path was actually used.

- [ ] **Step 4: Wait for the domain status to become active**

Run: `npx wrangler r2 bucket domain list animals-vida-digna-images`
Expected: a row for `images.animalsvidadigna.org` with status `active`. DNS
propagation for a zone already on Cloudflare is typically under a minute; if
the status is still `pending` or `initializing`, wait 30 seconds and re-run
the same command. Do not proceed to Task 6 until the status reads `active`.

- [ ] **Step 5: Record the result**

Add the custom domain and its final status to `phase-0-results.md` (Task 10).

---

### Task 4: Enable Images Transformations and allowed origins

**Files:** none.

**Interfaces:**
- Consumes: the zone `animalsvidadigna.org` (already identified in Task 3).
- Produces: the zone setting recorded in `phase-0-results.md`; consumed by
  Task 6's transformation checks, and matches the spec's *Cloudflare
  resources* table row "Zone setting | Images → Transformations enabled;
  allowed origins include `images.animalsvidadigna.org`".

- [ ] **Step 1: Enable Transformations for the zone**

Dashboard path: `dash.cloudflare.com` → zone `animalsvidadigna.org` →
**Images** (left sidebar) → **Transformations** tab → toggle **Enable URL
transformations for this zone** on (if not already on).
Expected: the toggle shows enabled and the page displays a "Sources" or
"Allowed origins" section below it.

- [ ] **Step 2: Add the images subdomain as an explicit allowed origin**

In the same **Transformations** tab, find **Sources** (or **Allowed
origins**) → **Add source** (or equivalent "+" control) → enter
`images.animalsvidadigna.org` → save.
Do this even if an entry for the apex `animalsvidadigna.org` already exists:
research (`research/cloudflare-platform-facts.md`, §5) states an allowed-
origins entry for the apex does **not** cover subdomains — `images.<zone>`
must be listed explicitly.
Expected: the Sources list now shows both `animalsvidadigna.org` (if present
from prior work) and `images.animalsvidadigna.org`.

- [ ] **Step 3: Record the result**

Note in `phase-0-results.md` that Transformations is enabled and which
origins are listed in Sources.

---

### Task 5: Upload a real test image to R2

**Files:** a locally generated throwaway file, not committed to git (created
under the scratchpad or `/tmp`, never under `public/` or `src/`).

**Interfaces:**
- Consumes: the bucket confirmed in Task 3.
- Produces: the R2 object `cats/spike/test.webp`, consumed by every check in
  Task 6. This object and its `cats/spike/` prefix are spike-only and are not
  part of the `cats/<catId>/<imageId>.webp` key contract from the spec's
  *Image URLs* section — do not reuse this path in later phases.

- [ ] **Step 1: Generate a ~1500px test WebP with only npx (no new dependency)**

Run (creates a 1500×1000 WebP test pattern purely from an inline SVG, piped
through `sharp-cli` — works on macOS with no manual download):
```
mkdir -p /tmp/avd-spike && cd /tmp/avd-spike && \
printf '<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1000"><rect width="1500" height="1000" fill="#6b4c3b"/><circle cx="750" cy="500" r="300" fill="#faf7f4"/></svg>' > test.svg && \
npx --yes sharp-cli -i test.svg -o test.webp resize 1500 1000 -f webp
```
Expected: `test.webp` exists at `/tmp/avd-spike/test.webp`. Verify with `ls
-la /tmp/avd-spike/test.webp` — expected a file size roughly 2–20 KB (a flat
vector-derived image compresses small; this is fine for the spike, the check
in Task 6 only needs *a* valid WebP with a known original `content-length`).

- [ ] **Step 2: Record the original size for later comparison**

Run: `stat -f%z /tmp/avd-spike/test.webp` (macOS `stat`)
Expected: a byte count printed, e.g. `8214`. Record this number — Task 6's
transformation check compares the transformed `content-length` against it.

- [ ] **Step 3: Upload the object to R2 with explicit cache headers**

Run:
```
npx wrangler r2 object put animals-vida-digna-images/cats/spike/test.webp \
  --file /tmp/avd-spike/test.webp \
  --content-type image/webp \
  --cache-control "public, max-age=31536000, immutable" \
  --remote
```
Expected output: `Upload complete.` (Wrangler prints the object key and
bucket name it wrote to.)

- [ ] **Step 4: Verify the object exists in the bucket**

Run: `npx wrangler r2 object get animals-vida-digna-images/cats/spike/test.webp --file /tmp/avd-spike/test-downloaded.webp --remote`
Expected: the command succeeds and `/tmp/avd-spike/test-downloaded.webp` is
created with the same byte size recorded in Step 2 (`stat -f%z
/tmp/avd-spike/test-downloaded.webp`).

---

### Task 6: Go/no-go checks over `images.animalsvidadigna.org`

**Files:** none.

**Interfaces:**
- Consumes: the active custom domain (Task 3), the enabled Transformations
  setting (Task 4), and the uploaded object (Task 5).
- Produces: the GO/NO-GO verdict, recorded in `phase-0-results.md` and gating
  every later phase per the README's Ordering rule 1 ("Phase 0 gates
  everything").

- [ ] **Step 1: Direct object fetch over the custom domain**

Run: `curl -sI https://images.animalsvidadigna.org/cats/spike/test.webp`
Expected: `HTTP/2 200`, a `content-type: image/webp` header, and a
`cache-control: public, max-age=31536000, immutable` header (the exact value
set in Task 5 Step 3). If this fails (non-200, or headers absent), STOP —
this is a prerequisite for every other check in this task; re-check Task 3
(domain status must be `active`) before continuing.

- [ ] **Step 2: Transformation over the custom domain (the core go/no-go check)**

Run:
```
curl -sI \
  -H 'Accept: image/avif,image/webp' \
  "https://images.animalsvidadigna.org/cdn-cgi/image/width=320,fit=cover,quality=80,format=auto,onerror=redirect/cats/spike/test.webp"
```
Expected:
- `HTTP/2 200`
- `content-type: image/avif` or `content-type: image/webp` (either is a
  pass — `format=auto` picks whichever the `Accept` header allows and the
  edge prefers)
- a `cf-resized:` header present, with a value starting `internal=ok/` (its
  full value also encodes the applied transform, e.g.
  `internal=ok/- q=80 n=0`)
- `content-length` strictly smaller than the original size recorded in Task
  5 Step 2

Record the exact header block in `phase-0-results.md`.

- [ ] **Step 3: Same transformation requested on the apex, targeting the R2 image by absolute URL (secondary path)**

Run:
```
curl -sI \
  "https://animalsvidadigna.org/cdn-cgi/image/width=320,format=auto/https://images.animalsvidadigna.org/cats/spike/test.webp"
```
This is a secondary/optional path — the spec's chosen contract
(`packages/content/src/image-url.ts`) only ever builds URLs on
`images.animalsvidadigna.org` directly (Task 6 Step 2's shape), never through
the apex. Record whether this returns `200` with an image content-type, or
an error (e.g. `404`, `400`, or a redirect) — this only documents whether the
secondary path is available, it does not affect the GO/NO-GO verdict below.

- [ ] **Step 4: Deliberately failing transform, expect graceful redirect**

Run:
```
curl -sI \
  "https://images.animalsvidadigna.org/cdn-cgi/image/width=abc,onerror=redirect/cats/spike/test.webp"
```
Expected: `HTTP/2 302` with a `location:` header pointing back to
`https://images.animalsvidadigna.org/cats/spike/test.webp` (the original,
untransformed object). This confirms `onerror=redirect` works for a
same-zone subdomain source, per research §5.

- [ ] **Step 5: Two widths count as two unique transformations**

Run both, back to back:
```
curl -s -o /dev/null "https://images.animalsvidadigna.org/cdn-cgi/image/width=320,format=auto/cats/spike/test.webp"
curl -s -o /dev/null "https://images.animalsvidadigna.org/cdn-cgi/image/width=640,format=auto/cats/spike/test.webp"
```
Both expected to exit `0` (no curl error; `-o /dev/null` discards the body,
we only care that the request succeeds).
Dashboard path: zone → **Images** → **Transformations** → usage panel at the
top of the page shows a **unique transformations this month** counter.
Expected: the counter increased by exactly 2 compared to its value before
this task started (record the before/after numbers — if the counter has any
delay updating, wait up to 60 seconds and refresh). This confirms the spec's
`research/cloudflare-platform-facts.md` §5 claim that `format=auto` is
counted once per width, not once per negotiated output format.

- [ ] **Step 6: Determine the verdict**

**GO** if and only if Step 1 and Step 2 both passed exactly as specified
above (200 status, correct headers, `cf-resized` present, smaller
`content-length`).

**NO-GO** in any other case (Step 1 or Step 2 failed, wrong status, missing
`cf-resized` header, or `content-length` not smaller than the original).

If NO-GO: stop working on this plan. The fallback per the spec's *Why URL
transformations rather than resizing at upload* section and the README's
Ordering rule 1 is: **the browser generates the four widths (320/640/960/
1280 px WebP) client-side and uploads all four to R2**, and
Phase 2 and Phase 5 then implement the **"Fallback contract if Phase 0 is
NO-GO"** paragraph of the spec's *Image URLs* section (keys
`cats/<catId>/<imageId>-<width>.webp`, `imageUrl()` rewriting the key per
width, `images.upload` accepting one file per width) instead of the
`/cdn-cgi/image/` variant. Record the verdict prominently at the top of
`phase-0-results.md`; every later phase reads it before touching image code.

- [ ] **Step 7: Record the verdict**

Write **GO** or **NO-GO** plus the supporting evidence (header dumps, counter
before/after) into `phase-0-results.md` (Task 10).

---

### Task 7: Confirm Resend sending domain and send a live test email

**Files:** none (reads `src/lib/email.ts` for the existing sender address,
does not modify it).

**Interfaces:**
- Consumes: `FROM_ADDRESS` from `src/lib/email.ts:88`
  (`'Animals Vida Digna <no-reply@animalsvidadigna.org>'`) — the same address
  the spec's *Secrets* section names as `AUTH_EMAIL_FROM` for Phase 4's
  better-auth `emailOTP` plugin.
- Produces: confirmation recorded in `phase-0-results.md` that this sender
  domain is verified and can send today, which Phase 4 depends on without
  re-verifying.

- [ ] **Step 1: Confirm the domain is verified in Resend**

Dashboard path: `resend.com/domains` (log in with the account that issued the
existing `RESEND_API_KEY`) → find `animalsvidadigna.org` in the domain list.
Expected: status **Verified** (green). If it shows **Pending** or a DNS
record warning, stop and fix DNS before continuing — Phase 4 login emails
will otherwise silently fail.

- [ ] **Step 2: List Worker secrets without printing values**

Run: `npx wrangler secret list`
Expected: JSON array of objects each with a `name` field; confirm an entry
with `"name": "RESEND_API_KEY"` is present. Do not run any command that
echoes the secret's value (e.g. do not `wrangler secret get` — Wrangler has
no such command precisely because secret values are never retrievable after
being set).

- [ ] **Step 3: Send one live test email using the existing key, without printing it**

This step must not print the API key to the terminal or into
`phase-0-results.md`. `wrangler secret list` never returns secret values
(Cloudflare does not store them retrievably after `wrangler secret put`), so
the key must come from wherever it is already available locally — a
gitignored `.dev.vars` file, or a maintenance shell profile — never typed
into a file this agent writes. Export it in the current shell only:
`export RESEND_API_KEY=...` typed directly into the terminal. Then run,
substituting `$RESEND_API_KEY` for the `Bearer` value so the literal key
never appears in the command text itself:
```
curl -s -X POST 'https://api.resend.com/emails' \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "Animals Vida Digna <no-reply@animalsvidadigna.org>",
    "to": "perebvilalta@gmail.com",
    "subject": "Phase 0 spike: Resend sender check",
    "text": "This is a Phase 0 platform-spike test email. If you received this, no-reply@animalsvidadigna.org can send via Resend."
  }'
```
Expected: a JSON response containing an `"id"` field (a UUID) and no
`"statusCode"` error field. If `RESEND_API_KEY` is not available in the
local shell, get it from the maintainer through a secret-safe channel (never
paste it into this session) and export it in the current shell only, e.g.
`export RESEND_API_KEY=...` typed directly into the terminal, not into any
file this agent writes.

- [ ] **Step 4: Confirm receipt and record the result**

Check the `perebvilalta@gmail.com` inbox for the test email. Expected:
delivered within a couple of minutes, from `no-reply@animalsvidadigna.org`.
Record in `phase-0-results.md`: domain verified (yes/no), secret present
(yes/no), test email delivered (yes/no) — never the key value itself.

---

### Task 8: Reserve the admin hostname

**Files:** none.

**Interfaces:**
- Consumes: nothing.
- Produces: confirmation that `admin.animalsvidadigna.org` has no existing
  DNS record, recorded in `phase-0-results.md`; Phase 4 creates this
  hostname via a Worker custom domain and would otherwise conflict with a
  pre-existing record.

- [ ] **Step 1: Check for an existing DNS record**

Run: `dig +short admin.animalsvidadigna.org`
Expected: empty output (no A, AAAA, or CNAME record exists yet). If any
output is printed, stop and investigate before Phase 4 — a Worker custom
domain add will fail or collide with whatever already occupies that name.

- [ ] **Step 2: Cross-check in the dashboard**

Dashboard path: zone `animalsvidadigna.org` → **DNS** → **Records**.
Expected: no row with name `admin`. Record the result (present/absent) in
`phase-0-results.md`.

---

### Task 9: Record a limits snapshot

**Files:** none.

**Interfaces:**
- Consumes: the D1 database from Task 2, the R2 bucket from Task 3.
- Produces: a dated baseline in `phase-0-results.md` that later phases (and
  the plan's own "Definition of done" billing check) can diff against.

- [ ] **Step 1: Workers requests-per-day usage so far**

Dashboard path: zone or account → **Workers & Pages** → select
`animals-vida-digna` → **Metrics** tab → today's request count.
Expected: a number well under the Free plan's 100,000 requests/day limit
(`research/cloudflare-platform-facts.md` §1). Record the number and today's
date.

- [ ] **Step 2: D1 free-tier limits (documented, not measured — the database is new)**

Record verbatim from `research/cloudflare-platform-facts.md` §3: 5,000,000
rows read/day, 100,000 rows written/day, 5 GB total, 500 MB per database, 10
databases per account, **hard-enforced since 2026-09-01**. No live
measurement needed since `avd-content` has zero rows as of this phase.

- [ ] **Step 3: R2 usage so far**

Run: `npx wrangler r2 bucket info animals-vida-digna-images` (prints bucket
metadata; if this subcommand is unavailable in the installed Wrangler
version, use the dashboard path instead: zone/account → **R2** → bucket
`animals-vida-digna-images` → **Metrics** tab).
Expected: a storage size figure well under the Free plan's 10 GB. Record the
figure and today's date.

- [ ] **Step 4: Record today's date**

Add `2026-09-03` (or the actual date this task is executed, if different) as
the "Snapshot date" in `phase-0-results.md`.

---

### Task 10: Write and commit `phase-0-results.md`

**Files:**
- Create: `docs/superpowers/plans/2026-09-03-content-r2-pipeline/phase-0-results.md`

**Interfaces:**
- Consumes: every recorded value from Tasks 1–9.
- Produces: `phase-0-results.md`, read by Phase 1 (`database_id` for its
  `wrangler.toml`), Phase 2 (D1 confirmation), Phase 4 (Resend + admin
  hostname confirmation), and the plan README's "Phase 0 gates everything"
  rule.

- [ ] **Step 1: Create the file from this exact template**

Fill every `<...>` placeholder with the real value recorded during Tasks
1–9. Do not leave any `<...>` unfilled — if a check could not be completed,
write the actual error message or observed behavior in its place, not a
placeholder.

```markdown
# Phase 0 results — platform spike

Date: <YYYY-MM-DD>
Executed by: <name/email>

## Verdict

**<GO / NO-GO>**

<If NO-GO: state which check failed and paste the exact curl output. State
that the spec's *Image URLs* contract must be updated to the "browser
generates 4 widths and uploads all of them" fallback before Phase 2 starts,
per the spec's *Why URL transformations…* section and the plan README's
Ordering rule 1.>

## Plan state

| Check | Result |
|---|---|
| `wrangler whoami` account | <account name / ID> |
| Workers Paid subscription | <absent / present> |
| Images Paid subscription | <absent / present> |
| Zero Trust | <not provisioned / provisioned, ignored> |

## D1

| Field | Value |
|---|---|
| Database name | `avd-content` |
| `database_id` | `<uuid>` |
| `wrangler d1 list` confirms it | <yes / no> |

## R2

| Field | Value |
|---|---|
| Bucket | `animals-vida-digna-images` (pre-existing, confirmed via `wrangler r2 bucket list`) |
| Custom domain | `images.animalsvidadigna.org` |
| Zone ID used | `<zone id>` |
| Domain add method | <`wrangler r2 bucket domain add` / dashboard> |
| Domain status | <active / other — paste actual status> |

## Images transformations zone setting

| Field | Value |
|---|---|
| Transformations enabled for `animalsvidadigna.org` | <yes / no> |
| Allowed origins / Sources listed | <list> |

## Test object

| Field | Value |
|---|---|
| Key | `cats/spike/test.webp` |
| Local generation command | <exact command used> |
| Original size (bytes) | `<n>` |
| Upload command | `wrangler r2 object put ...` |
| Upload result | <Upload complete. / error> |

## Go/no-go checks

### 1. Direct object fetch

```
$ curl -sI https://images.animalsvidadigna.org/cats/spike/test.webp
<paste full header output>
```

Result: <PASS / FAIL>

### 2. Transformation (core check)

```
$ curl -sI -H 'Accept: image/avif,image/webp' "https://images.animalsvidadigna.org/cdn-cgi/image/width=320,fit=cover,quality=80,format=auto,onerror=redirect/cats/spike/test.webp"
<paste full header output>
```

Result: <PASS / FAIL>
`content-length` vs original: `<transformed bytes>` vs `<original bytes>`

### 3. Apex secondary path (informational only, does not affect verdict)

```
$ curl -sI "https://animalsvidadigna.org/cdn-cgi/image/width=320,format=auto/https://images.animalsvidadigna.org/cats/spike/test.webp"
<paste full header output>
```

Works: <yes / no>

### 4. Deliberate failure + onerror=redirect

```
$ curl -sI "https://images.animalsvidadigna.org/cdn-cgi/image/width=abc,onerror=redirect/cats/spike/test.webp"
<paste full header output>
```

Result: <PASS / FAIL>

### 5. Unique transformation counter

| | Before | After | Delta |
|---|---|---|---|
| Dashboard → Images → Transformations usage | `<n>` | `<n>` | `<n>` (expect 2) |

## Resend

| Check | Result |
|---|---|
| `animalsvidadigna.org` verified in Resend | <yes / no> |
| `RESEND_API_KEY` present (`wrangler secret list`) | <yes / no> |
| Test email sent from `no-reply@animalsvidadigna.org` | <yes / no> |
| Test email received | <yes / no> |

## Admin hostname reservation

| Check | Result |
|---|---|
| `dig +short admin.animalsvidadigna.org` | <empty / paste output> |
| DNS dashboard row for `admin` | <absent / present> |

## Limits snapshot (date: <YYYY-MM-DD>)

| Resource | Value |
|---|---|
| Workers requests today | `<n>` / 100,000 daily limit |
| D1 rows read/day limit | 5,000,000 (unused — new database) |
| D1 rows written/day limit | 100,000 (unused — new database) |
| D1 storage limit | 500 MB per DB / 5 GB total, 10 DBs max |
| R2 storage used | `<n>` GB / 10 GB free tier |
```

- [ ] **Step 2: Verify no secret values were written to the file**

Run: `grep -riE "re_[a-zA-Z0-9]{20,}" docs/superpowers/plans/2026-09-03-content-r2-pipeline/phase-0-results.md`
Expected: no output (Resend API keys are prefixed `re_`; this confirms Task
7's instruction not to print the key was followed).

- [ ] **Step 3: Stage and commit**

```bash
git add docs/superpowers/plans/2026-09-03-content-r2-pipeline/phase-0-results.md
git commit -m "docs(images): record platform spike results"
```

- [ ] **Step 4: Verify the commit**

Run: `git log -1 --stat`
Expected: the commit is present, touching exactly one file
(`phase-0-results.md`), with the message
`docs(images): record platform spike results`.
