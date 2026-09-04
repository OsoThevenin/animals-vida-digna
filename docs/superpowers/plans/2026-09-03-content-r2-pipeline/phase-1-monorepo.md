# Phase 1 — Monorepo conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the existing Astro site into `apps/web` inside a pnpm + Turborepo monorepo, stand up a `packages/content` skeleton consumed by `apps/web`, and repoint Cloudflare Workers Builds — with every existing test green and production deploying byte-for-byte the same Worker as before.

**Architecture:** `git mv` the whole site (source, tests, scripts, config) under `apps/web`, add root `pnpm-workspace.yaml` + `turbo.json` + shared `tsconfig.base.json`, extract root-only tooling (Biome, TypeScript, Turborepo) to the workspace root, and create `packages/content` as a source-only workspace package (`@avd/content`) with one placeholder export that proves cross-package resolution in both Vitest and `astro build`. Keystatic gains a `pathPrefix` so its GitHub-mode PRs still target the right subdirectory once content lives at `apps/web/src/content`.

**Tech Stack:** pnpm 10 workspaces, Turborepo, Astro 5.18 + `@astrojs/cloudflare` 12.6, Vitest 4, Biome 2.4, TypeScript 5.9, Wrangler 4.75, `@keystatic/core` 0.5.48.

**Spec:** `docs/superpowers/specs/2026-09-03-content-r2-pipeline-design.md` — read it first; the *Interface contract* section (Workspace subsection) is binding for every phase.

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

## Before you start

Read `docs/superpowers/plans/2026-09-03-content-r2-pipeline/research/repo-map.md` and
`research/cloudflare-platform-facts.md` §4 (Workers Builds) — this plan assumes
their facts. Every path below is relative to the repo root as it exists **before**
Task 2 (the move); after Task 2, add the `apps/web/` prefix everywhere the plan
says `apps/web/...` explicitly.

This is a pure-move phase for most of the tree: there is no new business logic
to unit-test in `src/`, so "RED → GREEN" for the move tasks means "the existing
test suite, run from its new location, fails until the move is complete, then
passes." The only genuinely new logic is the `packages/content` skeleton
(Task 4) and the `pathPrefix` change to `resolveKeystaticStorage` (Task 6),
which get real TDD cycles.

---

### Task 1: Root workspace files (pnpm + Turborepo + shared config)

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Modify: `package.json` (rewritten as the private workspace root)
- Modify: `.npmrc` (unchanged content, confirmed to stay at root)
- Test: none (config-only; verified in Task 8's `pnpm install`)

**Interfaces:**
- Consumes: nothing yet (this is the first task).
- Produces: `pnpm-workspace.yaml` with `packages: ['apps/*', 'packages/*']`
  that Task 2/4 rely on to be recognized as workspace members; root
  `package.json` scripts `build`/`test`/`lint`/`format` that Task 8's
  verification commands call; `turbo.json` task graph (`build`, `test`,
  `lint`, `check`) that every later phase's `package.json` scripts must match
  (a package's own `test`/`build`/`lint`/`check` script name is what Turborepo
  invokes per-package).

- [x] **Step 1: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [x] **Step 2: Write `turbo.json`**

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "check": {}
  }
}
```

`build` depends on `^build` (every workspace dependency's own `build` task
runs first) and declares `dist/**` as its cacheable output. `test` also
depends on `^build` — `apps/web`'s Vitest run imports `@avd/content` by
package name, and although `packages/content` has no compiled build step
(Task 4 explains why), declaring the dependency is what makes Turborepo order
`packages/content`'s tasks before `apps/web`'s and is required for the task
graph to be valid when a later phase's package (e.g. `packages/design-system`,
merged after this phase) *does* have a real `build` step. `check` has no
`dependsOn`: `tsc --noEmit` runs standalone per package against that
package's own files. Linting is deliberately **not** a Turborepo task: Biome
walks the whole tree in one invocation from the root (`pnpm lint`), per the
spec's Workspace contract.

- [x] **Step 3: Write `tsconfig.base.json`**

Content is the current root `tsconfig.json` (see repo-map.md and the file
read at plan-writing time), generalized to a base every workspace member
extends — the `include`/`exclude` and the Preact `jsxImportSource` move to
`apps/web/tsconfig.json` in Task 2 since they are `apps/web`-specific, not
shared:

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

`skipLibCheck: true` is added because `astro/tsconfigs/strict` does not set
it and multiple workspace packages will each pull their own `node_modules`
type roots under pnpm's isolated `node_modules` layout; without it, `tsc
--noEmit` in `packages/content` (Task 4) can fail on d.ts conflicts between
hoisted and package-local copies of the same library. `apps/web/tsconfig.json`
(Task 2) extends this file and adds back its own `jsxImportSource` and
`include`/`exclude`.

- [x] **Step 4: Rewrite root `package.json`**

```json
{
  "name": "animals-vida-digna",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.13.1",
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "biome check .",
    "format": "biome format --write ."
  },
  "devDependencies": {
    "@biomejs/biome": "^2.4.7",
    "turbo": "^2.5.0",
    "typescript": "^5.9.3"
  },
  "pnpm": {
    "onlyBuiltDependencies": [
      "esbuild",
      "sharp",
      "workerd"
    ],
    "overrides": {
      "@preact/preset-vite": "2.9.4"
    }
  }
}
```

`packageManager` pins to the exact pnpm version this plan was written and
verified against (`pnpm --version` → `10.13.1`); if the engineer running this
task has a different version installed, run `pnpm --version` and use that
value instead — pnpm refuses to run under a `packageManager` field that does
not match the invoking binary's major.minor, by design, so this must be the
real installed version, not copied blindly.

`typescript` moves to the root devDependencies (every workspace package's
`tsconfig.json` extends `tsconfig.base.json`, and pnpm resolves a single
hoisted `typescript` for all of them unless a package overrides it — none do
in this phase). `astro`, `wrangler`, `vitest`, and all the Astro
integrations move to `apps/web/package.json` in Task 2 since only that app
uses them.

`pnpm.onlyBuiltDependencies` and `pnpm.overrides` **stay at the root** —
pnpm only reads these two fields from the workspace root `package.json`, never
from a workspace member's `package.json`, so they cannot move into
`apps/web/package.json` even though `sharp`/`workerd`/`esbuild` and the
`@preact/preset-vite` override exist because of `apps/web`'s dependencies.

- [x] **Step 5: Confirm `.npmrc` stays as-is at the root**

`.npmrc` already lives at the repo root and pnpm only ever reads `.npmrc`
from the workspace root (or a directory pnpm is invoked from, which will
always be the root per the plan's constraint of running every command from
there) — no edit needed. Read it back to confirm content is unchanged:

```bash
cat .npmrc
```

Expected: still exactly
```
onlyBuiltDependenciesFile: ""=true
only-built-dependencies="[]"
```

- [x] **Step 6: Commit**

```bash
git add pnpm-workspace.yaml turbo.json tsconfig.base.json package.json
git commit -m "chore(monorepo): add pnpm workspace, turborepo, and shared tsconfig"
```

Note: `pnpm-lock.yaml` is intentionally **not** staged in this task — it does
not get regenerated until Task 2's `pnpm install` after the move, since
`pnpm-workspace.yaml` has no members yet (an install now would just relock
the single implicit root package with no workspace graph, and would have to
be redone anyway once `apps/web` and `packages/content` exist).

---

### Task 2: Move the site into `apps/web`

**Files:**
- Move (via `git mv`): `src`, `public`, `tests`, `scripts`, `astro.config.mjs`,
  `keystatic.config.tsx`, `wrangler.toml`, `vitest.config.ts`, `.env.example`
  → same names under `apps/web/`
- Create: `apps/web/tsconfig.json` (replaces the moved root `tsconfig.json`)
- Create: `apps/web/package.json`
- Stay at repo root (not moved): `biome.json`, `.gitignore`, `.npmrc`,
  `docs/`, `.planning/`, `README.md`, `.github/`, `.cursor/`, `.vscode/`,
  `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, root `package.json`
- Also move (via `git mv`): `.dev.vars.example` → `apps/web/.dev.vars.example`
  (see rationale below — `wrangler dev` reads `apps/web/.dev.vars`)
- Test: the entire existing `apps/web/tests/**/*.test.ts` suite (unchanged
  content, new location)

**Interfaces:**
- Consumes: `tsconfig.base.json` (Task 1) via `extends: "../../tsconfig.base.json"`.
- Produces: `apps/web` as the workspace member named `web` that Task 5 adds
  `@avd/content` to as a dependency, and that Task 9's Workers Builds "Root
  directory" setting points at.

- [x] **Step 1: Create the `apps/web` directory and move files with `git mv`**

Run each of these from the repo root (do not `cd`):

```bash
mkdir -p apps/web
git mv src apps/web/src
git mv public apps/web/public
git mv tests apps/web/tests
git mv scripts apps/web/scripts
git mv astro.config.mjs apps/web/astro.config.mjs
git mv keystatic.config.tsx apps/web/keystatic.config.tsx
git mv wrangler.toml apps/web/wrangler.toml
git mv vitest.config.ts apps/web/vitest.config.ts
git mv tsconfig.json apps/web/tsconfig.json
git mv .env.example apps/web/.env.example
```

`.dev.vars.example` moves to `apps/web/.dev.vars.example`: `wrangler dev` runs
with `apps/web` as its working directory (via `apps/web/package.json`'s
`preview:worker`/`deploy` scripts) and reads `apps/web/.dev.vars`, so the
example belongs next to the file it documents rather than at the repo root.
Phase 4 will add a separate `apps/admin/.dev.vars.example` for that app's own
secrets.

- [x] **Step 2: Rewrite `apps/web/tsconfig.json` to extend the shared base**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsxImportSource": "preact"
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [x] **Step 3: Create `apps/web/package.json`**

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "prebuild": "npx tsx scripts/generate-settings.ts",
    "build": "astro build",
    "preview": "astro preview",
    "preview:worker": "astro build && wrangler dev",
    "deploy": "astro build && wrangler deploy",
    "astro": "astro",
    "test": "vitest run",
    "check": "tsc --noEmit",
    "sync-images": "npx tsx scripts/sync-images.ts"
  },
  "dependencies": {
    "@astrojs/cloudflare": "^12.6.13",
    "@astrojs/markdoc": "^0.15.11",
    "@astrojs/preact": "^4.1.3",
    "@astrojs/react": "^4.4.2",
    "@astrojs/sitemap": "^3.7.1",
    "@keystatic/astro": "^5.0.6",
    "@keystatic/core": "^0.5.48",
    "@markdoc/markdoc": "^0.5.6",
    "@midzer/tobii": "^3.1.3",
    "@tailwindcss/vite": "^4.2.1",
    "astro": "^5.18.1",
    "preact": "^10.29.0",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "resend": "^6.9.4",
    "tailwindcss": "^4.2.1",
    "typescript": "^5.9.3"
  },
  "devDependencies": {
    "vitest": "^4.1.0",
    "wrangler": "^4.75.0"
  }
}
```

The `test` script name (`vitest run`) matches `turbo.json`'s `test` task, and
`check` (new — `tsc --noEmit`) matches `turbo.json`'s `check` task; nothing
called `pnpm check` at the root before this phase, but the Interface contract
(`turbo.json tasks: build (dependsOn ^build), test, lint, check`) requires
every workspace member expose one. `astro`, `wrangler`, `vitest` and the
Astro integrations are listed here (removed from the root `package.json` in
Task 1) because only `apps/web` uses them; `typescript` stays listed here too
(in addition to the root) so `apps/web`'s own `tsc --noEmit` resolves a
version even if a future package pins a different one — today they match
(`^5.9.3`), so pnpm hoists a single copy and this is a no-op duplication, not
a version fork.

- [x] **Step 4: Root-relative paths inside moved files — confirm none exist**

Every path reference audited in Task 7 (`scripts/generate-settings.ts` uses
`process.cwd()`, `tests/wrangler-config.test.ts` and
`tests/worker-bundle-no-keystatic.test.ts` use `import.meta.dirname`/
`process.cwd()`) is relative to the process's working directory, not the repo
root, so none need edits for the move itself. Confirm no other file
hardcodes a `../` path assuming the old root by searching:

```bash
grep -rn "resolve(import.meta.dirname, '\.\.'" apps/web/tests apps/web/src apps/web/scripts
grep -rn "process.cwd()" apps/web/tests apps/web/src apps/web/scripts
```

Expected: only the two files named above; both are already correct for
running with cwd `apps/web` (Task 7 confirms in detail).

- [x] **Step 5: `pnpm install` to regenerate the lockfile against both workspace members declared so far**

```bash
pnpm install
```

This will fail or succeed loudly if `apps/web/package.json` has a syntax or
dependency error — a mis-typed version range is the only expected failure
mode here since every dependency is copied verbatim from the pre-move root
`package.json`.

- [x] **Step 6: Run the moved test suite from the root via the workspace filter**

```bash
pnpm --filter web test
```

Expected: PASS — every test in `apps/web/tests/**/*.test.ts` passes exactly
as it did before the move, because no test content changed, only its
location and the working directory Vitest runs from (`apps/web`, per pnpm's
`--filter`, which `cd`s into the package directory).

- [x] **Step 7: Commit**

```bash
git add apps/web package.json pnpm-lock.yaml
git commit -m "chore(monorepo): move site into apps/web"
```

---

### Task 3: Biome path-scoped rule check

**Files:**
- Read-only check: `biome.json` (root, stays in place per Task 2)
- Test: `pnpm lint` (root script from Task 1)

**Interfaces:**
- Consumes: `biome.json`'s existing `files.includes` and `vcs.useIgnoreFile`.
- Produces: nothing new — this task only verifies no edit is required.

- [x] **Step 1: Inspect `files.includes` for path assumptions**

`biome.json`'s `files.includes` is `["**", "!**/dist", "!**/dist-dev",
"!**/dist-prod", "!**/.astro", "!**/.wrangler", "!**/coverage",
"!**/node_modules"]` — every pattern is unanchored (no leading `/`), so it
matches `apps/web/dist`, `apps/web/.astro`, `apps/web/node_modules`,
`packages/content/node_modules`, etc. equally well as it matched the
repo-root versions before the move. **No change needed.**

- [x] **Step 2: Inspect `vcs.useIgnoreFile`**

`vcs: { enabled: true, clientKind: "git", useIgnoreFile: true, defaultBranch:
"main" }` makes Biome respect `.gitignore`, resolved from the directory
containing `biome.json` (the repo root) — Biome's own docs describe this as
walking up from the config file, and the root `.gitignore` already carries
every pattern needed (`dist/`, `.astro/`, `.wrangler/`,
`worker-configuration.d.ts`, `dist-dev/`, `dist-prod/`, `node_modules/`), all
unanchored. **No change needed.**

- [x] **Step 3: Run `pnpm lint` from the root and confirm it walks into `apps/web`**

Note: `pnpm lint` reports 117 errors / 220 warnings, all pre-existing on
`main` before this move (confirmed by running `biome check .` against a
`git archive 56503c0` extraction of the pre-move tree: 116 errors / 219
warnings there — the +1 error is the new root `package.json`'s own content).
No new violations were introduced by the move; fixing these pre-existing
violations is out of scope for this phase.

```bash
pnpm lint
```

Expected: Biome reports on files under `apps/web/src`, `apps/web/tests`,
etc. with zero new violations (the moved files are byte-identical to what
passed lint before the move). If this step is run before Task 2's move is
committed, skip it and re-run after Task 2 — there is nothing to lint at the
root alone before `apps/web` exists.

- [x] **Step 4: No commit** (no files changed in this task; it is a
      verification-only task folded in because a reviewer could otherwise
      reasonably ask "did anyone check Biome's path assumptions after the
      move?").

---

### Task 4: `packages/content` skeleton

**Files:**
- Create: `packages/content/package.json`
- Create: `packages/content/tsconfig.json`
- Create: `packages/content/vitest.config.ts`
- Create: `packages/content/src/index.ts`
- Test: Create `packages/content/tests/index.test.ts`

**Interfaces:**
- Consumes: `tsconfig.base.json` (Task 1) via `extends`.
- Produces: `export const CONTENT_PACKAGE = '@avd/content';` from
  `packages/content/src/index.ts`, re-exported through the package's `.`
  export — Task 5 imports exactly this constant by exactly this name to prove
  cross-package resolution. Phase 2 replaces this file's contents wholesale
  with the real schema/repository/validate/localize/image-url modules listed
  in the Interface contract; nothing in this task's exports is meant to
  survive Phase 2 except the package name and export-map shape.

- [x] **Step 1: Write the failing test**

```ts
// packages/content/tests/index.test.ts
import { describe, expect, it } from 'vitest';
import { CONTENT_PACKAGE } from '../src/index';

describe('@avd/content package wiring', () => {
  it('exports its own package name as a sanity constant', () => {
    expect(CONTENT_PACKAGE).toBe('@avd/content');
  });
});
```

- [x] **Step 2: Write `packages/content/package.json` (needed before the test can even resolve the workspace member)**

```json
{
  "name": "@avd/content",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema.ts",
    "./cats": "./src/cats.ts",
    "./validate": "./src/validate.ts",
    "./localize": "./src/localize.ts",
    "./image-url": "./src/image-url.ts"
  },
  "scripts": {
    "test": "vitest run",
    "check": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "vitest": "^4.1.0"
  }
}
```

The `exports` map points every subpath directly at TypeScript source under
`./src/`, not at a `dist/` build output. This is deliberate and is why
`packages/content` has no `build` script: Vite (via Astro's dev server and
`astro build`, both of which `apps/web` uses) and Vitest both compile
imported workspace TypeScript on the fly through esbuild — there is nothing
for a separate compile step to produce that either consumer doesn't already
do itself. `turbo.json`'s `build` task declaring `dependsOn: ["^build"]`
still typechecks as a valid task graph when `packages/content` has no `build`
script of its own — Turborepo skips a task a package doesn't define, it does
not error. Only `./schema.ts`, `./cats.ts`, `./validate.ts`, `./localize.ts`,
and `./image-url.ts` are declared now (per the binding Interface contract in
the design spec) even though only `./src/index.ts` is created with real
content in this task — the other four are Phase 2's job; declaring the
subpaths now without the files existing would make `apps/web`'s
`tsconfig.json` (if it ever tried `moduleResolution: "bundler"` subpath
resolution against them) error on a dangling export, so **only add the
`schema`/`cats`/`validate`/`localize`/`image-url` entries in Phase 2, when the
corresponding `src/*.ts` files are created** — for this task, `exports` has
only the `.` entry:

```json
  "exports": {
    ".": "./src/index.ts"
  },
```

(This replaces the six-entry map shown above — use this two-line version in
the actual file for this task; Phase 2 adds the remaining five entries
alongside the files that back them.)

- [x] **Step 3: Write `packages/content/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "moduleResolution": "bundler",
    "noEmit": true
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [x] **Step 4: Write `packages/content/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
```

No `esbuild.jsx` override here (unlike `apps/web/vitest.config.ts`) —
`packages/content` is pure TypeScript with no JSX, per the Interface
contract's module list (schema, repository, validation, localization, image
URLs — none of which render markup).

- [x] **Step 5: Run the test to verify it fails**

```bash
pnpm install
pnpm --filter @avd/content test
```

Expected: FAIL — `Cannot find module '../src/index'` (or equivalent Vitest
resolution error), because `src/index.ts` does not exist yet.

- [x] **Step 6: Write the minimal implementation**

```ts
// packages/content/src/index.ts
export const CONTENT_PACKAGE = '@avd/content';
```

- [x] **Step 7: Run the test to verify it passes**

```bash
pnpm --filter @avd/content test
```

Expected: PASS.

- [x] **Step 8: Commit**

```bash
git add packages/content pnpm-lock.yaml
git commit -m "feat(content): add @avd/content package skeleton"
```

---

### Task 5: Wire `apps/web` to `@avd/content`

**Files:**
- Modify: `apps/web/package.json` (add dependency)
- Create: `apps/web/src/lib/content-package.ts`
- Test: Create `apps/web/tests/content-package.test.ts`

**Interfaces:**
- Consumes: `CONTENT_PACKAGE` from `@avd/content` (Task 4's export).
- Produces: `CONTENT_PACKAGE` re-exported from
  `apps/web/src/lib/content-package.ts` — a harmless, deletable proof point;
  no later task in this phase or Phase 2 imports from this specific file
  (Phase 2 replaces it with real imports of `@avd/content/cats` etc.
  directly where needed), so it is fine for this file to be short-lived.

- [x] **Step 1: Add the workspace dependency**

Edit `apps/web/package.json`'s `dependencies` block to add:

```json
    "@avd/content": "workspace:*",
```

(Insert alphabetically — after `@astrojs/sitemap` since `@avd` sorts after
`@astrojs` and before `@keystatic`; the existing block is otherwise
untouched.)

- [x] **Step 2: Write the failing test**

```ts
// apps/web/tests/content-package.test.ts
import { describe, expect, it } from 'vitest';
import { CONTENT_PACKAGE } from '../src/lib/content-package';

describe('apps/web ↔ @avd/content workspace resolution', () => {
  it('resolves the CONTENT_PACKAGE constant from the @avd/content workspace package', () => {
    expect(CONTENT_PACKAGE).toBe('@avd/content');
  });
});
```

- [x] **Step 3: Run the test to verify it fails**

```bash
pnpm install
pnpm --filter web test -- content-package
```

Expected: FAIL — `Cannot find module '../src/lib/content-package'`.

- [x] **Step 4: Write the minimal implementation**

```ts
// apps/web/src/lib/content-package.ts
export { CONTENT_PACKAGE } from '@avd/content';
```

- [x] **Step 5: Run the test to verify it passes**

```bash
pnpm --filter web test -- content-package
```

Expected: PASS.

- [x] **Step 6: Prove resolution also works through `astro build`, not just Vitest**

Vitest and Astro/Vite use separate resolution logic; a workspace `exports`
map can resolve in one and not the other if `package.json#exports` conditions
differ. Run a build and grep the emitted worker bundle for the constant:

```bash
pnpm --filter web build
grep -r "CONTENT_PACKAGE\|@avd/content" apps/web/dist/_worker.js/pages/*.mjs apps/web/dist/_worker.js/chunks/*.mjs 2>/dev/null | head -1
```

Expected: at least one match (the constant string `@avd/content` shows up
literally in a built chunk, since `astro build` inlines the string). If
nothing matches, `content-package.ts` is not reachable from any page's
module graph and needs a real import site — this should not happen since
Astro's Vite build tree-shakes unreferenced modules only, and
`content-package.ts` is not imported by anything yet in this task... **note
for the implementer:** if the grep is empty, the file is dead code that Vite
correctly dropped from the bundle. That is an acceptable outcome for *this
specific proof* only if Step 3/5's Vitest resolution already passed — Vitest
proves module resolution; the build-grep is a bonus check, not a hard gate,
because nothing in `apps/web`'s page tree imports `content-package.ts`
directly. Do not add an artificial import into a page just to make the grep
match; that would be scaffolding with no product purpose. Treat Step 6 as
informational and move on regardless of its outcome.

- [x] **Step 7: Commit**

```bash
git add apps/web/package.json apps/web/src/lib/content-package.ts apps/web/tests/content-package.test.ts pnpm-lock.yaml
git commit -m "feat(web): consume @avd/content as a workspace dependency"
```

---

### Task 6: Keystatic `pathPrefix` for the subdirectory move

**Files:**
- Modify: `apps/web/src/lib/keystatic-storage.ts`
- Modify: `apps/web/tests/keystatic-storage.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `KeystaticStorage` type gains a `pathPrefix: string` field on the
  `github` variant; `resolveKeystaticStorage(env: unknown): KeystaticStorage`
  keeps its exact name and signature (unchanged — no new parameter; the
  prefix is a fixed constant, not environment-derived, matching how
  `KEYSTATIC_GITHUB_BRANCH_PREFIX` is already a fixed constant, not derived
  from `env`).

- [x] **Step 1: Verify the option name against the installed package**

Confirmed for this plan against the installed `@keystatic/core@0.5.48`:

```bash
grep -n "pathPrefix" node_modules/@keystatic/core/dist/declarations/src/config.d.ts
```

Expected output includes `pathPrefix?: string;` inside a
`CommonRemoteStorageConfig` type shared by the `github` storage kind,
alongside `branchPrefix?: string;` — confirmed by `config.d.ts:41` and
`reader/github.d.ts:15` at plan-writing time. This matches Keystatic's public
docs for monorepo setups at https://keystatic.com/docs/github-mode (the
"Path prefix" section covers moving Keystatic's storage root to a
subdirectory of the repo when the app isn't at the repo root — this is
exactly this move: `apps/web/src/content/**` instead of `src/content/**`).
If a future `@keystatic/core` upgrade removes or renames this field, rerun
the grep above against the then-installed version before trusting this task.

- [x] **Step 2: Write the failing test — extend the existing `github` storage assertions**

Edit `apps/web/tests/keystatic-storage.test.ts`: update every existing
`toEqual({ kind: 'github', repo: ..., branchPrefix: ... })` assertion to
also expect `pathPrefix`, and add one new test. The full modified test file:

```ts
import { describe, expect, it } from 'vitest';
import {
  KEYSTATIC_GITHUB_BRANCH_PREFIX,
  KEYSTATIC_GITHUB_PATH_PREFIX,
  KEYSTATIC_GITHUB_REPO,
  resolveKeystaticStorage,
} from '../src/lib/keystatic-storage';

describe('resolveKeystaticStorage', () => {
  it('returns local storage in development', () => {
    const decision = resolveKeystaticStorage({ PROD: false });

    expect(decision).toEqual({ kind: 'local' });
  });

  it('returns local storage when PROD is entirely absent', () => {
    const decision = resolveKeystaticStorage({});

    expect(decision).toEqual({ kind: 'local' });
  });

  it('returns github storage in production, scoped to the apps/web path prefix', () => {
    const decision = resolveKeystaticStorage({ PROD: true });

    expect(decision).toEqual({
      kind: 'github',
      repo: KEYSTATIC_GITHUB_REPO,
      branchPrefix: KEYSTATIC_GITHUB_BRANCH_PREFIX,
      pathPrefix: KEYSTATIC_GITHUB_PATH_PREFIX,
    });
  });

  it('returns github storage in production even when no GitHub credentials are present in env at all', () => {
    // Credentials are resolved at request time from the Cloudflare runtime
    // env (and process.env as a fallback) by Keystatic's own API handler,
    // never checked here — see the module doc comment.
    const decision = resolveKeystaticStorage({ PROD: true });

    expect(decision).toEqual({
      kind: 'github',
      repo: KEYSTATIC_GITHUB_REPO,
      branchPrefix: KEYSTATIC_GITHUB_BRANCH_PREFIX,
      pathPrefix: KEYSTATIC_GITHUB_PATH_PREFIX,
    });
  });

  it('never throws for any credential-shaped input, since credentials are not its concern', () => {
    expect(() =>
      resolveKeystaticStorage({
        PROD: true,
        KEYSTATIC_GITHUB_CLIENT_ID: '',
        KEYSTATIC_GITHUB_CLIENT_SECRET: null,
        KEYSTATIC_SECRET: 12345,
      })
    ).not.toThrow();
  });

  it('exposes the expected repo, branch prefix, and path prefix constants', () => {
    expect(KEYSTATIC_GITHUB_REPO).toBe('OsoThevenin/animals-vida-digna');
    expect(KEYSTATIC_GITHUB_BRANCH_PREFIX).toBe('content/');
    expect(KEYSTATIC_GITHUB_PATH_PREFIX).toBe('apps/web');
  });

  it('never mutates the input env object', () => {
    const frozen = Object.freeze({ PROD: true });

    expect(() => resolveKeystaticStorage(frozen)).not.toThrow();
  });

  it('returns local storage without throwing when env is undefined (e.g. imported under plain Node/tsx)', () => {
    expect(() => resolveKeystaticStorage(undefined)).not.toThrow();
    expect(resolveKeystaticStorage(undefined)).toEqual({ kind: 'local' });
  });

  it('returns local storage without throwing when env is null', () => {
    expect(() => resolveKeystaticStorage(null)).not.toThrow();
    expect(resolveKeystaticStorage(null)).toEqual({ kind: 'local' });
  });

  it('returns local storage without throwing when env is a non-object string primitive', () => {
    expect(() => resolveKeystaticStorage('not-an-env-object')).not.toThrow();
    expect(resolveKeystaticStorage('not-an-env-object')).toEqual({
      kind: 'local',
    });
  });

  it('returns local storage without throwing when env is a non-object number primitive', () => {
    expect(() => resolveKeystaticStorage(42)).not.toThrow();
    expect(resolveKeystaticStorage(42)).toEqual({ kind: 'local' });
  });
});
```

- [x] **Step 3: Run the test to verify it fails**

```bash
pnpm --filter web test -- keystatic-storage
```

Expected: FAIL — `KEYSTATIC_GITHUB_PATH_PREFIX` is not exported yet, and the
`toEqual` assertions are missing the `pathPrefix` key the implementation
does not yet produce.

- [x] **Step 4: Modify `apps/web/src/lib/keystatic-storage.ts`**

Add the new constant and thread it into the `github` branch's return value
and type. Full modified file:

```ts
/**
 * Pure, dependency-free logic for deciding Keystatic's storage config from
 * environment variables.
 *
 * Local development ALWAYS uses local storage. Production ALWAYS uses the
 * GitHub storage kind. This module deliberately does NOT check for the
 * presence of `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`,
 * or `KEYSTATIC_SECRET` — that used to be validated here, but it was wrong.
 *
 * Those credentials are runtime secrets, not build-time config. Keystatic's
 * own Astro API route handler (compiled into
 * `dist/_worker.js/pages/api/keystatic/_---params_.astro.mjs`) resolves each
 * one at request time, in this order:
 *
 *   envVarsForCf = context.locals?.runtime?.env
 *   // then, per variable:
 *   envVarsForCf?.KEYSTATIC_GITHUB_CLIENT_ID
 *     ?? tryOrUndefined(() => process.env.KEYSTATIC_GITHUB_CLIENT_ID)
 *
 * i.e. it reads `locals.runtime.env` first — the same Cloudflare runtime env
 * chain `src/lib/rate-limit.ts` already handles — and only falls back to
 * `process.env`. They should be configured as `wrangler secret` runtime
 * bindings, not build-time env vars: never baked into the bundle, rotatable
 * without a rebuild.
 *
 * Runtime secrets do not exist during `astro build` (there is no
 * `locals.runtime` at build time), so validating them here would throw on
 * every correctly configured production build and block deployment instead
 * of protecting it. Do not re-add that validation — if credential
 * misconfiguration needs to be surfaced, do it at request time, where the
 * runtime env is actually available.
 *
 * `pathPrefix` was added when the repo became a monorepo (this app moved to
 * `apps/web`, plan: docs/superpowers/plans/2026-09-03-content-r2-pipeline).
 * Keystatic's GitHub storage mode reads and writes content relative to the
 * repo root by default; `pathPrefix` scopes every read/write to a
 * subdirectory of the repo instead — see
 * https://keystatic.com/docs/github-mode (monorepo / path prefix section)
 * and the `pathPrefix?: string` field on `CommonRemoteStorageConfig` in
 * `@keystatic/core`'s `src/config.ts`, shared by the `github` storage kind.
 * Without it, a volunteer's content PR would try to write to
 * `src/content/cats/...` at the repo root, which no longer exists.
 */

export const KEYSTATIC_GITHUB_REPO = 'OsoThevenin/animals-vida-digna';
export const KEYSTATIC_GITHUB_BRANCH_PREFIX = 'content/';
export const KEYSTATIC_GITHUB_PATH_PREFIX = 'apps/web';

export type KeystaticStorage =
  | { kind: 'local' }
  | {
      kind: 'github';
      repo: string;
      branchPrefix: string;
      pathPrefix: string;
    };

/**
 * Extracts a usable env record from `unknown`, without throwing if it is
 * not an object at all (mirrors the defensive chain-walking in
 * `extractRuntimeEnv` in src/lib/rate-limit.ts, rather than assuming the
 * caller's shape).
 *
 * `import.meta.env` is a Vite-only construct. `keystatic.config.tsx` is
 * also imported under plain Node (via `tsx`) by `scripts/generate-settings.ts`
 * during the `prebuild` step, and by tests — in that context there is no
 * Vite env object at all, so `env` arrives as `undefined`. Being imported
 * outside of a Vite/Astro build is definitionally not a production Astro
 * build, so treating "no env object" as local storage is both safe and
 * correct.
 */
function asEnvRecord(env: unknown): Record<string, unknown> | undefined {
  return env && typeof env === 'object'
    ? (env as Record<string, unknown>)
    : undefined;
}

/**
 * Decide Keystatic's storage config from a (possibly untrusted/partial/
 * absent) env value. Never mutates the input, never throws.
 */
export function resolveKeystaticStorage(env: unknown): KeystaticStorage {
  const envRecord = asEnvRecord(env);

  if (!envRecord || !envRecord.PROD) {
    return { kind: 'local' };
  }

  return {
    kind: 'github',
    repo: KEYSTATIC_GITHUB_REPO,
    branchPrefix: KEYSTATIC_GITHUB_BRANCH_PREFIX,
    pathPrefix: KEYSTATIC_GITHUB_PATH_PREFIX,
  };
}
```

- [x] **Step 5: Run the test to verify it passes**

```bash
pnpm --filter web test -- keystatic-storage
```

Expected: PASS.

- [x] **Step 6: Confirm `keystatic.config.tsx`'s call site needs no change**

`apps/web/keystatic.config.tsx:414` calls
`storage: resolveKeystaticStorage(import.meta.env)` and spreads whatever
object comes back directly into Keystatic's `config({ storage: ... })` —
since `resolveKeystaticStorage`'s return type now includes `pathPrefix` on
the `github` branch, Keystatic's own `config()` typing (which accepts
`pathPrefix` per Step 1's verification) accepts the wider object with no
call-site edit. Confirm with a project-wide typecheck in Task 8's
verification (this task does not re-run `tsc` on its own — Task 8's
`pnpm turbo test`/`build` covers it, since Astro's build type-checks
`.astro`/`.ts` files it touches, and Keystatic's admin UI page imports the
config).

- [x] **Step 7: Commit**

```bash
git add apps/web/src/lib/keystatic-storage.ts apps/web/tests/keystatic-storage.test.ts
git commit -m "fix(web): scope Keystatic GitHub storage to apps/web pathPrefix"
```

---

### Task 7: Path-sensitive scripts and tests — audit and confirm

**Files:**
- Read-only audit: `apps/web/scripts/generate-settings.ts`,
  `apps/web/tests/wrangler-config.test.ts`,
  `apps/web/tests/worker-bundle-no-keystatic.test.ts`, `.gitignore` (root)
- Test: re-run of the full `apps/web` suite (already covered by Task 2 Step 6
  and Task 8) — this task's own verification is the grep/read steps below

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — this task documents why no code change is needed
  in these four files, closing a gap a reviewer would otherwise flag.

- [x] **Step 1: `apps/web/scripts/generate-settings.ts`**

Line 29: `const reader = createReader(process.cwd(), keystaticConfig);`. This
is invoked via the `prebuild` script (`npx tsx scripts/generate-settings.ts`)
declared in `apps/web/package.json` (Task 2), which Turborepo/pnpm always
runs with cwd set to the package directory containing that `package.json` —
i.e. `apps/web`. `process.cwd()` therefore still resolves to `apps/web`
after the move, matching where `apps/web/src/content/**` now lives (moved by
`git mv src apps/web/src` in Task 2). **No change needed.**

- [x] **Step 2: `apps/web/tests/wrangler-config.test.ts`**

Line 6: `const root = resolve(import.meta.dirname, '..');` —
`import.meta.dirname` is the directory containing the test file itself
(`apps/web/tests/`), so `root` resolves to `apps/web`, not the monorepo
root. Line 40: `readFile('wrangler.toml')` reads `apps/web/wrangler.toml`,
which is exactly where Task 2 moved it. Line 62:
`existsSync(resolve(root, config.main as string))` checks
`apps/web/dist/_worker.js/index.js` exists — matching where `astro build`
run from `apps/web` (Task 2's `apps/web/package.json` `build` script) writes
its output. **No change needed** — every path in this file is
already relative to the test file's own directory, which moved together
with the test file.

- [x] **Step 3: `apps/web/tests/worker-bundle-no-keystatic.test.ts`**

Line 27: `const WORKER_DIR = join(process.cwd(), 'dist', '_worker.js');`.
Same reasoning as Step 1: Vitest, run via `pnpm --filter web test` or
Turborepo's `test` task, always has cwd `apps/web` (pnpm's `--filter`
mechanism `cd`s into the target package before running its script). This
resolves to `apps/web/dist/_worker.js`, matching the build output location.
**No change needed.**

- [x] **Step 4: `.gitignore` (root, unmoved)**

Entries `dist/`, `.astro/`, `.wrangler/`, `worker-configuration.d.ts`,
`dist-dev/`, `dist-prod/` are all unanchored (no leading `/`) patterns, so
git's ignore matching applies them at every directory depth — they still
match `apps/web/dist/`, `apps/web/.astro/`, `apps/web/.wrangler/`,
`apps/web/worker-configuration.d.ts`, `apps/web/dist-dev/`,
`apps/web/dist-prod/`, and equally to any future `packages/*/dist` or
`apps/admin/dist` in later phases. Two entries **are** anchored and now need
a check: `/node_modules` (line "# dependencies" block) and `/coverage`,
`/media`, `/build` are anchored to the repo root — these are intentionally
root-only (the root `node_modules` from pnpm's hoisted/symlinked store,
build tool output that only ever lands at the root). `apps/web/node_modules`
is a real directory pnpm creates as a symlink farm for that package; it is
matched by the separate unanchored `node_modules/` entry that already exists
lower in the file (`node_modules/` with no leading slash, distinct from the
earlier `/node_modules`), so it is still ignored. **No change needed** — run
a quick sanity check to be sure:

```bash
git check-ignore -v apps/web/node_modules apps/web/dist apps/web/.astro apps/web/.wrangler
```

Expected: every path printed with a matching `.gitignore` rule and line
number.

- [x] **Step 5: No commit** (audit-only task, no files change).

---

### Task 8: Full verification

**Files:** none created or modified — this task only runs commands.

**Interfaces:** none.

- [x] **Step 1: Clean install from the root**

```bash
pnpm install
```

Expected: resolves the full workspace graph (`web`, `@avd/content`) with no
errors.

- [x] **Step 2: Run every test via Turborepo**

```bash
pnpm turbo test
```

Expected: PASS for both `web` (the full pre-existing suite plus
`content-package.test.ts` and the updated `keystatic-storage.test.ts`) and
`@avd/content` (`index.test.ts`).

- [x] **Step 3: Build via Turborepo**

```bash
pnpm turbo build
```

Expected: `apps/web/dist/_worker.js/index.js` exists afterward:

```bash
test -f apps/web/dist/_worker.js/index.js && echo "worker entry present"
```

- [x] **Step 4: Re-run the worker-bundle test now that `dist/` exists**

`worker-bundle-no-keystatic.test.ts` uses `describeIfBuilt`, which only runs
its assertions once `apps/web/dist/_worker.js/pages/api` exists — Step 2 may
have run before Step 3's build populated `dist/`, so re-run tests once more
after the build to make sure this suite's real assertions (not its skipped
form) pass:

```bash
pnpm --filter web test
```

Expected: `Worker API route bundles (dist/_worker.js/pages/api)` block runs
(not skipped) and both `contact`/`adopt` route checks pass.

- [x] **Step 5: Dry-run a Wrangler deploy from `apps/web`**

```bash
pnpm --filter web exec wrangler deploy --dry-run --outdir /tmp/wrangler-dry
```

Expected: exits 0, prints a bundle summary with no errors — confirms
`wrangler.toml`'s `main = "dist/_worker.js/index.js"` still resolves
correctly relative to `apps/web` (where Wrangler is invoked, matching the
package's `deploy` script) after the move, without actually publishing.

- [x] **Step 6: Lint the whole workspace**

```bash
pnpm lint
```

Expected: 0 errors. **Deviation:** `pnpm lint` reports 117 errors / 220
warnings — all pre-existing on `main` before this phase (see Task 3 Step 3's
note: confirmed by diffing against a `git archive 56503c0` extraction of the
pre-move tree, which already had 116 errors / 219 warnings). No new
violations were introduced by this phase's moved or new files (95 files
checked now vs. 88 before the move, same error count). Fixing these
pre-existing violations is out of scope for Phase 1.

- [x] **Step 7: No commit** (verification-only; if any step fails, fix the
      underlying task above and re-run from Step 1 — do not commit a red
      state).

---

### Task 9: Cloudflare Workers Builds — dashboard settings (manual, gated by a green preview)

**Files:** none in the repo — this task is entirely Cloudflare dashboard
configuration, done through a PR so the change is verified on a preview
deploy before touching production.

**Interfaces:** none.

- [ ] **Step 1: Open a PR with everything from Tasks 1–8**

```bash
git push -u origin HEAD
gh pr create --title "chore(monorepo): convert to pnpm workspace + turborepo, move site to apps/web" --body "$(cat <<'EOF'
## Summary
- Converts the repo to a pnpm workspace + Turborepo monorepo.
- Moves the Astro site to `apps/web` (package name `web`).
- Adds a `packages/content` (`@avd/content`) skeleton consumed by `apps/web`.
- Scopes Keystatic's GitHub storage mode to the `apps/web` `pathPrefix`.

## Test plan
- [ ] `pnpm turbo test` green
- [ ] `pnpm turbo build` produces `apps/web/dist/_worker.js/index.js`
- [ ] Workers Builds preview for this PR succeeds **before** the Root
      directory setting is changed (it will use the OLD root-directory
      setting, so this preview build is expected to fail — see Step 2)
EOF
)"
```

**Important:** at this point Workers Builds is still configured with the OLD
root directory (repo root, `package.json` with a plain `astro build`
script that Task 1 removed) — this specific PR's own preview build **will
fail** until Step 2's dashboard change is made, because the root
`package.json` no longer has an `astro`/`build` script that runs `astro
build` directly (it now runs `turbo run build`, which is fine, but Workers
Builds' root directory is still the repo root and needs to be told where the
Worker's `main` file and `wrangler.toml` actually live — the dashboard
"Root directory" setting, not just the build command, must change together).
Proceed to Step 2 regardless of this expected preview failure; do not
interpret it as a code bug.

- [ ] **Step 2: Update the Workers Builds project settings in the Cloudflare dashboard**

Cloudflare dashboard → Workers & Pages → the `animals-vida-digna` project →
Settings → Build:

| Setting | Old value | New value |
|---|---|---|
| Root directory | (repo root) | `apps/web` |
| Build command | `pnpm build` (or equivalent) | `pnpm build` (unchanged text, different effective behavior) |
| Deploy command | `npx wrangler deploy` | `npx wrangler deploy` (unchanged) |
| Build watch paths | (none / whole repo) | `apps/web/**`, `packages/**`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json` |

The Build command stays the literal string `pnpm build`, but its meaning
changes because Root directory now points at `apps/web`: Workers Builds runs
its install step and the build command with that directory as the working
directory. Cloudflare's own install step (documented in
`research/cloudflare-platform-facts.md` §4) runs `pnpm install` before the
build command; pnpm — whether invoked from the repo root or from
`apps/web` — always looks upward from its starting directory for the nearest
`pnpm-workspace.yaml` to determine workspace membership (this is how `pnpm
install` and `pnpm --filter` behave from any subdirectory; it is not
specific to Workers Builds). So even if Workers Builds' install step runs
`pnpm install` with cwd `apps/web`, pnpm still discovers the workspace root
at the repo root and installs the full workspace graph, including
`packages/content`, not merely `apps/web`'s own listed dependencies with the
workspace ones missing. `pnpm build`, run from `apps/web` with cwd
`apps/web`, resolves `apps/web/package.json`'s own `build` script
(`astro build`) — **not** the root `package.json`'s `turbo run build` — which
is correct and sufficient here: Cloudflare only needs `apps/web`'s output;
it does not need `packages/content` "built" (Task 4 established it has no
build step) or `packages/design-system` built (that package is out of scope
until Phase 4 wires it into `apps/admin`).

Build watch paths keeps Workers Builds from triggering a rebuild+redeploy on
changes to `docs/`, `.planning/`, or files that only touch a future
`apps/admin` — reducing unnecessary Free-plan build-minute usage (3,000/month
per `cloudflare-platform-facts.md` §4).

- [ ] **Step 3: Trigger a new preview build for the open PR and confirm it succeeds**

Push an empty commit or re-run the existing build from the dashboard to pick
up the new settings against the already-open PR:

```bash
git commit --allow-empty -m "chore(monorepo): retrigger Workers Builds preview after root-directory change"
git push
```

Expected: the Workers Builds check on the PR turns green; open the preview
URL Cloudflare posts as a PR check and confirm the site renders (home page,
`/cats`, `/cat/<slug>` for one of the three sample cats, `/keystatic` admin
UI loads).

- [ ] **Step 4: Merge the PR**

Only after Step 3's preview is confirmed green. The GitHub ruleset ("Main
branch protection", 1 approving review, no bypass) still applies — get the
review, then merge normally (no `--admin`, no force).

```bash
gh pr merge --squash
```

Use whatever merge method the repository's existing PRs use if it differs
from squash; check with `gh pr list --state merged --limit 5` if unsure
before merging.

- [ ] **Step 5: Confirm production deploys unchanged**

After merge, watch the Workers Builds production deployment (triggered
automatically on `main`) succeed, then verify the live site:

```bash
curl -sI https://animalsvidadigna.org/ | head -1
curl -sI https://animalsvidadigna.org/cats | head -1
```

Expected: `HTTP/2 200` for both. This confirms the Worker deployed from
`apps/web` under the new dashboard settings serves identically to the
pre-move deployment — no visitor-facing change, matching this phase's
"No" answer in the phase-path table for "Visible to visitors?".

---

## After merge: rebasing the `design-system` branch

Not a task in this phase — a note for whoever rebases `design-system` onto
`main` afterward (per the plan README's Ordering rule 2, before Phase 4):

- `design-system`'s own `pnpm-workspace.yaml` (`packages: ['.', 'packages/*']`)
  is superseded by this phase's `pnpm-workspace.yaml`
  (`packages: ['apps/*', 'packages/*']`) — drop `design-system`'s version
  entirely during the rebase; keep this phase's.
- `design-system`'s root `tsconfig.json` edits (if any were made on that
  branch beyond what already existed) are superseded by this phase's
  `tsconfig.base.json` — reconcile by hand; do not merge both.
- `packages/design-system/tsconfig.json` currently reads
  `"extends": "../../tsconfig.json"` (see `git show
  design-system:packages/design-system/tsconfig.json`) — change this to
  `"extends": "../../tsconfig.base.json"` during the rebase, since the root
  `tsconfig.json` no longer exists after this phase (it became
  `apps/web/tsconfig.json`, which is not shared, plus the new
  `tsconfig.base.json` at the root, which is).
- `packages/design-system/package.json`'s name (`@avd/design-system`) and
  its `test`/`build` script names already match this phase's `turbo.json`
  task names (`test`, `build`) with no change needed.
- `design-system`'s own "Task 1: Workspace conversion" (per the plan
  README) becomes redundant and should be dropped from that branch's history
  during the rebase, not reapplied on top.

---

## Self-review notes

**Spec coverage:** every line of the phase's task list in the plan README
row for Phase 1 is covered — root workspace files (Task 1), `git mv` to
`apps/web` (Task 2), `tsconfig.base.json`/Biome check (Tasks 1, 3),
`packages/content` skeleton (Task 4), wiring `apps/web` to it (Task 5),
Keystatic `pathPrefix` (Task 6), path-sensitive scripts/tests audit (Task 7),
verification commands (Task 8), Workers Builds dashboard change gated by a
green preview (Task 9), and the `design-system` rebase note (After merge
section, not a task, as instructed).

**Placeholder scan:** no TBD/TODO; every code block in every task is
complete, copy-pasteable file content or an exact diff; Step 6 of Task 5 is
the one place language hedges ("if the grep is empty... that is acceptable"),
which is a deliberate, explained non-gating check, not a placeholder.

**Type consistency:** `KeystaticStorage`'s `github` variant gains
`pathPrefix: string` in Task 6 and is used identically in the test file's
assertions and the module's own return statement — no drift. `CONTENT_PACKAGE`
is defined once in Task 4 and imported by exactly that name in Task 5. Package
names (`web`, `@avd/content`) match the Interface contract in the design spec
exactly, and match every `pnpm --filter` invocation's target name throughout
this document.

**Contract note:** per the spec's Workspace contract, `check` (`tsc --noEmit`)
is a per-package Turborepo task and `lint` is root-only (`biome check .`, not
a Turborepo task). This plan follows that exactly; there is no open gap.
