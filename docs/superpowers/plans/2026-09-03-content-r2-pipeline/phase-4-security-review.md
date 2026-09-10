# Phase 4 security review — `apps/admin`

Date: 2026-09-04
Reviewer: Opus, read-only, against commits `da05c30..8e4f4c2` plus the two
follow-up auth fixes.
Status: **three blockers fixed; the rest deliberately left open for a future
session** at the maintainer's instruction ("do not fix these issues, leave it
in the docs so I can pick it up in a new session").

> **Read this before deploying `apps/admin` anywhere.** The app is not yet safe
> to expose at `admin.animalsvidadigna.org` — see *Outstanding* and
> *Before any deploy* below.

## State of the branch

Everything lives on `worktree-content-r2-impl` (worktree
`.claude/worktrees/content-r2-impl`). Nothing is pushed, nothing is merged,
nothing is deployed. `pnpm turbo test build check lint --force` is green:
15 tasks, 502+ tests. `pnpm --filter web test:e2e` is 60 passed / 2 skipped.
`apps/admin` bundle is 675.63 KiB gzip against the 3 MB Workers Free limit
(from an executed `wrangler deploy --dry-run`).

## Fixed before work stopped

These three landed and are covered by tests. They are **not** outstanding.

| # | Finding | Commit |
|---|---|---|
| H1 | Allowlist re-checked on every request, not only at sign-up | `4709863` |
| H2 | Every `emailOTP` / `forget-password` route blocked except sign-in | `5ac9ba7` |
| M1 | Fail loudly on a missing secret instead of 500ing or forging | `48e37fa` |

Two earlier fixes, from a prior round, are also in: `0dee403` (no
`verification` row for a non-allowlisted address) and `ec67ea4` (forward
`cf-connecting-ip`, the header the rate limiter actually trusts).

The three commits above were **verified green by the full pipeline** but were
**not** re-reviewed, and their own manual `wrangler dev` verification was not
completed — the work was stopped mid-task. Re-verify them before trusting them.

### What H1 was, and why it mattered most

`apps/admin/src/middleware.ts:16-18` authorized purely on
`context.locals.user` being non-null. `isAllowedEmail` was consulted only at
create time — `databaseHooks.user.create.before` (`src/lib/auth.ts:80`) and
`sendVerificationOTP` (`:97`). There was **no request-time check**. Sessions are
rolling: better-auth refreshes `expiresAt` whenever a session is older than
`updateAge` (default 1 day), so an active user's 7-day cookie never expires.

So `ADMIN_ALLOWED_EMAILS` governed who could *obtain* an account but not who
*retained* access. A volunteer who left — or a stolen laptop with a logged-in
profile — kept working access indefinitely after the maintainer removed the
address, ran `wrangler secret put` and redeployed. Real revocation would have
required hand-deleting `session`/`user` rows from production D1, documented
nowhere. For an app whose entire authorization model is one environment
variable, that made it unfit for its stated purpose.

Session revocation does genuinely work here, which is why the fix is viable:
`options.database` is set, so `isStateful` is true and `getSession` hits D1 on
every request — better-auth is not serving a cached JWE cookie.

### What H2 was

The `hooks.before` gate matched a single path, but the emailOTP plugin
registers nine public routes. `/email-otp/request-password-reset` and the
deprecated `/forget-password/email-otp` call `resolveOTP` →
`createVerificationValue` *before* checking whether the user exists. Worse,
`sendVerificationOTP` accepted `{ email, otp }` and **ignored the `type`
argument**, so those routes delivered genuine, correctly-branded access-code
emails to any address with a `user` row. With the login placeholder advertising
the `nom@animalsvidadigna.org` pattern, an attacker could script thousands of
real emails at a known admin: inbox flooded, Resend quota burned, and a
phishing page dropped into that flood made far more credible by the authentic
codes surrounding it. Not account takeover — identifiers are namespaced by
type — but abuse and phishing-enablement.

### What M1 was

better-auth falls back to the published constant
`"better-auth-secret-12345678901234567890"` for `BETTER_AUTH_SECRET` and only
throws when `process.env.NODE_ENV === "production"`, which is not reliably set
inside a workerd bundle. A mistyped or omitted secret meant the Worker booted
and signed session cookies with a value published in better-auth's own source
tree — anyone noticing could forge a session for any email and get full write
access with no OTP. Separately, `parseAllowedEmails(undefined)` throws inside
`createAuth`, which runs in middleware on *every* request, so a forgotten
secret was a total outage including `/login`.

## Outstanding — not fixed, pick up here

### M2 — no per-address send throttle

better-auth's tightened 3-per-10s rule covers only `/sign-in`, `/sign-up`,
`/change-password`, `/change-email`
(`better-auth/dist/api/rate-limiter/index.mjs:305-308`); `/email-otp/*` falls to
the general default. One IP can drive thousands of OTP emails and D1 writes at a
single allowlisted address. H2's fix removes the credential-free path to this,
but hammering a known-good address was never gated.

**Fix:** add a `rateLimit.customRules` entry for `/email-otp/*`, with a test
that the limit engages.

### M3 — `worker-configuration.d.ts` is gitignored but is the sole definition of `Env`

Both the root `.gitignore` and `apps/admin/.gitignore` exclude it; `git ls-files`
confirms it is untracked. Yet `apps/admin/tsconfig.json:11` includes it
explicitly and `Env` is referenced by `src/lib/auth.ts`, `src/middleware.ts` and
two test files. **On a fresh clone `pnpm --filter admin check` fails with
"Cannot find name 'Env'".**

Regenerating does not fix it: the seven auth keys at
`worker-configuration.d.ts:9-15` exist only because `.dev.vars` was present when
`wrangler types` ran — and `.dev.vars` is gitignored too. A contributor must
`cp .dev.vars.example .dev.vars` *then* `wrangler types`, in that order. That
prerequisite is documented **only** inside phase-4 task bodies (`:1249`,
`:1920`); no README or CONTRIBUTING mentions it, `turbo.json`'s `check` task has
no `dependsOn`, and there is no CI (`.github/workflows` does not exist) to catch
it. Everything type-checks today only because the generated file happens to be
sitting in the working tree.

**Fix:** commit the generated file, generate it in a pretask, or document the
sequence somewhere a newcomer will actually find it.

### M4 — `cn@^0.2.5` should be pinned exactly

The package itself is clean and from the expected publisher: `repository:
git+https://github.com/shadcn-ui/cn.git`, zero runtime dependencies, no install
scripts, no `fetch`/`eval`/`new Function`, no network or filesystem access — a
compiled clsx + tailwind-merge replacement built on precompiled lookup tables.

The objection is the range. A caret on a young 0.x package auto-accepts any
0.3.x, and this is now transitively on every rendered page of the app guarding
the production cat database. The lockfile pins today, but the caret widens
silently on the next `pnpm update`.

**Fix:** `"cn": "0.2.5"` in `apps/admin/package.json`, refreshing only that
lockfile entry.

### H3 — the phase doc ticks production verification that never happened

`phase-4-admin-shell-auth.md:2139-2142` marks `- [x]` for *production login via
Resend*, *D1 session row created*, and *non-allowlisted address rejected in
production*, while **Task 10 (`:1996-2071`) and Task 11 (`:2072-2129`) — the
tasks that produce those results — are entirely unticked.** Nothing has been
deployed. Every empirical result on record came from local D1 with
`AUTH_DEV_LOG_OTP=1`, which short-circuits Resend at `src/lib/auth.ts:100-104`,
so **the Resend delivery path has never executed inside a Worker**.

The Phase 0 `curl` did prove the *sender* works and mail was received — a
related but different claim.

**Fix:** un-tick those four lines; execute Tasks 10 and 11 for real. A first
real send is the only thing that surfaces an unverified sender domain or a
mis-scoped API key, and discovering that after cutover locks every volunteer out
with no fallback.

### L1 — `components.json` points at a `utils` module that does not exist

`apps/admin/components.json:9` declares `"utils": "@/lib/utils"` and
`tests/shadcn-wiring.test.ts:46` asserts that value, but `src/lib/utils.ts` does
not exist — shadcn 4.21 imports `cn` from the npm package instead. Nothing is
broken today, but the next `npx shadcn add` will emit
`import { cn } from '@/lib/utils'` against a missing module.

### L2 — two rendered colour pairs are unguarded by the contrast test

`tests/a11y-contrast.test.ts` covers nine token pairs but omits `text-primary`
on `background` (login heading `src/pages/login.astro:14`, and the link-variant
Button) and `text-destructive` on `background`
(`src/components/login-form.tsx:104`). Both pass in fact (~8:1 and ~6.6:1), so
this is an unguarded gap rather than a live failure.

### L3 — mislabelled test

`tests/shadcn-wiring.test.ts:65` is titled "vendors only the components the
admin needs" but its body asserts CSS token values. Mislabelled, not vacuous.

### L4 — regenerated migration metadata

`447714e` regenerated `packages/content/migrations/meta/0001_snapshot.json` and
`_journal.json` for an already-shipped migration. The `.sql` is unchanged so it
is harmless, but it degrades the journal as a drift signal.

### L5 — stale `- [x]` ticks in the phase doc

`:432, :461, :493, :498` tick writing and running
`tests/design-system-import.test.ts`, which was deleted in the shadcn migration.
`:477` ticks an `admin.css` that `@import`s `@avd/design-system/styles.css`; the
real `src/styles/admin.css:1-8` has neither. `:1702` ticks
`src/pages/cats/status-labels.ts`; the file is `src/lib/cat-status-labels.ts`
(moved in `447714e` because Astro routes every `.ts` under `src/pages/`).
`:328` ticks a tsconfig snippet lacking the `baseUrl`/`paths` and
`worker-configuration.d.ts` include the real file has. `:1093, :1185` tick
`auth.ts` / `[...all].ts` snippets predating both security fixes — and the two
regression tests those fixes added
(`verification-row-allowlist.test.ts`, `forwarded-ip-header.test.ts`) appear in
**no** plan step at all.

Minor, related: `tests/ui-migration.test.tsx` breaks the flat `tests/*.test.ts`
convention (vitest `include` was widened to match), and `apps/admin/biome.json`
exists with no plan step creating it.

## Two unknowns that were chased down and cleared

### The `Invalid origin` 403 under `wrangler dev` is local-only

`apps/admin/.dev.vars` sets `BETTER_AUTH_URL=http://localhost:4322`, so
`trustedOrigins` resolves to `["http://localhost:4322"]`. Two mechanics explain
the curl/browser split. `validateOrigin` returns early when a request carries no
`Cookie` header and `forceValidate` is false
(`better-auth/dist/api/middlewares/origin-check.mjs:108`), so a bare `curl`
never triggers the check and gets 200. A browser session does carry cookies, so
the check runs and compares the page's real origin —
`http://admin.animalsvidadigna.org`, from a hosts-file mapping onto the local
port — against `http://localhost:4322`. No match, so it logs exactly the
observed line and throws `FORBIDDEN`.

**Production is unaffected**: `BETTER_AUTH_URL` will be
`https://admin.animalsvidadigna.org` and the browser's `Origin` header is
byte-identical. The origin check is working correctly; the dev environment is
lying about its hostname. Fix locally by setting `BETTER_AUTH_URL` to the exact
scheme, host and port you browse under `wrangler dev`.

> **Runbook item — do not lose this.** `BETTER_AUTH_URL` must be a **bare
> origin**: no trailing slash, no path. The comparison is exact string equality
> against `getOrigin(url)`, so `https://admin.animalsvidadigna.org/` would 403
> **every** browser login in production while curl kept returning 200 — the same
> confusing asymmetry, but live. If `BETTER_AUTH_URL` is unset entirely,
> `trustedOrigins` becomes `[undefined]` and `matchesOriginPattern` throws on
> `pattern.includes("*")`, producing a 500 rather than a clear error. M1's
> fail-fast assertion now covers both.

### Preserving an inbound `cf-connecting-ip` is safe

`src/pages/api/auth/[...all].ts:36-40` sets the header only when absent.
`apps/admin/wrangler.toml:11-12` sets `workers_dev = false` and
`preview_urls = false`, and `:19-21` routes the Worker exclusively via
`pattern = "admin.animalsvidadigna.org"` with `custom_domain = true`. There is
therefore no `*.workers.dev` or per-deploy preview hostname on which this Worker
is reachable, so every request has traversed the Cloudflare edge for that custom
domain — and the edge *overwrites* `cf-connecting-ip` rather than appending. The
"fill only when absent" branch fires only where no edge exists: `astro dev` and
local `wrangler dev`.

Note this is the opposite choice from `apps/web`, which deliberately enables
preview URLs (brochure site, no session state). The residual risk is a config
regression — flipping `workers_dev`/`preview_urls` to `true`, or adding a second
route, would expose a host where `cf-connecting-ip` is attacker-suppliable,
letting them mint a fresh rate-limit identity per request and defeat the OTP
throttle. That is guarded by `tests/wrangler-config.test.ts:62-65`, which would
fail. Adequately defended; not a finding.

## Verified clean

- **CSRF** on sign-out and state-changing routes — Astro 5's
  `security.checkOrigin` defaults to `true`; the action independently rejects
  unauthenticated callers (`src/actions/index.ts:8-13`); `/_actions/*` is absent
  from `PUBLIC_PATH_PREFIXES` so middleware gates it too.
- **Open redirect** — none. The post-login redirect is a hardcoded
  `window.location.assign('/cats')` (`src/components/login-form.tsx:87`); no
  `callbackURL`/`redirectTo`/`errorCallbackURL` is ever passed.
- **Static-asset auth bypass** — every page sets `prerender = false`; `dist/`
  holds only `_astro/` and `_worker.js` with no prerendered HTML;
  `_routes.json` is `include:["/*"], exclude:["/_astro/*"]`. Nothing routes
  around the middleware. This was the reviewer's main hypothesis for a hidden
  CRITICAL and it does not hold.
- **`getVerificationOTP` / `createVerificationOTP`** — would hand out a
  plaintext OTP for an arbitrary address, but both are
  `createAuthEndpoint.serverOnly` and are skipped when the router is built
  (`better-call/dist/router.mjs:22`). Not reachable over HTTP.
- **The vendored `components/ui/*`** — all nine files grepped for
  `dangerouslySetInnerHTML`, `fetch(`, `eval(`, `new Function` and any
  `http(s)://` literal: zero hits. Unmodified registry output. The 13 inline
  `dark:` utilities are neutralised by `src/styles/admin.css:8`'s
  `@custom-variant dark (&:where(.dark, .dark *))`, and nothing in the app ever
  sets a `.dark` class — so a volunteer on a dark-mode OS gets the light token
  set consistently.
- **The deleted `design-system-import.test.ts`** — read at `c6f9177^`; it
  guarded only `@avd/design-system` module resolution and its `styles.css`
  export, a dependency that no longer exists. `shadcn-wiring.test.ts` plus
  `ui-migration.test.tsx` are strictly more coverage.
- **Tests that would genuinely fail on regression** —
  `verification-row-allowlist.test.ts` uses a real Miniflare D1 via
  `getPlatformProxy` and asserts row counts before/after plus response
  indistinguishability; `forwarded-ip-header.test.ts` asserts both branches and
  that `x-forwarded-for` is absent from `ipAddressHeaders`;
  `a11y-contrast.test.ts` parses hexes from the live CSS and includes a
  deliberate proof that its helper can report a FAIL (`:44-48`) — explicitly
  guarding against the fixture-masking failure mode seen in Phase 3.
- **Secrets** — `.dev.vars` gitignored and untracked; `.dev.vars.example` holds
  placeholders only; dev-only OTP logging is gated on `AUTH_DEV_LOG_OTP === '1'`
  and both dev flags are documented as never set in the deployed Worker.
- **Free-tier constraints** — no Images binding, no Workers Paid feature;
  `wrangler.toml` binds only D1, R2 and assets.

## Before any deploy

1. Re-verify `4709863`, `5ac9ba7`, `48e37fa` — they were committed and are
   pipeline-green, but their manual `wrangler dev` verification never completed
   and they have not been re-reviewed.
2. Close **M2**, and decide on **M3**/**M4**.
3. Execute Task 10 and Task 11 for real, then correct the ticks at `:2139-2142`
   (**H3**).
4. Confirm `wrangler secret list` shows `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
   (exactly `https://admin.animalsvidadigna.org`, **no trailing slash**),
   `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `ADMIN_ALLOWED_EMAILS` — and that
   `AUTH_INSECURE_COOKIES` and `AUTH_DEV_LOG_OTP` are **absent**.
5. Apply `0001_auth.sql` to production D1
   (`wrangler d1 migrations apply avd-content --remote` from `apps/admin`).
6. Create the second Workers Builds project: root `apps/admin`, build
   `pnpm build`, deploy `npx wrangler deploy`, watch paths `apps/admin/**`,
   `packages/**`, `pnpm-lock.yaml`. Then `pnpm build && npx wrangler deploy`,
   which creates the `admin.animalsvidadigna.org` custom domain, DNS and TLS.

## Where the plan stands

Phases 0–4 are implemented on this branch; **Phase 5 (cats CRUD + image
uploader) has not been started**, and Phase 6 (cutover, docs, revoking
volunteers' GitHub write access) follows it. Phase 5 also carries the
*Deferred verification owed by this phase* section in
`phase-5-admin-cats-images.md` — the end-to-end image-chain checks that were
postponed because no real cat photo exists yet.
