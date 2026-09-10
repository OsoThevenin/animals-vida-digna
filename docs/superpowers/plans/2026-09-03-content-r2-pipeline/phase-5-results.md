# Phase 5 results — admin cats CRUD and the image pipeline

Date: 2026-09-09
Executed with `superpowers:subagent-driven-development` — one implementer per
task, a spec+quality review after each, two scoped fix rounds where needed, and
an Opus whole-phase review at the end.
Status: **implemented and reviewed; ⚠ not deployed, not merged, not pushed.**

> **Read this before deploying.** The *Maintainer-only checklist* below is the
> part no agent could run: remote D1 and the live WAF matrix were unreachable
> from the sandbox, and no browser was ever available, so nothing in the admin
> UI has actually been clicked. See *What is genuinely unverified*.

## State of the branch

All 11 tasks are implemented on `worktree-content-r2-impl` as 23 commits
(`447086e..a45c1d0`), 52 files, +4986/−78.

- `pnpm turbo test build check lint --force` → **15/15 tasks green**
- admin **256** tests, web **276**, content **98**
- `pnpm --filter web test:e2e` → **62/62** in real Chromium
- `wrangler deploy --dry-run` → **842.15 KiB gzip**, 28% of the 3 MB Workers
  Free limit
- No Cloudflare Images binding, no Workers Paid, no new runtime dependency

## Three defects the process caught that unit tests could not

1. **R2 rejected every upload.** `uploadImageToBucket` passed `file.stream()` to
   `bucket.put`, which throws *"Provided readable stream must have a known
   length"* against real R2/Miniflare. Task 5's test mocked `put` and accepted
   any body, so it could not fail. Found by Task 6's live verification, fixed in
   `f059f55`, and the test strengthened to pin the body by reference identity.
2. **A non-allowlisted image width.** The admin cats list rendered cover
   thumbnails at `width=128`, which is not one of the four WAF-allowlisted
   canonical widths — every thumbnail would have returned 403 in production.
   Found by Task 11, fixed in `99da7b9`, and the contract pinned by 11 new tests
   that reject six deviation patterns.
3. **Session revocation silently bricked the UI.** The middleware answered an
   expired or revoked session on `/_actions/*` with a 302; Astro's client helper
   follows redirects, sees the login page's 200, tries to parse it as an action
   result and throws — uncaught at every call site. A volunteer removed from the
   allowlist would fill in the cat form, press *Desa*, and watch the button hang
   on "Desant…" forever with the edit lost on reload. The exact path the
   middleware exists to serve produced a dead UI. Found by the whole-phase
   review, fixed in `5b1247f` by returning a 401 with an `AstroActionError` JSON
   body.

## Security posture

Verified across the finished surface, not per handler:

- All 8 Astro Actions call `requireUser` as their first statement — none is
  reachable by direct POST without a session.
- The allowlist is re-checked on every request (Phase 4's bypass fix), so
  removing an address revokes access immediately.
- **Cross-cat access is by design and is not a finding** — every allow-listed
  volunteer is a full editor of every cat; there is no owner column to scope
  against. The allowlist is the real boundary.
- The dev-only R2 route is gated at build time on `import.meta.env.DEV`.
  Independently confirmed by reading the compiled artifact: the production
  handler compiles to an unconditional `404` with no bucket reference.
- Uploads force `Content-Type: image/webp` on put, so a lying client `file.type`
  is not a script vector. R2 keys are built only from `imageKey(catId, nanoid())`
  and never from a user-supplied filename.
- **No rate limit on actions** — better-auth's covers only `/api/auth/*`.
  Workers Free's 100k req/day is the only ceiling. Worth revisiting in Phase 6.

## Deferred findings (triaged by the whole-phase review)

Every one of these was reviewed and consciously deferred, not overlooked.

| Finding | Ruling | Cost of deferring |
|---|---|---|
| A failing compensating R2 delete masks the original D1 error | Defer | One orphan survives to Phase 6's sweep — what the sweep is for |
| `cats.delete` returns ok for an unknown id; `cats.update` returns NOT_FOUND | Defer | Cosmetic asymmetry; saves a D1 read |
| `updateCatImages`/`removeCatImage` issue one UPDATE per image | Defer | **Not a quota risk** — 10 writes/save is 0.5% of D1 Free's daily budget. Batch later for atomicity, not cost |
| `images.update` returns ok on a zero-row match; `setCover` surfaces a bare 500 | Defer | Both already compensated in the UI |
| Radix `Select` cannot carry field errors | Defer | Dead code today; a future contributor adding Select validation gets a silently non-associated error |
| `apps/admin` has **no lint script**; `apps/web`'s covers one file | Follow-up | ~4,000 new lines are outside `turbo lint`. The `.ts`/`.tsx` is clean; a script must exclude `.astro` (all 18 warnings are frontmatter false positives) |
| `image-manager.tsx` async wiring is inspection-only | Defer | **Largest residual risk.** Its three async fixes can regress with a green suite. Mitigation is the first-deploy click-through, not more code |

Recommended first item of Phase 6: add jsdom + Testing Library. It was
deliberately not added mid-phase (unbudgeted infrastructure the plan does not
authorise), but its absence is why the seam defects above were invisible to the
suite.

## Deferred Verification owed by this phase

The five checks Phase 5 formally owed, with honest labels.

| # | Item | Result |
|---|---|---|
| 1 | Full chain with a real photo | **Partially verified** — a real photo went through the real admin pipeline for all three seed cats; R2 object and D1 row confirmed byte-for-byte locally; the public page renders the correct canonical `src`/`srcset`. The final HTTP-200 hop against the real images host was unreachable |
| 2 | URLs survive the production WAF rule | **Partially verified, and converted into a durable contract** — 11 tests pin the canonical transform string and reject six deviations, cross-checked against the live rule recorded in `phase-0-results.md`. The live 200/403 matrix was unreachable |
| 3 | Seeded placeholder rows reconciled | **Verified locally** — reconciled through the real upload pipeline, not SQL patches. Note: the local seed emits *zero* `cat_images` rows (all fixtures have `coverImage.src: null`), so the deferred item's premise about local zero-dimension rows was wrong. The remote half remains open |
| 4 | Re-enable the `test.fixme` specs | **Verified** — only **one** existed, not two as the plan stated; re-enabled and passing under real Playwright |
| 5 | Remote D1 re-verified | **Not verifiable here** — the sandbox refuses every `--remote` call, including read-only SELECTs |

## What is genuinely unverified

State this plainly rather than assuming the green suite covers it:

- **Nothing in the admin UI has ever been clicked.** No browser binary was
  available. Island hydration, the `AlertDialog` focus trap, keyboard tab order,
  and the whole async wiring of `image-manager.tsx` are verified by code
  inspection and HTTP-layer calls only.
- **Remote D1** was never reachable.
- **The live WAF 200/403 matrix** was never exercised — including whether the
  bare, untransformed `/cats/…` path used by the public gallery's lightbox links
  (`CatGallery.astro`) is allowed. That path is not covered by the canonical
  transform allowlist and should be checked explicitly.

## Free-tier headroom

Only one limit has a realistic path to exhaustion: **Images Free's 5,000 unique
transformations/month**. Each (key × width) counts once per month, so roughly 4
uniques per live photo. 60 cats × 5 photos ≈ 1,200/month — comfortable, but it
tightens past ~1,200 live photos.

⚠ The admin's own thumbnails deliberately reuse canonical widths
(`cover-thumbnail.ts`, `image-manager.tsx`). **Do not "fix" these to
CSS-matched widths** — that would add a new unique transformation per admin
browse and burn the monthly budget. Bulk uploading itself costs zero
transformations.

## Maintainer-only checklist

Run from a machine with real Cloudflare API access. Each gives the exact
command, the expected output, and what a failure means.

**1. Remote D1 sanity (item 5)**
```bash
cd apps/admin
npx wrangler d1 execute avd-content --remote --command "select slug_ca, status from cats"
```
Expect exactly 3 rows, `slug_ca` in `{garfield, lluna, misi}`. A failure means
remote D1 was never seeded, was seeded with different data than this repo's
fixtures, or migrations are out of sync — check
`wrangler d1 migrations list avd-content --remote` before assuming data loss.

**2. Remote placeholder rows (item 3, remote half)**
```bash
npx wrangler d1 execute avd-content --remote --command "select ci.id, c.slug_ca, ci.r2_key, ci.width, ci.height from cat_images ci join cats c on c.id = ci.cat_id where ci.width = 0 or ci.height = 0"
```
Expect 0 rows. If rows come back, either backfill them by uploading a real photo
through the admin for that cat and deleting the zero-dimension row, or
`DELETE FROM cat_images WHERE width = 0 OR height = 0` if the photo is gone for
good and a draft with no cover beats a broken one.

**3. Live WAF matrix (item 2)**
```bash
KEY="cats/<a-real-cat-id>/<a-real-image-id>.webp"
for W in 320 640 960 1280; do
  echo -n "width=$W: "
  curl -s -o /dev/null -w "%{http_code}\n" \
    "https://images.animalsvidadigna.org/cdn-cgi/image/width=$W,fit=scale-down,quality=80,format=auto,onerror=redirect/$KEY"
done
echo -n "width=500 (non-canonical, expect 403): "
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://images.animalsvidadigna.org/cdn-cgi/image/width=500,fit=scale-down,quality=80,format=auto,onerror=redirect/$KEY"
```
Expect 200 for all four canonical widths and 403 for `width=500`. A failure
means the WAF allowlist has drifted from `DEFAULT_WIDTHS` in
`packages/content/src/image-url.ts` (fix one side to match the other), or the R2
custom domain / Transformations zone setting is missing.

**Also probe the bare path** the public lightbox uses — it is not covered by the
canonical allowlist and was never tested:
```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://images.animalsvidadigna.org/$KEY"
```

**4. Full chain final hop (item 1)**
Upload a real photo through `https://admin.animalsvidadigna.org`, then curl the
rendered `src` from the public cat page. Expect 200. Everything upstream of this
hop is already proven locally.

**5. The revocation check — the one failure that appears in no log**
Sign in, remove your own address from `ADMIN_ALLOWED_EMAILS`, redeploy, then
press *Desa*. You should get a Catalan error, not a hung button. This exercises
the fix in `5b1247f`.

**6. Production manual QA.** Run create → upload → reorder → set cover → delete
once on the real admin. Confirm photo URLs resolve through
`images.animalsvidadigna.org/cdn-cgi/image/…` and never `/r2/…` (that dev route
404s in production), and confirm the Cloudflare dashboard shows no new Workers
Paid or Images Paid subscription.

Also still outstanding from Phase 4, before any deploy: close **M2** (no
per-address OTP send throttle), decide **M3**/**M4**, and execute Phase 4's
Tasks 10–11 for real — the Resend delivery path has still never run inside a
Worker. See `phase-4-security-review.md`.
