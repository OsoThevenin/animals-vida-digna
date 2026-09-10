# Admin runbook (for the maintainer)

This is the operational reference for `admin.animalsvidadigna.org` and the
D1/R2 content pipeline behind it. For how volunteers use the panel, see
`docs/admin-guide.md`. For the settings/landing/pages Keystatic flow that
still uses GitHub PRs, see `docs/keystatic-admin-setup.md`.

## Architecture

```
                 volunteer (browser)                          visitor (browser)
                        │                                             │
      https://admin.animalsvidadigna.org                https://animalsvidadigna.org
                        │                                             │
   ┌────────────────────▼────────────────────┐     ┌──────────────────▼─────────────────┐
   │ Worker: animals-vida-digna-admin        │     │ Worker: animals-vida-digna         │
   │ apps/admin (Astro, React islands)       │     │ apps/web (Astro, Preact islands)   │
   │ better-auth (emailOTP)  Astro Actions   │     │ static pages + on-demand cat pages │
   └───────┬───────────────┬────────┬────────┘     └──────────────────┬─────────────────┘
           │ D1            │ R2     │ Resend                          │ D1 (read)
   ┌───────▼───────┐ ┌─────▼──────────────┐                           │
   │ D1: avd-content│ │ R2: animals-vida-  │◄──────────────────────────┘ (images by URL)
   │ cats, cat_images│ │ digna-images       │
   │ user, session…  │ │ key cats/<cat>/<img>.webp
   └────────────────┘ └─────────┬──────────┘
                                │ custom domain
                  https://images.animalsvidadigna.org/cdn-cgi/image/width=640,format=auto,…/cats/<cat>/<img>.webp
```

Cats and their images are edited only in `apps/admin` and read from D1/R2 by
both apps. Site settings, the landing page, and static pages still go
through Keystatic + a GitHub pull request (`docs/keystatic-admin-setup.md`) —
that flow is unchanged and maintainer-only now.

## Cloudflare resources

| Resource | Name | Bound as | Used by |
|---|---|---|---|
| Worker | `animals-vida-digna` | — | `apps/web`, custom domain `animalsvidadigna.org` (`custom_domain = true`, `workers_dev = false`, `preview_urls = true` so Workers Builds can produce a per-PR preview) |
| Worker | `animals-vida-digna-admin` | — | `apps/admin`, custom domain `admin.animalsvidadigna.org` (`custom_domain = true`, `workers_dev = false`, `preview_urls = false` — a session cookie bound to the production host would never validate on a preview host) |
| D1 database | `avd-content` (id `e2cda706-7e56-4679-91d9-5976b20e9722`) | `DB` | web (read), admin (read/write); `migrations_dir = "../../packages/content/migrations"` in both `wrangler.toml` files |
| R2 bucket | `animals-vida-digna-images` | `IMAGES_BUCKET` | admin only (writes); public reads go through the custom domain, not the binding |
| R2 custom domain | `images.animalsvidadigna.org` | — | public image reads |
| Rate limiter | namespace `1001`, 5 requests / 60s | `FORM_RATE_LIMITER` | `apps/web` only, on the public contact form |
| Zone setting | Images → Transformations enabled; allowed origins include `images.animalsvidadigna.org` | — | required for `/cdn-cgi/image/...` to work over the R2 custom domain |
| Workers Builds project | one per Worker, root directory `apps/web` / `apps/admin` | — | CI deploy on push to `main` |

Both Workers set `compatibility_flags = ["nodejs_compat"]` and
`[observability] enabled = true`. Check the dashboard
(`R2 → animals-vida-digna-images → Settings`) if any of this drifts; nothing
here should ever require the Images Paid or Workers Paid plan.

## Secrets

Admin Worker secrets (set with `wrangler secret put <NAME>` from
`apps/admin/`; local values mirrored in `apps/admin/.dev.vars`, which is
gitignored — see `apps/admin/.dev.vars.example` for the shape):

| Secret | Purpose | What breaks if wrong/missing |
|---|---|---|
| `BETTER_AUTH_SECRET` | Signs/encrypts session cookies | Every session is invalidated; all volunteers are signed out and must sign in again |
| `BETTER_AUTH_URL` | Must equal `https://admin.animalsvidadigna.org` — see warning below | OAuth/redirect and cookie-domain checks fail; sign-in loops back to `/login`, or a 500 if unset |
| `RESEND_API_KEY` | Sends the 6-digit email codes | Sign-in emails stop sending; volunteers can never get a code |
| `AUTH_EMAIL_FROM` | From-address on those emails | Cosmetic if a valid address in an unusual format; emails fail to send if malformed |
| `ADMIN_ALLOWED_EMAILS` | Comma-separated allowlist | Missing an email here means that person can never sign in even with a valid code |

These are exactly 5 names. Two more flags exist but are **local-dev-only and
must never be set as production secrets**: `AUTH_INSECURE_COOKIES` (disables
the `Secure` cookie flag, needed because `astro dev` serves plain HTTP) and
`AUTH_DEV_LOG_OTP` (logs the sign-in code to the terminal instead of
emailing it). Both live only in `apps/admin/.dev.vars`.

`ADMIN_ALLOWED_EMAILS` and `BETTER_AUTH_URL` are secrets here (not `[vars]`
in `wrangler.toml`) because the repository must not reveal who has access or
the production hostname pattern in git history.

> **Warning — `BETTER_AUTH_URL` must be a bare origin.** Exactly
> `https://admin.animalsvidadigna.org` — no trailing slash, no path. The
> check is exact string equality against the browser's `Origin` header
> (`getOrigin(url)` inside better-auth's origin-check middleware). A value of
> `https://admin.animalsvidadigna.org/` (trailing slash) 403s **every**
> browser login in production while `curl` keeps returning 200 — `curl`
> sends no cookie, so better-auth's `validateOrigin` returns early and never
> runs the check; a real browser session does carry a cookie, so the check
> runs and fails silently from the operator's point of view. If the secret
> is unset entirely, `trustedOrigins` becomes `[undefined]` and the Worker
> throws a 500 instead of a clear error. This is documented in detail in
> `docs/superpowers/plans/2026-09-03-content-r2-pipeline/phase-4-security-review.md`
> (section "The `Invalid origin` 403 under `wrangler dev` is local-only") —
> read it before touching this secret. Locally, `BETTER_AUTH_URL` is set to
> `http://localhost:4322` instead, which is correct for local dev and is not
> this bug.

Rotation procedure for any of the above:

```bash
cd apps/admin
wrangler secret put BETTER_AUTH_SECRET   # paste the new value when prompted
```

Rotating `BETTER_AUTH_SECRET` signs everyone out immediately (all existing
session cookies fail signature verification on the next request) — warn
active volunteers before rotating it. Rotating `RESEND_API_KEY` or
`AUTH_EMAIL_FROM` has no visible effect until the next sign-in email is
sent.

Verify what's currently set (values are never shown, only names) with
`wrangler secret list` from `apps/admin/` — this talks to the real Cloudflare
account, run it yourself when you have credentials loaded; it is not
something this runbook can demonstrate. Expect exactly the 5 names above. If
any are missing, sign-in or email sending fails at runtime, not at deploy
time — Workers deploy successfully with undefined secrets.

## Adding or removing a volunteer

**Add:**

1. Append their email to `ADMIN_ALLOWED_EMAILS` and re-run
   `wrangler secret put ADMIN_ALLOWED_EMAILS` from `apps/admin/` with the
   full updated comma-separated list (this secret is not additive — you must
   paste the whole list each time).
2. Tell them to go to `https://admin.animalsvidadigna.org/login` and sign in
   with that email; no invitation email is sent automatically.

**Remove:**

1. Remove their email from the list and re-run
   `wrangler secret put ADMIN_ALLOWED_EMAILS` with the reduced list. This
   blocks all *future* sign-ins for that email but does not end an
   already-active session.
2. To end any existing session immediately, delete their row from D1's
   `user` table:

```bash
wrangler d1 execute avd-content --remote --command \
  "delete from user where email = 'person@example.com'"
```

better-auth's schema (`packages/content/src/schema-auth.ts`, generated by
`npx auth@latest generate` — do not hand-edit it) declares
`session.userId` and `account.userId` with `references(() => user.id,
{ onDelete: 'cascade' })`, and Cloudflare D1 enforces foreign-key
constraints by default (unlike vanilla SQLite, where `PRAGMA foreign_keys`
defaults off). Deleting the `user` row is therefore sufficient — it cascades
to that person's `session` and `account` rows automatically. If you want to
be explicit anyway (or if this ever changes), delete `session` and
`account` rows for that `user_id` first, then `user`, in that order.

## D1 migrations workflow

Two separate schemas share the one `avd-content` database and the one
`migrations_dir` (`packages/content/migrations/`, referenced from both
`apps/web/wrangler.toml` and `apps/admin/wrangler.toml`), but they are
**not** regenerated the same way:

- **Content tables** (`cats`, `cat_images`) live in
  `packages/content/src/schema.ts` (Drizzle) and are tracked by
  `packages/content/drizzle.config.ts`, whose `schema` field points only at
  `./src/schema.ts`.
- **Auth tables** (`user`, `session`, `account`, `verification`,
  `rate_limit`) live in `packages/content/src/schema-auth.ts`, which is
  generated by better-auth's own CLI (`npx auth@latest generate`, run from
  `apps/admin` — see that file's header comment), not by `drizzle-kit
  generate`. Running `drizzle-kit generate` does **not** pick up a change to
  `apps/admin/src/lib/auth.ts`'s plugin list; re-run `auth generate` for
  that.

Both write `.sql` files into the same `packages/content/migrations/`
directory, so the apply step below is identical for either kind of change:

```bash
cd packages/content
npx drizzle-kit generate            # content schema changes only — writes a new .sql file
wrangler d1 migrations apply avd-content --local    # apply to your local dev D1 first
wrangler d1 migrations apply avd-content --remote   # then to production
```

Run `drizzle-kit generate` from `packages/content/` (it reads
`drizzle.config.ts` there); run the two `wrangler d1 migrations apply`
commands from either app's directory (`apps/web/` or `apps/admin/`) since
both `wrangler.toml` files declare the same `database_id` for `avd-content`
— the migration only needs to run once against the remote database
regardless of which app's config you run it from. `wrangler d1 migrations
apply --remote` prompts for confirmation before applying and takes an
automatic backup first; the prompt is skipped (but the backup still
happens) in non-interactive shells (verified with
`wrangler d1 migrations apply --help` on wrangler 4.75.0).

## Local development

| App | Port | Env file | Notes |
|---|---|---|---|
| `apps/web` | 4321 (Astro's default; no `--port` flag in its `dev` script) | `apps/web/.dev.vars` — needs `RESEND_API_KEY` for the contact form; see `apps/web/.dev.vars.example` | `pnpm --filter web dev` |
| `apps/admin` | 4322 (`astro dev --port 4322` in its `dev` script) | `apps/admin/.dev.vars` | `pnpm --filter admin dev`; must contain `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=http://localhost:4322`, `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `ADMIN_ALLOWED_EMAILS`, `AUTH_INSECURE_COOKIES=1` (see `apps/admin/.dev.vars.example` for the full annotated list, including the dev-only `AUTH_DEV_LOG_OTP`) |

Both apps read `DB` from a **local** D1 instance (`wrangler dev` creates a
`.wrangler/state` sqlite file per app the first time it runs). Seed it once
per app with the SQL produced by `packages/content/scripts/seed-from-yaml.ts`
(`npm run seed:generate` in `packages/content`) or by exporting from remote
and importing locally:

```bash
wrangler d1 export avd-content --remote --output /tmp/avd-content-seed.sql
wrangler d1 execute avd-content --local --file /tmp/avd-content-seed.sql
```

`PUBLIC_IMAGES_ORIGIN` is a **public build-time** variable (not a secret) in
both apps, defaulting to `https://images.animalsvidadigna.org`; override it
in `.dev.vars` only if you are testing against a different R2 custom domain.
In local dev, `apps/admin`'s dev-only `GET /r2/[...key]` route
(`import.meta.env.DEV`) streams straight from the `IMAGES_BUCKET` binding so
uploaded images preview correctly without needing the public custom domain.

## Image transformation budget

Cloudflare Images Free allows **5,000 unique transformations per calendar
month**. Each distinct `(R2 key, transform options)` pair counts once per
month regardless of how many times it's requested;
`format=auto` (content negotiation) counts as one transformation regardless
of which format is actually served. The four canonical widths, defined once
in `packages/content/src/image-url.ts`, are:

```ts
export const DEFAULT_WIDTHS = [320, 640, 960, 1280];
```

At 4 widths per image, that's roughly 1,250 new distinct images addable per
month before any single one falls back to serving its original
(`onerror=redirect` in the transform URL, already built in).

> **Do not "fix" the admin's thumbnail widths.** `apps/admin/src/lib/
> cover-thumbnail.ts` (`coverThumbnailUrl`) and the gallery grid in
> `apps/admin/src/components/image-manager.tsx` (`imageUrl(image.r2Key, 320,
> origin)`) both deliberately reuse `DEFAULT_WIDTHS[0]` (320px) even though
> the thumbnail box they render into is much smaller (64×64 in the cover
> case, scaled with `object-cover`). This is intentional, not an
> oversight — see the comment at the top of `cover-thumbnail.ts`. Requesting
> a CSS-matched width instead (e.g. 128px) would mint a brand-new unique
> transformation for every image on every admin browse, burning through the
> monthly budget fast. It would also **fail outright in production**: a
> zone-level WAF rule allowlists exactly the four `DEFAULT_WIDTHS` values on
> `/cdn-cgi/image/...` requests to `images.animalsvidadigna.org`; any other
> width returns a 403, not a resized image.

Check current usage: Cloudflare dashboard → your zone →
**Images → Overview** shows the transformations-this-month graph. There is
no CLI command for this figure as of wrangler 4.75.0.

## Orphan image sweep

Deleting a cat or removing a gallery image removes its D1 row but not
necessarily its R2 object if a request fails partway. `packages/content/src/
orphans.ts` exports the pure logic for finding these —
`isCatImageKey(key: string): boolean` and
`findOrphans(r2Keys: string[], dbKeys: string[]): string[]` — and
`packages/content/scripts/sweep-orphan-images.ts` wraps it with the R2/D1
network calls. Run it periodically (monthly is enough at this shelter's
volume), from `packages/content`:

```bash
cd packages/content
CLOUDFLARE_ACCOUNT_ID=<account id> \
R2_ACCESS_KEY_ID=<r2 api token access key id> \
R2_SECRET_ACCESS_KEY=<r2 api token secret> \
  npx tsx scripts/sweep-orphan-images.ts             # dry run, lists orphans only
CLOUDFLARE_ACCOUNT_ID=<account id> \
R2_ACCESS_KEY_ID=<r2 api token access key id> \
R2_SECRET_ACCESS_KEY=<r2 api token secret> \
  npx tsx scripts/sweep-orphan-images.ts --delete    # actually deletes them
```

`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` are the S3-compatible
credentials from an **R2 API token**
(dashboard → R2 → Manage API tokens →
<https://developers.cloudflare.com/r2/api/tokens/>) — this is a distinct
credential type from a general Cloudflare API token, and it's what the
script needs because listing R2 objects (`wrangler r2 object` only has
`get`, `put`, and `delete` — there is no `list` subcommand, verified with
`wrangler r2 object --help` on wrangler 4.75.0) has to go through the R2
S3-compatible API instead.

> **This script's network/CLI half has never been executed against real
> infrastructure.** Only its pure diff functions (`isCatImageKey`,
> `findOrphans`) are unit-tested. Always run the plain (dry-run) form first
> and read through the list of keys it prints before ever passing
> `--delete` — an R2 delete is not undoable from this tool.

## Backups

```bash
wrangler d1 export avd-content --remote --output backup-$(date +%Y%m%d).sql
```

`--remote`, `--output`, `--table`, `--no-schema`, and `--no-data` are all
real flags on wrangler 4.75.0 (verified with `wrangler d1 export --help`
while writing this runbook — re-run that command yourself after any
wrangler upgrade, since flags are not covered by this repository's tests).
Store the resulting `.sql` file outside the repository (it contains
personal data — volunteer emails in the `user` table). R2 objects have no
equivalent single-command export; for a full image backup, use
`wrangler r2 object get` per key (only `get`/`put`/`delete` exist, no bulk
export) or the S3-compatible API's batch download tools.

## Rollback per phase

- **This phase (Phase 6):** revert its merge commit. This restores
  `apps/web/scripts/sync-images.ts` and any other deleted files, and
  reverts the `.planning`/README changes — it does **not** restore
  volunteers' GitHub Write access or the deleted collaborator invitations,
  which must be redone manually via the GitHub API's collaborators
  endpoints if reverting is genuinely needed.
- **Earlier phases:** each phase's own doc states its rollback (revert the
  merge commit; D1/R2 state from an already-merged phase is not
  automatically rolled back and must be handled per the migration plan's
  rollout-order and safety guidance).

## Monitoring

Cloudflare dashboard → **Workers & Pages → animals-vida-digna-admin →
Observability → Logs** (and the equivalent for `animals-vida-digna`) shows
live request logs. Watch for:

- `ActionError` with a 500 status in the admin Worker's logs — indicates an
  uncaught exception in an Astro Action (`cats.create`, `images.upload`,
  etc.); the error message and stack are in the log line.
- R2 `put` failures during `images.upload` — surface as an `ActionError`
  with a message mentioning the bucket or key; check `IMAGES_BUCKET` is
  still bound correctly in `apps/admin/wrangler.toml` if these start
  appearing after a config change.
- A spike in `401`/`UNAUTHORIZED` action responses — normal if a volunteer's
  session expired, worth investigating if it correlates with a secret
  rotation you didn't intend (see the `BETTER_AUTH_SECRET` warning above).
