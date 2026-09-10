# Phase 6 — Cut-over verification results

Date: 2026-09-10
Verified by: automated verification agent (this session), no Cloudflare
account access, no GitHub admin write access exercised, no browser available.

> **Read this before deploying.** As with Phases 4 and 5, a large share of
> this phase's own Task 9/10 checklist cannot be executed from this sandbox:
> `wrangler secret list`, remote D1 migrations, the live WAF matrix,
> Lighthouse against production, and the timed volunteer walkthrough all
> require Cloudflare/browser access this environment does not have. Every
> item below is either a real, pasted result or an explicit **maintainer-only,
> not run** row — never a silent PASS for work that did not happen.

## What Phase 6 changed

24 commits (`db0cce5..HEAD`), 35 files, +14745/−215 (`pnpm-lock.yaml` and the
generated `apps/admin/worker-configuration.d.ts` account for most of the
insertion count). By theme:

- **Docs for the cut-over**: `docs/admin-guide.md` (volunteer guide, new),
  `docs/admin-runbook.md` (maintainer runbook, new), root `README.md` (new,
  monorepo layout + doc links), `docs/keystatic-admin-setup.md` rescoped to
  settings/landing/pages only, `.planning/*` updated for the D1/R2 content
  admin architecture.
- **Legacy pipeline removal**: `apps/web/scripts/sync-images.ts` deleted; the
  git-based cat YAML/image pipeline's remaining leftovers removed.
- **Orphan R2 sweep**: `packages/content/scripts/sweep-orphan-images.ts` (new)
  plus `packages/content/src/orphans.ts` and its pure-function tests
  (`packages/content/tests/orphans.test.ts`) — the diff/list logic is tested;
  the script's actual R2/D1 network calls have never executed.
- **OTP send throttle (M2, bounded not eliminated)**: a per-address throttle
  (5 sends / 5 min) added in `apps/admin/src/lib/auth.ts`, guarding the
  built-in per-IP one, plus a fix so better-auth's row-pruning doesn't reset
  the throttle window early (`bdbe7e1`). Covered by
  `otp-send-address-throttle.test.ts`, `otp-send-address-throttle-pruning.test.ts`,
  `otp-send-ip-throttle.test.ts`.
- **jsdom + Testing Library harness** (Phase 5's recommended follow-up,
  delivered here): `apps/admin/vitest.config.ts` extended, `tests/support/dom-setup.ts`
  added, and `image-manager-interaction.test.tsx` (271 lines) added, which
  caught a real reorder-during-save data-loss defect, fixed in `e0bf8ea`.
- **Batched cat-image writes**: `packages/content/src/cats.ts` updates now
  batch per-save instead of issuing one UPDATE per image (`a66bae0`),
  addressing the deferred atomicity item from `phase-5-results.md`.
- **Lint script for `apps/admin`**: scoped to `.ts`/`.tsx` under `src` and
  `tests` (`1877337`), then hardened to `find -exec +` instead of
  `find | xargs` (`bbf3ea1`) — closes the Phase 5 follow-up that admin had no
  lint script.
- **Phase 4 doc corrections**: un-ticked production-verification claims in
  `phase-4-admin-shell-auth.md` that were never actually performed (H3,
  `5a6eaf4`), and stale snippets annotated (L5, `c6955d5`) — repairs the
  exact failure mode ("ticking a box for work that never happened") this
  verification task is itself guarding against.
- **Generated file committed**: `apps/admin/worker-configuration.d.ts`
  (12,080 lines) committed rather than regenerated at build time, scoped to
  `apps/admin` only (`70b694b`).
- Assorted small fixes: `components.json` utils alias, lockfile resync for a
  `cn` pin, an unused import removed from a test.

## Automated checks

| Command | Result |
|---|---|
| `pnpm turbo test build check lint --force` | **PASS** — 16/16 tasks successful. `admin:check` 88 files, 0 errors, 0 warnings. `admin:test` 37 files / 265 tests passed |
| `pnpm --filter web test:e2e` | **PASS, with a caveat.** First run (default unlimited Playwright workers) showed 8 failures, all 30s timeouts on basic `.fill()`/`waitForLoadState` calls under `mobile-chrome`/`chromium` — consistent with this sandbox's CPU contention running many Chromium workers in parallel, not an assertion failure. Re-run with `--workers=2`: **62 passed, 0 failed**, 20.7s. Matches Phase 5's 62/62 baseline exactly |
| `git ls-files apps/web/public/images` | **PASS** — exactly `hero_image.webp`, `logo.webp` |
| `wrangler deploy --dry-run` (apps/admin, local build only) | 4482.64 KiB / **843.01 KiB gzip**, 28% of the 3 MB Workers Free limit |
| `git log --oneline db0cce5..HEAD \| wc -l` | **24** (expected 24, confirmed) |

## Secrets verification (Task 9)

| Check | Result |
|---|---|
| `git grep -nE 're_[A-Za-z0-9]{20,}'` | **PASS** — no output |
| `git grep -n BETTER_AUTH_SECRET` | **PASS** — every match is a source-code reference to the env var name, documentation, or a test/`.dev.vars.example` dummy value (`test-secret-test-secret-test-secret`, `dev-only-not-a-real-secret-please-rotate-in-prod`). No `.dev.vars` file appeared in the output |
| `git ls-files "*.dev.vars"` | **PASS** — empty, no tracked `.dev.vars` file |
| `wrangler secret list` shows exactly 5 names, `AUTH_INSECURE_COOKIES`/`AUTH_DEV_LOG_OTP` absent | **Maintainer-only, not run** — this sandbox has no Cloudflare account access; the command was attempted and was refused by the sandbox's own permission classifier before any network call, confirming remote wrangler calls are genuinely blocked here, not silently skipped |

## Lighthouse (mobile)

**Maintainer-only, not run.** No browser is available in this sandbox and
nothing is deployed, so there is no production URL to point Lighthouse at.
Every cell below is unset — this is not a passed check with blank formatting,
it is a check that did not happen.

| URL | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| `/` | not run | not run | not run | not run |
| `/cats` | not run | not run | not run | not run |
| `/cat/<slug>` | not run | not run | not run | not run |
| `/es/cats` | not run | not run | not run | not run |

## Volunteer end-to-end timing

**Maintainer-only, not run.** Requires a deployed `admin.animalsvidadigna.org`
and a real browser session; neither exists in this sandbox. Not timed, not
simulated.

## Whole-plan Definition of done

| Item | Command/URL run | Result |
|---|---|---|
| Volunteer flow, no PR | — | **Maintainer-only, not run** — no deployment exists |
| `git ls-files apps/web/public/images` → only hero_image.webp, logo.webp | run | **PASS** |
| No Images/Workers Paid subscription | — | **Maintainer-only, not run** — requires Cloudflare dashboard access |
| `pnpm turbo test && pnpm turbo build` | run (via `pnpm turbo test build check lint --force`) | **PASS** |
| Lighthouse ≥ 95 ×4 ×4 | — | **Maintainer-only, not run** — no browser, nothing deployed |
| GitHub ruleset unchanged | `gh api repos/OsoThevenin/animals-vida-digna/rulesets/22118349 --jq '.rules[].type'` | **PASS** — returned `deletion`, `non_fast_forward`, `pull_request`, unchanged from the expected set. (`gh` credentials happened to be present in this sandbox for this one read-only call; see note below) |
| No volunteer holds Write access | `gh api repos/OsoThevenin/animals-vida-digna/collaborators --jq '.[] \| "\(.login) — \(.permissions \| to_entries \| map(select(.value)) \| map(.key) \| join(","))"'`, plus `gh api repos/OsoThevenin/animals-vida-digna/invitations --jq '.[] \| "\(.invitee.login) — \(.permissions)"'` and `gh api repos/OsoThevenin/animals-vida-digna/keys --jq '.[].title'` | **Verified.** Full permission listing: `OsoThevenin — admin,maintain,pull,push,triage`, i.e. the sole collaborator, and it's the maintainer. `invitations` returned no output (no pending, unaccepted invites — see nuance below). `keys` returned no output (no deploy keys). The **current state** is factually correct: nobody but the maintainer holds Write today |
| `docs/admin-guide.md` exists and matches reality | `test -f`, contents read | **PASS** — exists, 8623 bytes |
| `docs/admin-runbook.md` exists and matches reality | `test -f`, contents read | **PASS** — exists, 18911 bytes |

Note on the `gh` calls above: this task's brief expected no GitHub credentials
to be available and instructed recording any auth failure as unverified
rather than retrying. In this run, `gh` credentials happened to be present,
so all of the read-only `gh api` calls above succeeded. No write/destructive
`gh` call was attempted, per the explicit constraint against performing
Task 8's removal step. The results are pasted above as genuinely observed
output, not inferred.

**Important nuance — what "verified" does and does not mean here.** The row
above confirms the *current, observable state* is correct: right now, only
the maintainer holds Write, nobody has a pending invitation that would grant
it, and there is no deploy key. It does **not** confirm that Task 8's
*removal action* was performed by this plan. Two explanations are
consistent with the observed data and this session cannot distinguish them:
either (a) volunteers were previously granted GitHub Write access (as the
old Keystatic GitHub-mode flow implies) and were removed at some point
before this verification, or (b) no volunteer was ever added as a GitHub
collaborator in the first place, in which case part of Task 8's premise —
and the migration's framing about "revoking" volunteer access — describes a
situation that never existed. The maintainer should confirm which of these
is true; the practical outcome (no volunteer holds Write today) is the same
either way, but the history matters for understanding what actually happened
during this migration.

**A gap in the plan's own check, worth recording for a future audit.** Task
9/10's own verification for this item (`phase-6-cutover-docs.md` Task 8 Step
5, and this results file's original template) checks only
`gh api .../collaborators`. That endpoint does **not** list *pending*
invitations. A volunteer who was invited with Write but never accepted the
invitation would be invisible to that check, yet would gain Write the moment
they clicked accept — possibly long after the maintainer believed access was
closed off. The separate `/invitations` endpoint (and, for completeness,
`/keys` for deploy keys) must be checked too. Both were empty in this run,
so there is no live exposure today, but the maintainer checklist below now
includes both endpoints so this cannot be missed on a future audit.

## Outcome

**Partial — Phase 6 is implemented and its automated/git-level checks pass;
the plan as a whole is not done.** Every check reachable from this sandbox
(pipeline, e2e, image-file inventory, secret scans, doc existence/links,
commit count, local bundle size, and the full set of read-only `gh` reads —
collaborators with permissions, invitations, deploy keys, ruleset) is real
and PASS, including "no volunteer holds Write access," which is now verified
as a current-state fact (see the Definition-of-done table and its nuance
note above — verified state, not a verified removal action). Six items
remain genuinely unverified and are **maintainer-only**: `wrangler secret
list` against the real Worker, applying migrations to production D1,
creating the second Workers Builds project, Lighthouse ×4×4 against a live
deployment, the timed volunteer walkthrough, and the orphan-sweep dry run
against real R2/D1. See the consolidated checklist below.

## Known residuals (carried forward, not resolved by Phase 6)

- **M2 is bounded, not eliminated.** A per-address OTP throttle (5 sends / 5
  min) now exists (`apps/admin/src/lib/auth.ts`, `otp-send-address-throttle*.test.ts`),
  but a persistent multi-IP attacker can still drive ~1,440 emails/day at one
  address. The counter is read-then-write, not transactional. It depends on
  a `rateLimit.customRules` window staying ≥ the throttle window, enforced
  only by a regression test — a dedicated counter table would remove both
  residuals and is a recommended follow-up.
- **M2 Residual 4 (whole-branch review Important-5) — the per-address
  throttle is a silent sign-in denial vector for a known volunteer.**
  `consumeEmailSendThrottle` runs, and writes to the counter, before the
  allowlist check and before better-auth's own `type` check, and a denial
  never advances `lastRequest`. An attacker who knows a volunteer's email
  (published on the shelter's website) can therefore keep two IPs sending
  `{email, type: "anything"}` — 2 × 15 per 300s (the per-IP max, raised in
  fix round 2) comfortably exceeds the per-address max of 5 — and hold
  that address's counter permanently saturated. The victim's genuine
  request then lands in the same saturated window and gets
  `{ success: true }` with no email sent, indistinguishable by design from
  a real send. This is judged inherent to any per-address rate limit and
  not a design defect to fix; what was missing before this fix round was
  that it was undocumented, with no operator remedy. Both are now
  addressed: `docs/admin-runbook.md`'s "Sign-in rate limits" section
  documents how to recognise it (a volunteer confirmed present in
  `ADMIN_ALLOWED_EMAILS` reports never receiving a code) and the fix
  (`delete from rate_limit where key = 'email-otp-address:<email>'`
  against the real D1), and `docs/admin-guide.md`'s "No rebo el codi"
  section tells the volunteer to wait a few minutes before escalating.
- **The orphan sweep script's network half has never executed.** Only its
  pure functions (`packages/content/src/orphans.ts`) are tested via
  `packages/content/tests/orphans.test.ts`. The maintainer must run the dry
  run and inspect the output before ever passing `--delete`. Its XML parser
  does not decode entities (safe today because keys come from
  `imageKey(catId, nanoid())`).
- **Nothing in the admin UI has been clicked in a real browser.** Island
  hydration and the `AlertDialog` focus trap remain inspection-verified
  only, though the new jsdom + Testing Library harness now covers
  `image-manager.tsx`'s async wiring (`image-manager-interaction.test.tsx`)
  and caught a real reorder-during-save data-loss defect, fixed in `e0bf8ea`.
- **ADMIN-03's observable state is now verified, its history is not.** The
  current GitHub state is confirmed correct: only the maintainer holds
  Write, there are no pending invitations, and no deploy keys exist (see the
  Definition-of-done table above). What is *not* established is whether this
  is the result of a deliberate Task 8 removal performed during this plan,
  or whether no volunteer was ever granted GitHub Write access at all — in
  which case Task 8's premise (and the migration's framing about "revoking"
  volunteer access) describes something that never happened. `ADMIN-03` in
  `.planning/REQUIREMENTS.md` is currently marked unchecked/"pending
  maintainer action"; the maintainer can now revisit it, since the
  observable state it describes is satisfied — this file does not edit that
  requirements doc, since it is out of this task's scope.

## Maintainer-only checklist

This section is Phase 6's addition, on top of — not instead of —
`phase-4-security-review.md`'s *Before any deploy* list and
`phase-5-results.md`'s *Maintainer-only checklist*. All three are
complementary and must be worked, in this order: Phase 4's list first
(re-verify H1/H2/M1, close M2/M3/M4, confirm secrets, apply migrations,
create the Workers Builds project), then Phase 5's (remote D1 sanity, remote
placeholder rows, live WAF matrix, full-chain final hop, the revocation
check, production manual QA), then this phase's items below. Every command
below was cross-checked against `npx wrangler --help` on the installed
wrangler 4.75.0 before being written here.

**1. Task 8 — remove volunteer GitHub collaborator access (decision +
execution, not just observation)**
```bash
gh api repos/OsoThevenin/animals-vida-digna/collaborators \
  --jq '.[] | "\(.login) — \(.permissions | to_entries | map(select(.value)) | map(.key) | join(","))"'
```
Cross-reference against who needs ongoing review access to `main`. For each
volunteer to remove:
```bash
gh api -X DELETE repos/OsoThevenin/animals-vida-digna/collaborators/<login>
```
**`collaborators` alone is insufficient** — it does not list *pending*,
unaccepted invitations. A volunteer invited with Write who never accepted is
invisible to that check yet gains Write the moment they accept, possibly
long after the maintainer believes access is closed. Always also check:
```bash
gh api repos/OsoThevenin/animals-vida-digna/invitations \
  --jq '.[] | "\(.invitee.login) — \(.permissions)"'
```
Expected: no output (no pending invitations). If any invitation appears,
revoke it:
```bash
gh api -X DELETE repos/OsoThevenin/animals-vida-digna/invitations/<invitation_id>
```
Also check for deploy keys, which are a separate access path entirely:
```bash
gh api repos/OsoThevenin/animals-vida-digna/keys --jq '.[].title'
```
Expected: no output (no deploy keys), unless the maintainer knowingly
provisioned one.

Then confirm the ruleset is unchanged and re-list everything:
```bash
gh api repos/OsoThevenin/animals-vida-digna/rulesets/22118349 --jq '.rules[].type'
gh api repos/OsoThevenin/animals-vida-digna/collaborators \
  --jq '.[] | "\(.login) — \(.permissions | to_entries | map(select(.value)) | map(.key) | join(","))"'
gh api repos/OsoThevenin/animals-vida-digna/invitations --jq '.[] | "\(.invitee.login) — \(.permissions)"'
gh api repos/OsoThevenin/animals-vida-digna/keys --jq '.[].title'
```
Expected ruleset output: `deletion`, `non_fast_forward`, `pull_request`
(unchanged). Expected final collaborator list: only the maintainer(s) who
review PRs, with `admin`/`maintain`/`push` permissions; no invitations; no
unexpected deploy keys.

**Already verified as of 2026-09-10** (this session, read-only, no removal
performed): collaborators = only `OsoThevenin` (`admin,maintain,pull,push,triage`),
invitations = none, deploy keys = none, ruleset unchanged. The *current
state* is correct. What is not established is *why* — whether a volunteer
was deliberately removed during this plan, or whether no volunteer was ever
added as a GitHub collaborator at all. Confirm which, since the migration's
own framing ("revoking volunteers' GitHub Write access") assumes the former.

**2. `wrangler secret list` — exactly 5 names, two must be absent**
```bash
cd apps/admin
npx wrangler secret list
```
Expected: exactly `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`,
`AUTH_EMAIL_FROM`, `ADMIN_ALLOWED_EMAILS`. `AUTH_INSECURE_COOKIES` and
`AUTH_DEV_LOG_OTP` must be **absent** — their presence in production would
disable cookie security or leak OTP codes to logs.

**3. Apply migrations to production D1**
```bash
cd apps/admin
npx wrangler d1 migrations apply avd-content --remote
```
Confirm `0001_auth.sql` (and any later migration) is listed as applied.
Verify first with `npx wrangler d1 migrations list avd-content --remote`.

**4. Create the second Workers Builds project**
In the Cloudflare dashboard: new Workers Builds project, root `apps/admin`,
build command `pnpm build`, deploy command `npx wrangler deploy`, watch paths
`apps/admin/**`, `packages/**`, `pnpm-lock.yaml`. Then run
`pnpm build && npx wrangler deploy` from `apps/admin` once, which creates the
`admin.animalsvidadigna.org` custom domain, DNS and TLS records.

**5. Lighthouse ×4 URLs ×4 categories**
```bash
npx lighthouse https://animalsvidadigna.org/ \
  --form-factor=mobile --screenEmulation.mobile \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output-path=./lh-home.json
jq '.categories[].score' ./lh-home.json
```
Repeat for `/cats`, `/cat/<any published slug>`, `/es/cats`, renaming
`--output-path` each time. Each of the 16 scores must be ≥ 0.95 (95%).

**6. Timed volunteer walkthrough**
1. Go to `https://admin.animalsvidadigna.org/login`, sign in with a test
   allowlisted email (start the timer).
2. Open an existing cat, change its `status`.
3. Upload a new photo to its gallery.
4. Save.
5. In a private/incognito window, open `https://animalsvidadigna.org/cats`
   (or the cat's own page) and confirm the status change and new photo are
   visible (stop the timer).
Record the elapsed seconds and confirm no pull request, no GitHub sign-in,
and no manual deploy step was needed.

**7. Orphan-sweep dry run**
```bash
cd packages/content
npx tsx scripts/sweep-orphan-images.ts --dry-run
```
(Confirm the exact flag name against the script's own `--help`/usage text
before running — it has never executed against real R2/D1 in this session.)
Inspect the printed candidate list by hand before ever passing `--delete`;
each candidate is an R2 key with no matching `cat_images` row.

**8. Cloudflare billing**
Open the Cloudflare dashboard → Billing and confirm no Images Paid or
Workers Paid line item exists.
