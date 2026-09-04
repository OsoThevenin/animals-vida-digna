# Content, R2 images and admin app — Implementation Plan (general path)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execute **one phase document at a time, in order**; each phase ends in a mergeable PR.

**Goal:** Volunteers edit cats (data + photos) in a dedicated admin app and the change is live immediately, with no pull request; photos live in R2 and are resized for free; the code repository keeps its review rule.

**Architecture:** pnpm/Turborepo monorepo with `apps/web` (existing Astro site, now reading cats from D1 on demand), `apps/admin` (new Astro app with React islands, Astro Actions and better-auth email-code login, its own Worker at `admin.animalsvidadigna.org`), `packages/content` (Drizzle schema, migrations, repository, validation, image URL helpers) and `packages/design-system`. Images are resized in the browser, stored in R2 under `cats/<catId>/<imageId>.webp`, and served through Cloudflare URL transformations on `images.animalsvidadigna.org`.

**Tech Stack:** Astro 5.18 + `@astrojs/cloudflare` 12, React 19 (admin) / Preact (site), Astro Actions, better-auth 1.7 (`emailOTP`, drizzle adapter), Drizzle ORM + drizzle-kit, Cloudflare D1 / R2 / Workers / Images URL transformations, Resend, `browser-image-compression`, Turborepo, pnpm, Vitest, Biome.

**Spec:** `docs/superpowers/specs/2026-09-03-content-r2-pipeline-design.md` — read it first; the *Interface contract* section is binding for every phase.

**Research (facts with sources):** `research/cloudflare-platform-facts.md`, `research/astro-admin-capabilities.md`, `research/better-auth-on-workers.md`, `research/repo-map.md`.

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

## Phase path

| # | Phase document | Delivers | Depends on | Visible to visitors? | Size |
|---|---|---|---|---|---|
| 0 | `phase-0-platform-spike.md` | Go/no-go proof that `/cdn-cgi/image/` works over the R2 custom domain on the Free plan; D1 database, R2 custom domain and zone settings provisioned; limits confirmed | — | No | ½ day |
| 1 | `phase-1-monorepo.md` | Site moved to `apps/web`; `packages/content` skeleton; Turborepo + root tooling; Workers Builds root directory updated; all existing tests green; production deploy unchanged | 0 | No | 1 day |
| 2 | `phase-2-content-package.md` | Drizzle schema + first migration; repository functions with tests against local D1; zod validation; image-URL helpers; `seed-from-yaml` script; D1 seeded in production | 1 | No | 1 day |
| 3 | `phase-3-web-on-d1.md` | Public cat pages render from D1 on demand; featured-cats server island; `OptimizedImage` on R2 URLs; `sitemap-cats.xml` + robots; Keystatic `cats` collection removed; Lighthouse re-verified | 2 | **Yes** | 1 day |
| 4 | `phase-4-admin-shell-auth.md` | `apps/admin` Astro app with React + design-system tokens; better-auth email-code login with allowlist; middleware; Worker + `admin.` custom domain; second Workers Builds project | 2 (+ `design-system` branch merged) | No | 1–1½ days |
| 5 | `phase-5-admin-cats-images.md` | Cats list, create/edit form, publish toggle, delete; image uploader with browser-side resize → R2; gallery order, alt texts, cover; dev-only R2 preview route | 4 | No (admin only) | 1½–2 days |
| 6 | `phase-6-cutover-docs.md` | Volunteer guide; maintainer runbook; secrets rotated and documented; volunteers' GitHub Write access removed; `scripts/sync-images.ts` and YAML content deleted; `.planning` + requirements updated; observability check; orphan-R2 sweep script | 3, 5 | Docs only | ½ day |

Total ≈ 6–7 working days. Phases 1→2→3 and 4→5 are two chains; Phase 4 may start
once Phase 2 is merged, in parallel with Phase 3, if two people/agents work at once.

## Status as of 2026-09-04

Phases **0–4 are implemented** on branch `worktree-content-r2-impl` (worktree
`.claude/worktrees/content-r2-impl`). Nothing is pushed, merged or deployed.
Pipeline is green: `pnpm turbo test build check lint --force` → 15 tasks, 502+
tests; `pnpm --filter web test:e2e` → 60 passed / 2 skipped.

Two records to read before continuing:

- **`phase-0-results.md`** — the platform spike, GO verdict, and five findings
  (the `fit=scale-down` amendment, the Sources fix, the quota threat model, and
  the production WAF allowlist that makes the image-URL contract
  enforced-in-production).
- **`phase-4-security-review.md`** — ⚠ **read before deploying `apps/admin`.**
  Three blockers fixed; M2, M3, M4, H3 and L1–L5 deliberately left open for a
  future session. Includes the *Before any deploy* checklist and the maintainer
  actions (secrets, second Workers Builds project, `admin.` custom domain).

**Next up: Phase 5** (cats CRUD + image uploader), which also owes the
*Deferred verification owed by this phase* checks recorded in
`phase-5-admin-cats-images.md` — the end-to-end image-chain verification that
could not run while no real cat photo existed. Then Phase 6.

Also integrated along the way, outside the numbered phases: the `design-system`
branch (13 commits rebased in, its obsolete workspace-conversion commit
dropped), a **Playwright** E2E suite for `apps/web`, and a **shadcn/ui**
migration replacing `@avd/design-system` in `apps/admin` — which leaves that
package with no consumers (kept deliberately; see the spec amendment).

## Ordering rules

1. **Phase 0 gates everything.** If `/cdn-cgi/image/` on `images.animalsvidadigna.org` does not return transformed images on the Free plan, stop and switch the image contract to "browser generates the 4 widths and uploads all of them" before writing Phase 2/5 code (the spec documents this fallback in *Why URL transformations…*).
2. **Merge the `design-system` branch after Phase 1 and before Phase 4.** Phase 1 keeps `packages/design-system` as the package path so that branch rebases cleanly; its own "Task 1: Workspace conversion" becomes obsolete and is dropped during the rebase.
3. **Seed D1 (end of Phase 2) before deploying Phase 3.** Phase 3's PR must not merge until `wrangler d1 execute avd-content --remote --file seed.sql` has run.
4. ~~**Every phase = one PR** to `main`~~ — **superseded 2026-09-04.** The
   maintainer decided that nothing merges until the complete plan is closed:
   all phases accumulate as task-level commits on one branch
   (`worktree-content-r2-impl`) and ship as a single reviewed unit. Verification
   gaps that would have blocked an individual phase's merge are recorded in
   *Deferred verification owed by this phase* in `phase-5-admin-cats-images.md`
   and settled at Phase 5. Still commit after every task (each phase doc gives
   the message).
5. **Do not skip the failing-test step.** Tasks are written RED → GREEN → commit.

## Definition of done (whole plan)

- [ ] A volunteer with only an email address can sign in at `https://admin.animalsvidadigna.org`, change a cat's status, upload a photo, save, and see it on `https://animalsvidadigna.org/cats` within seconds, with no pull request created.
- [ ] `git ls-files apps/web/public/images` contains only `hero_image.webp` and `logo.webp`; every cat image URL on the site starts with `https://images.animalsvidadigna.org/cdn-cgi/image/`.
- [ ] Cloudflare billing shows no Images Paid or Workers Paid subscription.
- [ ] `pnpm turbo test` and `pnpm turbo build` are green at the repo root; `tests/wrangler-config.test.ts` (web) and the new admin/content tests pass.
- [ ] Lighthouse mobile ≥ 95 ×4 on `/`, `/cats`, `/cat/<slug>`, `/es/cats`.
- [ ] The GitHub ruleset is unchanged; no volunteer holds Write access to the repository.
- [ ] `docs/admin-guide.md` (volunteers) and `docs/admin-runbook.md` (maintainer) exist and match reality.

## Out of scope (follow-up plans)

- Moving settings, landing and static pages from Keystatic into the admin; removing Keystatic and React from `apps/web`.
- ~~Upstreaming admin form controls into `@avd/design-system`.~~
  **Resolved 2026-09-04:** `apps/admin` uses **shadcn/ui** instead
  (`apps/admin/src/components/ui/`, `components.json`). `@avd/design-system`
  now has no consumers — it is kept, not deleted, because its
  `tokens.test.ts` pins the palette to `apps/web/src/styles/global.css`;
  the maintainer decides its future in the Keystatic follow-up plan. See
  the amendment in the spec's *Interface contract*.
- Roles, audit history UI, image trash/undo.
- Cloudflare Access in front of `admin.` (optional hardening; see research).
