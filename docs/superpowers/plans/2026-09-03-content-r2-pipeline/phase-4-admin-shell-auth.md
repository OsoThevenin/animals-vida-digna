# Phase 4 — Admin app shell and authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up `apps/admin`, a new Astro 5 + React Worker deployed at
`https://admin.animalsvidadigna.org`, where an allowlisted volunteer signs in
with a 6-digit email code and every non-public route requires a valid
session; `/cats` shows a read-only list read from `@avd/content`.

**Architecture:** A second Astro app (React islands, Tailwind 4 with
**shadcn/ui** components on the site's palette — see *Amendment 2026-09-04*
below; originally `@avd/design-system` tokens) deployed as its own
Cloudflare Worker, sharing
the `avd-content` D1 database with `apps/web` (read/write here) and binding
the images R2 bucket (unused until Phase 5). Auth is better-auth's
`emailOTP` plugin over a Drizzle adapter, built per-request from
`context.locals.runtime.env` (Cloudflare adapter v12 has no module-scope
bindings); auth tables live in the same `packages/content` schema/migrations
as the cat tables. Astro middleware resolves the session on every request
and redirects unauthenticated requests to `/login`, except an explicit
public-path allowlist.

**Tech Stack:** Astro 5.18, `@astrojs/cloudflare` 12.6, `@astrojs/react` 4.4,
React 19, Tailwind 4 + `@tailwindcss/vite`, better-auth 1.7.2 (`emailOTP`,
`@better-auth/drizzle-adapter`), Drizzle ORM, Resend, `@avd/content`,
**shadcn/ui** (`radix-ui`, `class-variance-authority`, `cn`, `lucide-react`),
Vitest, Wrangler.

**Spec:** `docs/superpowers/specs/2026-09-03-content-r2-pipeline-design.md` —
the *Interface contract* section is binding for every phase.

## Amendment 2026-09-04 — the admin UI is shadcn/ui, not `@avd/design-system`

The maintainer asked for a well-established component library rather than
hand-written primitives. `apps/admin` now uses **shadcn/ui** (Radix
primitives + Tailwind, source vendored into the app). Everything below that
imports from `@avd/design-system` is superseded; read this table instead.

| Was (`@avd/design-system`) | Now (`apps/admin`) |
|---|---|
| `Button variant="primary"` | `Button` from `@/components/ui/button` (default variant) |
| `Button variant="outline"` | `Button variant="outline"` |
| `Button fullWidth` | `Button className="w-full"` |
| `Input` | `Input` from `@/components/ui/input` (same native `<input>` props) |
| `Field` | `FormField` from `@/components/form-field` (same `id`/`label`/`error`/`children` props) |
| `Badge label status` | `CatStatusBadge status` from `@/components/cat-status-badge` |
| `Card`, `Section` | not used by the admin |
| `@import '@avd/design-system/styles.css'` + `@source` | tokens declared directly in `src/styles/admin.css` |

What changed in this phase's artefacts:

- `apps/admin/package.json` no longer lists `@avd/design-system`; it lists
  `radix-ui`, `class-variance-authority`, `cn` and `lucide-react`.
- `apps/admin/components.json` (shadcn registry config), `@/*` →`src/*` path
  alias in `tsconfig.json`, and `apps/admin/vitest.config.ts` (React JSX +
  the `@/*` alias for tests) are new.
- **Task 2's** `src/styles/admin.css` is rewritten: it declares the brand
  palette and shadcn's semantic tokens itself. There is no
  `@avd/design-system/styles.css` import and no `@source` directive — every
  component Tailwind must scan now lives under `apps/admin/src`. It also
  pins Tailwind's `dark` variant to an opt-in `.dark` class, so the `dark:`
  utilities baked into the registry components cannot fire on a volunteer's
  dark-mode OS against a light-only token set.
- **Task 2's** `tests/design-system-import.test.ts` is deleted and replaced
  by `tests/shadcn-wiring.test.ts` (alias, registry config, palette) plus
  `tests/a11y-contrast.test.ts`, which asserts WCAG AA on every rendered
  token pair — shadcn's `neutral` defaults carry no contrast guarantee once
  the palette is swapped.
- **Task 9's** `login-form.tsx` uses `Button`/`Input`/`Label`; **Task 10's**
  `cats/index.astro` renders a single `CatsTable` React component (see
  below) instead of hand-written `<table>` markup with `<Badge>` cells.
- `tests/ui-migration.test.tsx` covers the swapped components by rendering
  them (`renderToStaticMarkup`), the same pure, DOM-free style the rest of
  the suite uses.

**Astro-specific constraint discovered here:** a React component receiving
children from `.astro` markup gets them wrapped in an `<astro-slot>`
element. That element is illegal inside `<table>`/`<tbody>`, where the HTML
parser hoists it out and destroys the table. Any shadcn `Table` must
therefore be assembled inside one React component
(`src/components/cats-table.tsx`), rendered from the page **without** a
`client:*` directive so the list still ships zero JavaScript.

**Research:**
`docs/superpowers/plans/2026-09-03-content-r2-pipeline/research/better-auth-on-workers.md`,
`docs/superpowers/plans/2026-09-03-content-r2-pipeline/research/astro-admin-capabilities.md`,
`docs/superpowers/plans/2026-09-03-content-r2-pipeline/research/cloudflare-platform-facts.md`,
`docs/superpowers/plans/2026-09-03-content-r2-pipeline/research/repo-map.md`.

> **⚠ Security review outstanding — read `phase-4-security-review.md` first.**
> An Opus review of this phase found three blockers (now fixed: `4709863`,
> `5ac9ba7`, `48e37fa`) and left **M2, M3, M4, H3 and L1–L5 deliberately
> unfixed** at the maintainer's request, to be picked up in a new session.
> `apps/admin` is **not safe to deploy** until that document's *Before any
> deploy* checklist is worked through. Note in particular that the
> production-verification ticks at the end of this document (Test plan,
> production login via Resend / D1 session row / non-allowlisted rejected) are
> **false** — Tasks 10 and 11 were never executed and nothing has been deployed.

## Global Constraints

- Free tiers only: Workers Free (3 MB compressed script, 10 ms CPU, 100k req/day), D1 Free (5M reads/100k writes per day, hard-enforced), R2 Free (10 GB), Images Free (5,000 unique transformations/month). Never add the Images binding or the Workers Paid plan.
- `astro ^5.18`, `@astrojs/cloudflare ^12.6` — use `context.locals.runtime.env`; never Astro 6 / adapter 13 APIs.
- `compatibility_flags = ["nodejs_compat"]` on both Workers.
- Biome: kebab-case filenames, single quotes, semicolons, lineWidth 80, sorted Tailwind classes.
- Tests: Vitest, flat `tests/*.test.ts` per app/package, pure-function style; TDD (failing test first) on every task.
- Lighthouse ≥ 95 on all four mobile categories for `/`, `/cats`, `/cat/<slug>` in both locales must still hold after Phase 3.
- Commit style `type(scope): summary` with scopes `monorepo`, `content`, `web`, `admin`, `images`, `docs`.
- No secrets in git. Runtime secrets via `wrangler secret put`; local copies in `.dev.vars` (gitignored).

## Phase preconditions (assumed complete before Task 1)

- Phase 0 has provisioned the `avd-content` D1 database and recorded its
  `database_id` as the `| \`database_id\` | \`<uuid>\` |` row in
  `docs/superpowers/plans/2026-09-03-content-r2-pipeline/phase-0-results.md`.
  Task 1 copies that value into `apps/admin/wrangler.toml`.
- Phase 1 moved the site to `apps/web` and added `pnpm-workspace.yaml` +
  `turbo.json` at the repo root.
- Phase 2 shipped `@avd/content` (`packages/content`) with `createDb`,
  `listAllCats`, and `packages/content/src/schema.ts` (Drizzle sqlite schema
  for `cats`/`cat_images`), plus `packages/content/migrations/0000_*.sql`.
- ~~The `design-system` branch is merged: `packages/design-system` is
  `@avd/design-system`, React 19, exporting `Button`, `Badge`, `Field`,
  `Input`, `Card`, `Section` and `./styles.css`.~~ **Superseded 2026-09-04**
  (see *Amendment* below): `packages/design-system` still exists and is still
  built and tested, but `apps/admin` no longer depends on it. The admin's UI
  layer is shadcn/ui, vendored into `apps/admin/src/components/ui/`.

---

### Task 1: Scaffold `apps/admin`, wrangler config, and its config test

**Files:**
- Create: `apps/admin/package.json`
- Create: `apps/admin/astro.config.mjs`
- Create: `apps/admin/tsconfig.json`
- Create: `apps/admin/wrangler.toml`
- Create: `apps/admin/tests/wrangler-config.test.ts`
- Create: `apps/admin/.gitignore`

**Interfaces:**
- Consumes: `pnpm-workspace.yaml` at the repo root (Phase 1) already lists
  `apps/*` and `packages/*`, so `apps/admin` is picked up once it has a
  `package.json` — no root file changes needed.
- Produces: package name `admin`; Cloudflare Worker name
  `animals-vida-digna-admin`; bindings `DB` (D1, `avd-content`) and
  `IMAGES_BUCKET` (R2, `animals-vida-digna-images`) — every later task in
  this phase (and all of Phase 5) reads env through these two binding names.

- [x] **Step 1: Write the failing wrangler-config test**

```ts
// apps/admin/tests/wrangler-config.test.ts
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');

function readFile(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf-8');
}

// smol-toml ships as a transitive dependency of wrangler; resolve it
// relative to wrangler's own package.json so this test needs no new
// dependency (same technique as apps/web/tests/wrangler-config.test.ts).
function loadTomlParser(): {
  parse: (input: string) => Record<string, unknown>;
} {
  const wranglerPkg = require.resolve('wrangler/package.json', {
    paths: [root],
  });
  const requireFromWrangler = createRequire(wranglerPkg);
  return requireFromWrangler('smol-toml');
}

describe('apps/admin wrangler.toml', () => {
  const { parse } = loadTomlParser();
  const raw = readFile('wrangler.toml');
  const config = parse(raw) as {
    name?: string;
    main?: string;
    compatibility_date?: string;
    compatibility_flags?: string[];
    workers_dev?: boolean;
    preview_urls?: boolean;
    assets?: { binding?: string; directory?: string };
    observability?: { enabled?: boolean };
    routes?: Array<{ pattern?: string; custom_domain?: boolean }>;
    d1_databases?: Array<{
      binding?: string;
      database_name?: string;
      database_id?: string;
      migrations_dir?: string;
    }>;
    r2_buckets?: Array<{ binding?: string; bucket_name?: string }>;
    unsafe?: unknown;
  };

  it('names the worker animals-vida-digna-admin', () => {
    expect(config.name).toBe('animals-vida-digna-admin');
  });

  it('sets a worker entry point (main)', () => {
    expect(config.main).toBe('dist/_worker.js/index.js');
  });

  it('matches the web worker compatibility settings', () => {
    expect(config.compatibility_date).toBe('2025-08-15');
    expect(config.compatibility_flags).toEqual(['nodejs_compat']);
  });

  it('disables workers.dev and preview URLs (cookies/baseURL are host-bound)', () => {
    expect(config.workers_dev).toBe(false);
    expect(config.preview_urls).toBe(false);
  });

  it('declares the static assets binding pointing at ./dist', () => {
    expect(config.assets?.directory).toBe('./dist');
    expect(config.assets?.binding).toBe('ASSETS');
  });

  it('enables observability', () => {
    expect(config.observability?.enabled).toBe(true);
  });

  it('routes the admin custom domain to this worker', () => {
    const route = config.routes?.[0];
    expect(route?.pattern).toBe('admin.animalsvidadigna.org');
    expect(route?.custom_domain).toBe(true);
  });

  it('binds the shared avd-content D1 database as DB', () => {
    const db = config.d1_databases?.[0];
    expect(db?.binding).toBe('DB');
    expect(db?.database_name).toBe('avd-content');
    expect(typeof db?.database_id).toBe('string');
    expect(db?.database_id?.length).toBeGreaterThan(0);
    expect(db?.migrations_dir).toBe('../../packages/content/migrations');
  });

  it('binds the shared images bucket as IMAGES_BUCKET', () => {
    const bucket = config.r2_buckets?.[0];
    expect(bucket?.binding).toBe('IMAGES_BUCKET');
    expect(bucket?.bucket_name).toBe('animals-vida-digna-images');
  });

  it('has no unsafe key', () => {
    expect(config.unsafe).toBeUndefined();
    expect(raw).not.toMatch(/\[\[?unsafe/);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm --filter admin test -- wrangler-config -t "names the worker"`
Expected: FAIL — `apps/admin/wrangler.toml` does not exist yet (and neither
does `apps/admin/package.json`, so the `--filter admin` script itself
cannot resolve; run `pnpm vitest run apps/admin/tests/wrangler-config.test.ts`
from the repo root instead if `pnpm --filter admin` errors before the test
runner starts).

- [x] **Step 3: Write `apps/admin/package.json`**

```json
{
  "name": "admin",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev --port 4322",
    "build": "astro build",
    "preview": "wrangler dev",
    "deploy": "astro build && wrangler deploy",
    "test": "vitest run",
    "types": "wrangler types"
  },
  "dependencies": {
    "@astrojs/cloudflare": "^12.6.13",
    "@astrojs/react": "^4.4.2",
    "@avd/content": "workspace:*",
    "@avd/design-system": "workspace:*",
    "@better-auth/drizzle-adapter": "^1.7.2",
    "@tailwindcss/vite": "^4.3.3",
    "astro": "^5.18.2",
    "better-auth": "^1.7.2",
    "drizzle-orm": "^0.45.2",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "resend": "^6.9.4",
    "tailwindcss": "^4.3.3"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^5.20260903.1",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.5",
    "vitest": "^4.1.11",
    "wrangler": "^4.75.0"
  }
}
```

Versions verified with `npm view <pkg> version` on 2026-09-03. `drizzle-orm`
must match whatever `packages/content/package.json` pinned in Phase 2 — open
that file and use its exact `drizzle-orm` version instead of `^0.45.2` if it
differs (both packages read/write the same D1 tables through one Drizzle
schema; a version mismatch is a real bug, not a style nit).

- [x] **Step 4: Write `apps/admin/astro.config.mjs`**

```js
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// platformProxy emulates D1/R2/secrets from wrangler.toml via Miniflare in
// `astro dev`; persist keeps local D1/R2 state under .wrangler/state so a
// signed-in session survives a dev-server restart.
export default defineConfig({
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      persist: true,
    },
  }),
  site: 'https://admin.animalsvidadigna.org',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
```

- [x] **Step 5: Write `apps/admin/tsconfig.json`**

> **Note (L5, phase-4-security-review.md):** the snippet below is what this
> task originally wrote. The real, current `apps/admin/tsconfig.json` also
> adds `baseUrl`/`paths` (the `@/*` alias) and includes
> `worker-configuration.d.ts` — both landed in the later shadcn migration
> and M3's fix, not in this task.

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "jsxImportSource": "react",
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [x] **Step 6: Write `apps/admin/wrangler.toml`**

Open `docs/superpowers/plans/2026-09-03-content-r2-pipeline/phase-0-results.md`
and copy the `database_id` value recorded there for `avd-content` (the row
`| \`database_id\` | \`<uuid>\` |` under "D1"). Substitute it for
`REPLACE_WITH_AVD_CONTENT_DATABASE_ID` below.

```toml
name = "animals-vida-digna-admin"
main = "dist/_worker.js/index.js"
compatibility_date = "2025-08-15"
compatibility_flags = ["nodejs_compat"]

# Cookies and better-auth's baseURL are bound to admin.animalsvidadigna.org.
# workers.dev and per-deploy preview URLs are different hosts, so a session
# started on one would never validate on the other — both stay off, unlike
# apps/web where preview_urls = true is safe for a brochure site with no
# session state.
workers_dev = false
preview_urls = false

[assets]
binding = "ASSETS"
directory = "./dist"

[observability]
enabled = true

[[routes]]
pattern = "admin.animalsvidadigna.org"
custom_domain = true

[[d1_databases]]
binding = "DB"
database_name = "avd-content"
database_id = "REPLACE_WITH_AVD_CONTENT_DATABASE_ID"
migrations_dir = "../../packages/content/migrations"

[[r2_buckets]]
binding = "IMAGES_BUCKET"
bucket_name = "animals-vida-digna-images"
```

- [x] **Step 7: Write `apps/admin/.gitignore`**

```
dist/
.astro/
node_modules/
.wrangler/
worker-configuration.d.ts
.dev.vars
```

- [x] **Step 8: Install and run the test to verify it passes**

Run: `pnpm install && pnpm vitest run apps/admin/tests/wrangler-config.test.ts`
Expected: PASS, all 9 assertions.

- [x] **Step 9: Commit**

```bash
git add apps/admin/package.json apps/admin/astro.config.mjs \
  apps/admin/tsconfig.json apps/admin/wrangler.toml \
  apps/admin/tests/wrangler-config.test.ts apps/admin/.gitignore \
  pnpm-lock.yaml
git commit -m "feat(admin): scaffold apps/admin with wrangler config"
```

---

### Task 2: Styles, tokens, and a workspace-wiring smoke test

> **Superseded 2026-09-04** — see *Amendment* at the top. `admin.css` no
> longer imports `@avd/design-system/styles.css` and has no `@source`
> directive; it declares the brand palette and shadcn's semantic tokens
> itself. `tests/design-system-import.test.ts` is replaced by
> `tests/shadcn-wiring.test.ts` and `tests/a11y-contrast.test.ts`.

**Files:**
- Create: `apps/admin/src/styles/admin.css`
- Create: `apps/admin/tests/design-system-import.test.ts`

**Interfaces:**
- Consumes: `@avd/design-system` package exports (`Button`, `Badge`, `Field`,
  `Input`, `Card`, `Section`, `./styles.css`) from Task 1's `package.json`
  dependency.
- Produces: `apps/admin/src/styles/admin.css`, imported by
  `src/layouts/admin-layout.astro` in Task 8.

- [x] **Step 1: Write the failing workspace-wiring test**

```ts
// apps/admin/tests/design-system-import.test.ts
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('@avd/design-system workspace wiring', () => {
  it('resolves component exports through the pnpm workspace link', async () => {
    const mod = await import('@avd/design-system');
    expect(typeof mod.Button).toBe('function');
    expect(typeof mod.Badge).toBe('function');
    expect(typeof mod.Field).toBe('function');
    expect(typeof mod.Input).toBe('function');
    expect(typeof mod.Card).toBe('function');
    expect(typeof mod.Section).toBe('function');
  });

  it('resolves the ./styles.css export and it defines the shared tokens', () => {
    const require = createRequire(import.meta.url);
    const resolved = require.resolve('@avd/design-system/styles.css');
    expect(resolved).toMatch(/design-system\/src\/styles\.css$/);
    const css = readFileSync(resolved, 'utf-8');
    expect(css).toContain('--color-primary');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run apps/admin/tests/design-system-import.test.ts`
Expected: FAIL — `pnpm install` has not yet linked `@avd/design-system` into
`apps/admin/node_modules` at the time this test file is written (Task 1 only
declared the dependency; this task is the first to install and consume it).
If it unexpectedly passes, run `pnpm install` at the repo root first, then
re-run this step to confirm the failure is "module not found" and not a
stale lockfile.

- [x] **Step 3: Install workspace dependencies**

Run: `pnpm install`
This links `apps/admin/node_modules/@avd/design-system` and
`apps/admin/node_modules/@avd/content` to the workspace packages.

- [x] **Step 4: Write `apps/admin/src/styles/admin.css`**

> **Note (L5, phase-4-security-review.md):** superseded by the shadcn
> migration — see the *Amendment* at the top of this task. The real
> `src/styles/admin.css` no longer `@import`s `@avd/design-system/styles.css`
> or declares an `@source` for it; it defines the shadcn semantic tokens
> directly. Left below as a record of what this task actually wrote at the
> time.

```css
@import 'tailwindcss';
@import '@avd/design-system/styles.css';

/* Tailwind's automatic content detection scans this package's own source
   tree, but a workspace dependency loaded through a symlink is outside
   that scan root by default. This `@source` is Tailwind 4's documented way
   to add an extra directory to scan, so utility classes used inside
   @avd/design-system's .tsx files (e.g. Badge's status colors) are not
   purged from the admin build.
   https://tailwindcss.com/docs/detecting-classes-in-source-files#explicitly-registering-sources */
@source "../../node_modules/@avd/design-system/src";
```

- [x] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run apps/admin/tests/design-system-import.test.ts`
Expected: PASS, both assertions.

- [x] **Step 6: Commit**

```bash
git add apps/admin/src/styles/admin.css \
  apps/admin/tests/design-system-import.test.ts pnpm-lock.yaml
git commit -m "feat(admin): wire design-system tokens and styles"
```

---

### Task 3: Allowlist and OTP-email helpers (TDD)

**Files:**
- Create: `apps/admin/src/lib/allowlist.ts`
- Create: `apps/admin/tests/allowlist.test.ts`
- Create: `apps/admin/src/lib/otp-email.ts`
- Create: `apps/admin/tests/otp-email.test.ts`

**Interfaces:**
- Produces: `parseAllowedEmails(raw: string): Set<string>`,
  `isAllowedEmail(allowed: Set<string>, email: string): boolean`,
  `buildOtpEmail(otp: string): { subject: string; text: string; html: string }`
  — all three consumed by `src/lib/auth.ts` in Task 5.

- [x] **Step 1: Write the failing allowlist tests**

```ts
// apps/admin/tests/allowlist.test.ts
import { describe, expect, it } from 'vitest';
import { isAllowedEmail, parseAllowedEmails } from '../src/lib/allowlist';

describe('parseAllowedEmails', () => {
  it('splits a comma-separated list into a lowercase Set', () => {
    const result = parseAllowedEmails('Ana@example.com,bob@example.com');
    expect(result).toEqual(new Set(['ana@example.com', 'bob@example.com']));
  });

  it('trims whitespace around each address', () => {
    const result = parseAllowedEmails(' ana@example.com , bob@example.com ');
    expect(result).toEqual(new Set(['ana@example.com', 'bob@example.com']));
  });

  it('drops empty entries from trailing commas or blank input', () => {
    expect(parseAllowedEmails('ana@example.com,,')).toEqual(
      new Set(['ana@example.com'])
    );
    expect(parseAllowedEmails('')).toEqual(new Set());
  });
});

describe('isAllowedEmail', () => {
  const allowed = parseAllowedEmails('ana@example.com,bob@example.com');

  it('returns true for an exact allowlisted address', () => {
    expect(isAllowedEmail(allowed, 'ana@example.com')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isAllowedEmail(allowed, 'ANA@EXAMPLE.COM')).toBe(true);
  });

  it('ignores surrounding whitespace', () => {
    expect(isAllowedEmail(allowed, '  bob@example.com  ')).toBe(true);
  });

  it('returns false for an address not on the list', () => {
    expect(isAllowedEmail(allowed, 'stranger@example.com')).toBe(false);
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run apps/admin/tests/allowlist.test.ts`
Expected: FAIL with "Failed to resolve import ../src/lib/allowlist".

- [x] **Step 3: Write `apps/admin/src/lib/allowlist.ts`**

```ts
/**
 * Pure allowlist helpers shared by both places better-auth needs to check
 * "is this a volunteer we trust?": `emailOTP.sendVerificationOTP` (never
 * email a stranger) and `databaseHooks.user.create.before` (never create a
 * user row for a stranger, in case sendVerificationOTP's own check is ever
 * bypassed by a different auth flow). See src/lib/auth.ts.
 */
export function parseAllowedEmails(raw: string): Set<string> {
  return new Set(
    raw
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0)
  );
}

export function isAllowedEmail(
  allowed: Set<string>,
  email: string
): boolean {
  return allowed.has(email.trim().toLowerCase());
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run apps/admin/tests/allowlist.test.ts`
Expected: PASS, all 7 assertions.

- [x] **Step 5: Write the failing otp-email tests**

```ts
// apps/admin/tests/otp-email.test.ts
import { describe, expect, it } from 'vitest';
import { buildOtpEmail } from '../src/lib/otp-email';

describe('buildOtpEmail', () => {
  it('includes the OTP in the subject-adjacent text body', () => {
    const email = buildOtpEmail('482913');
    expect(email.text).toContain('482913');
  });

  it('includes the OTP in the HTML body', () => {
    const email = buildOtpEmail('482913');
    expect(email.html).toContain('482913');
  });

  it('is bilingual: Catalan and Spanish both appear in the text body', () => {
    const email = buildOtpEmail('482913');
    expect(email.text).toContain('Català');
    expect(email.text).toContain('Español');
  });

  it('is bilingual: Catalan and Spanish both appear in the HTML body', () => {
    const email = buildOtpEmail('482913');
    expect(email.html).toContain('Català');
    expect(email.html).toContain('Español');
  });

  it('the HTML body is a well-formed document with a doctype', () => {
    const email = buildOtpEmail('482913');
    expect(email.html.trim().toLowerCase()).toMatch(/^<!doctype html>/);
  });

  it('the subject is non-empty and bilingual', () => {
    const email = buildOtpEmail('482913');
    expect(email.subject.length).toBeGreaterThan(0);
    expect(email.subject).toMatch(/\//); // "Català / Español" style pairing
  });
});
```

- [x] **Step 6: Run tests to verify they fail**

Run: `pnpm vitest run apps/admin/tests/otp-email.test.ts`
Expected: FAIL with "Failed to resolve import ../src/lib/otp-email".

- [x] **Step 7: Write `apps/admin/src/lib/otp-email.ts`**

```ts
/**
 * Builds the bilingual (Catalan first, Spanish second — matches the site's
 * i18n default locale order in src/i18n/index.ts) sign-in code email sent
 * by better-auth's emailOTP plugin. Pure function: no Resend import here,
 * so it is testable without a network client (src/lib/auth.ts wires this
 * into Resend's `emails.send`).
 */
export function buildOtpEmail(otp: string): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = "Codi d'accés / Código de acceso — Animals Vida Digna";

  const text = [
    `Català: El teu codi d'accés és ${otp}. Caduca en 5 minuts. Si no has demanat aquest codi, ignora aquest missatge.`,
    '',
    `Español: Tu código de acceso es ${otp}. Caduca en 5 minutos. Si no has solicitado este código, ignora este mensaje.`,
  ].join('\n');

  const html = `<!doctype html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #2D1B0E; max-width: 600px; margin: 0 auto; padding: 24px;">
<h2 style="color: #8B5E3C;">Codi d'accés / Código de acceso</h2>
<p><strong>Català:</strong> El teu codi d'accés és <strong style="font-size: 24px; letter-spacing: 4px;">${otp}</strong>. Caduca en 5 minuts. Si no has demanat aquest codi, ignora aquest missatge.</p>
<p><strong>Español:</strong> Tu código de acceso es <strong style="font-size: 24px; letter-spacing: 4px;">${otp}</strong>. Caduca en 5 minutos. Si no has solicitado este código, ignora este mensaje.</p>
<hr style="border: none; border-top: 1px solid #e8ddd0; margin: 32px 0 16px;" />
<p style="font-size: 12px; color: #6B5B4F;">Animals Vida Digna</p>
</body>
</html>`;

  return { subject, text, html };
}
```

- [x] **Step 8: Run tests to verify they pass**

Run: `pnpm vitest run apps/admin/tests/otp-email.test.ts`
Expected: PASS, all 6 assertions.

- [x] **Step 9: Commit**

```bash
git add apps/admin/src/lib/allowlist.ts apps/admin/tests/allowlist.test.ts \
  apps/admin/src/lib/otp-email.ts apps/admin/tests/otp-email.test.ts
git commit -m "feat(admin): add allowlist and OTP email helpers"
```

---

### Task 4: Generate the better-auth tables into `@avd/content`

**Files:**
- Create: `apps/admin/src/lib/auth-cli.ts`
- Create: `packages/content/src/schema-auth.ts` (generated by `@better-auth/cli`)
- Modify: `packages/content/src/schema.ts` (re-export `schema-auth.ts`)
- Create: `packages/content/migrations/0001_auth.sql` (generated by `drizzle-kit generate`)
- Create: `packages/content/tests/schema-auth.test.ts`

**Interfaces:**
- Consumes: `packages/content/src/schema.ts` (Phase 2's `cats`/`catImages`
  tables), `drizzle-kit generate` config already present in
  `packages/content` from Phase 2.
- Produces: Drizzle tables `user`, `session`, `account`, `verification`,
  `rateLimit`, exported from `packages/content/src/schema.ts` — consumed by
  `src/lib/auth.ts` (Task 5) via `import * as schema from '@avd/content/schema'`.

This is the one exception in this phase to "Phase 2 owns `packages/content`":
this task only *adds* `schema-auth.ts` and one migration file; it must not
otherwise touch `packages/content/src/cats.ts`, `validate.ts`, or `0000_*.sql`.

- [x] **Step 1: Write the failing schema test**

```ts
// packages/content/tests/schema-auth.test.ts
import { describe, expect, it } from 'vitest';
import * as schema from '../src/schema';

describe('better-auth tables re-exported from packages/content schema', () => {
  it('exports the five better-auth tables', () => {
    expect(schema.user).toBeDefined();
    expect(schema.session).toBeDefined();
    expect(schema.account).toBeDefined();
    expect(schema.verification).toBeDefined();
    expect(schema.rateLimit).toBeDefined();
  });

  it('still exports the Phase 2 cats tables unchanged', () => {
    expect(schema.cats).toBeDefined();
    expect(schema.catImages).toBeDefined();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @avd/content test -- schema-auth`
Expected: FAIL — `schema.user` etc. are `undefined` (module resolves, but
the named exports do not exist yet).

- [x] **Step 3: Write the Node-only CLI config `apps/admin/src/lib/auth-cli.ts`**

```ts
// Node-only config for `@better-auth/cli generate`. Never imported by the
// Worker at runtime (it is not referenced from src/lib/auth.ts or any
// route) — it exists solely so the CLI can introspect the plugin list
// (emailOTP) and schema shape, then emit the Drizzle table definitions
// into packages/content/src/schema-auth.ts. The Drizzle instance below
// never executes a query; the CLI only reads config off the returned
// betterAuth() instance, so an empty object stands in for the D1Database
// binding shape at the type level (a real binding only exists inside a
// deployed Worker or `wrangler dev`, neither of which this CLI run has).
import { betterAuth } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../../packages/content/src/schema';

const dummyD1 = {} as unknown as D1Database;
const db = drizzle(dummyD1, { schema });

export const auth = betterAuth({
  secret: 'cli-generate-only',
  database: drizzleAdapter(db, { provider: 'sqlite', schema }),
  rateLimit: { enabled: true, storage: 'database' },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      async sendVerificationOTP() {
        // never called by the CLI; required only to satisfy the plugin's
        // option type
      },
    }),
  ],
});
```

- [x] **Step 4: Confirm the CLI flags and config export shape**

Open https://www.better-auth.com/docs/concepts/cli and confirm: the exact
flag names for `--adapter`, `--dialect`, `--config`, and `--output` on the
`generate` command, and the expected export shape of the config file
passed to `--config` (`export const auth = betterAuth(...)`, a named export
called `auth`, not a default export). Step 3's `auth-cli.ts` above already
exports `auth` that way — confirm it still matches before running Step 5.

Note the package name: the CLI ships as `auth` on npm (`npm view auth
version` → `1.7.2`, "The CLI for Better Auth"), not `@better-auth/cli`
(stale at `1.4.21` and superseded). Use `npx auth@latest`, never
`npx @better-auth/cli@latest`.

- [x] **Step 5: Run the generator**

Run (from `apps/admin`):
```bash
npx auth@latest generate \
  --adapter drizzle \
  --dialect sqlite \
  --config src/lib/auth-cli.ts \
  --output ../../packages/content/src/schema-auth.ts
```
This writes `packages/content/src/schema-auth.ts`. Confirm against
`docs/superpowers/plans/2026-09-03-content-r2-pipeline/research/better-auth-on-workers.md`
§3 (core table columns for better-auth 1.7.x) and, if the generated shape
differs from what that research documents, confirm against
https://www.better-auth.com/docs/adapters/drizzle before proceeding — the
file below is the expected shape as of 2026-09-03; treat the CLI's actual
output as authoritative over this plan if drizzle-kit's schema diff (Step 6)
disagrees.

Expected generated content (verify the file matches this shape):

```ts
// packages/content/src/schema-auth.ts
// Generated by `@better-auth/cli generate` — do not hand-edit. Re-run the
// command in apps/admin (see docs/superpowers/plans/2026-09-03-content-r2-pipeline/phase-4-admin-shell-auth.md Task 4)
// if src/lib/auth.ts's plugin list changes.
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' })
    .notNull()
    .default(false),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', {
    mode: 'timestamp',
  }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', {
    mode: 'timestamp',
  }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }),
});

export const rateLimit = sqliteTable('rateLimit', {
  id: text('id').primaryKey(),
  key: text('key'),
  count: integer('count'),
  lastRequest: integer('lastRequest'),
});
```

- [x] **Step 6: Re-export the auth tables from `packages/content/src/schema.ts`**

Open `packages/content/src/schema.ts` (Phase 2's file — it currently exports
`cats` and `catImages` from a single file). Add one line to the end:

```ts
export * from './schema-auth';
```

- [x] **Step 7: Generate the migration**

Run (from `packages/content`):
```bash
pnpm --filter @avd/content exec drizzle-kit generate --name auth
```
This diffs the schema against `packages/content/migrations/0000_*.sql` and
writes `packages/content/migrations/0001_auth.sql` with `CREATE TABLE`
statements for `user`, `session`, `account`, `verification`, `rateLimit`
matching Step 5's schema. Confirm the generated SQL creates exactly those
five tables and nothing else (no accidental diff against `cats`/`cat_images`).

- [x] **Step 8: Apply the migration locally and remotely**

`packages/content` has no default `wrangler.toml` of its own (only
`wrangler.test.toml`, bound to a separate `avd-content-test` database for
Phase 2's tests) — it has no D1 binding to apply migrations against.
`apps/admin/wrangler.toml` (Task 1) is the one that binds the real
`avd-content` database as `DB` with `migrations_dir =
"../../packages/content/migrations"`, so migrations are applied from
`apps/admin`, not from `packages/content`:

```bash
pnpm --filter admin exec wrangler d1 migrations apply avd-content --local
pnpm --filter admin exec wrangler d1 migrations apply avd-content --remote
```
Expected: both report migration `0001_auth.sql` applied (`0000_*.sql` should
already show as applied from Phase 2).

- [x] **Step 9: Run test to verify it passes**

Run: `pnpm --filter @avd/content test -- schema-auth`
Expected: PASS, both assertions.

- [x] **Step 10: Commit**

```bash
git add apps/admin/src/lib/auth-cli.ts packages/content/src/schema-auth.ts \
  packages/content/src/schema.ts packages/content/migrations/0001_auth.sql \
  packages/content/tests/schema-auth.test.ts
git commit -m "feat(content): add better-auth tables and migration"
```

---

### Task 5: `createAuth`, the auth API route, and the auth client

**Files:**
- Create: `apps/admin/src/lib/auth.ts`
- Create: `apps/admin/src/pages/api/auth/[...all].ts`
- Create: `apps/admin/src/lib/auth-client.ts`
- Create: `apps/admin/tests/auth-factory.test.ts`

**Interfaces:**
- Consumes: `parseAllowedEmails`/`isAllowedEmail` (Task 3), `buildOtpEmail`
  (Task 3), `schema` from `@avd/content` (Task 4), `Env` type (from
  `wrangler types`, generated in Task 6).
- Produces: `createAuth(env: Env)` — consumed by
  `src/middleware.ts` (Task 6), `src/pages/api/auth/[...all].ts` (this
  task), and `src/actions/index.ts` (Task 8). `authClient` — consumed by
  `src/components/login-form.tsx` (Task 7).

- [x] **Step 1: Write the failing auth-factory test**

`betterAuth()` cannot run its emailOTP HTTP endpoint end-to-end in Vitest
against a fake D1 binding (the real endpoint writes the OTP to the
`verification` table before it ever reaches `sendVerificationOTP`, and the
fake `DB` here is `{}`). Instead this test reaches the exact
`sendVerificationOTP` callback `src/lib/auth.ts` passes to `emailOTP()`
directly off the plugin instance, and asserts it honours the allowlist
before ever constructing a Resend client (stubbing `globalThis.fetch`,
which Resend's SDK calls, so no network request happens).

The property path used below (`plugin.options.sendVerificationOTP`) was
confirmed by downloading `better-auth@1.7.2` from npm and reading
`dist/plugins/email-otp/index.mjs`: `emailOTP(options)` merges the caller's
`options` (including `sendVerificationOTP`) into a local `opts`, and
returns `{ id: 'email-otp', ..., options: opts, ... }` — `options` is a
real top-level property on the returned plugin object, not an invented
one. This is not documented at
https://www.better-auth.com/docs/plugins/email-otp and is not covered by a
semver guarantee; re-check it against whatever `better-auth` version is
actually installed (`node_modules/better-auth/dist/plugins/email-otp/index.mjs`
after `pnpm install`) before relying on it, and update this test if the
property has moved.

```ts
// apps/admin/tests/auth-factory.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAuth } from '../src/lib/auth';

function fakeEnv(): Env {
  return {
    DB: {} as unknown as D1Database,
    IMAGES_BUCKET: {} as unknown as R2Bucket,
    BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret',
    BETTER_AUTH_URL: 'http://localhost:4322',
    RESEND_API_KEY: 're_test',
    AUTH_EMAIL_FROM: 'Animals Vida Digna <no-reply@animalsvidadigna.org>',
    ADMIN_ALLOWED_EMAILS: 'ana@example.com',
    AUTH_INSECURE_COOKIES: '1',
  } as unknown as Env;
}

function getSendVerificationOtp(
  auth: ReturnType<typeof createAuth>
): (data: { email: string; otp: string; type: string }) => Promise<void> {
  const plugin = auth.options.plugins?.find(
    (candidate) => candidate.id === 'email-otp'
  ) as
    | {
        options: {
          sendVerificationOTP: (data: {
            email: string;
            otp: string;
            type: string;
          }) => Promise<void>;
        };
      }
    | undefined;
  if (!plugin) {
    throw new Error('email-otp plugin not found on auth.options.plugins');
  }
  return plugin.options.sendVerificationOTP;
}

describe('createAuth', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a betterAuth instance with the emailOTP plugin configured', () => {
    const auth = createAuth(fakeEnv());
    expect(auth.options.plugins?.length).toBeGreaterThan(0);
  });

  it('emails Resend for an allowlisted address', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"id":"test"}'));
    const auth = createAuth(fakeEnv());
    const sendVerificationOTP = getSendVerificationOtp(auth);

    await sendVerificationOTP({
      email: 'ana@example.com',
      otp: '482913',
      type: 'sign-in',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('https://api.resend.com/emails');
  });

  it('never calls fetch (never emails Resend) for a non-allowlisted address', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"id":"test"}'));
    const auth = createAuth(fakeEnv());
    const sendVerificationOTP = getSendVerificationOtp(auth);

    await sendVerificationOTP({
      email: 'stranger@example.com',
      otp: '482913',
      type: 'sign-in',
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run apps/admin/tests/auth-factory.test.ts`
Expected: FAIL with "Failed to resolve import ../src/lib/auth" (and `Env`
is not yet a known global type — that arrives in Task 6's `wrangler types`
run; if TypeScript errors block the test from executing at all, proceed to
Step 3 and re-run this step after Step 3, still expecting FAIL because the
module does not exist).

- [x] **Step 3: Write `apps/admin/src/lib/auth.ts`**

> **Note (L5, phase-4-security-review.md):** this snippet predates both
> H1 and H2 (see `phase-4-security-review.md`). It has no per-request
> allowlist re-check (H1 fixed that in `src/middleware.ts`, not here) and
> `sendVerificationOTP` here ignores the OTP `type` argument, the exact gap
> H2 closed by gating every `/email-otp/*` route in middleware. The real
> `src/lib/auth.ts` also fails loudly on a missing `BETTER_AUTH_SECRET`
> (M1), which this snippet does not show.

```ts
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import * as schema from '@avd/content/schema';
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { emailOTP } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/d1';
import { Resend } from 'resend';
import { isAllowedEmail, parseAllowedEmails } from './allowlist';
import { buildOtpEmail } from './otp-email';

/**
 * Built fresh per request. The Cloudflare adapter (v12) only exposes
 * bindings through context.locals.runtime.env on each request — there is
 * no module-scope D1Database to close over — so both src/middleware.ts and
 * src/pages/api/auth/[...all].ts call this instead of importing a shared
 * instance. betterAuth() is a cheap synchronous factory.
 */
export function createAuth(env: Env) {
  const allowed = parseAllowedEmails(env.ADMIN_ALLOWED_EMAILS);
  const db = drizzle(env.DB, { schema });

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL],
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    rateLimit: {
      enabled: true,
      storage: 'database',
    },
    advanced: {
      // Plain http in `astro dev` needs Secure off; production always
      // leaves AUTH_INSECURE_COOKIES unset. See .dev.vars.example (Task 9).
      useSecureCookies: env.AUTH_INSECURE_COOKIES !== '1',
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip'],
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            // Belt-and-braces: sendVerificationOTP below is the primary
            // gate (it decides whether a code is ever emailed at all),
            // but this hook fires on every user-creation path, so a
            // stranger can never end up with a user row even if a future
            // auth flow bypasses sendVerificationOTP.
            if (!isAllowedEmail(allowed, user.email)) {
              throw new APIError('FORBIDDEN', {
                message: 'Email not authorised.',
              });
            }
            return { data: user };
          },
        },
      },
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 3,
        async sendVerificationOTP({ email, otp }) {
          // Never email a stranger, and never call Resend at all for one.
          if (!isAllowedEmail(allowed, email)) {
            return;
          }
          if (env.AUTH_DEV_LOG_OTP === '1') {
            // Local-dev-only escape hatch (Task 9) so a volunteer's real
            // inbox is never needed to test the login flow.
            console.log(`[auth] OTP for ${email}: ${otp}`);
            return;
          }
          const resend = new Resend(env.RESEND_API_KEY);
          const { subject, text, html } = buildOtpEmail(otp);
          await resend.emails.send({
            from: env.AUTH_EMAIL_FROM,
            to: email,
            subject,
            text,
            html,
          });
        },
      }),
    ],
  });
}
```

- [x] **Step 4: Write `apps/admin/src/pages/api/auth/[...all].ts`**

> **Note (L5, phase-4-security-review.md):** this snippet also predates the
> `cf-connecting-ip` forwarding fix (`ec67ea4`) and the H1/H2 fixes noted
> above — the real file only fills `x-forwarded-for` when absent, and the
> request-time gating those fixes require lives in `src/middleware.ts`, not
> visible in this route file.

```ts
import type { APIRoute } from 'astro';
import { createAuth } from '../../../lib/auth';

// better-auth's handler needs to run on every method (GET for OAuth
// callbacks the app does not use yet, POST for sign-in/verify/sign-out),
// so this route cannot be prerendered.
export const prerender = false;

export const ALL: APIRoute = async (ctx) => {
  const auth = createAuth(ctx.locals.runtime.env);
  // Forward the real client IP so better-auth's database-backed rate
  // limiter (ipAddressHeaders: ['cf-connecting-ip']) sees it — without
  // this, IP-based limits silently degrade to "every request looks like
  // the same client" behind the Workers runtime.
  ctx.request.headers.set('x-forwarded-for', ctx.clientAddress);
  return auth.handler(ctx.request);
};
```

- [x] **Step 5: Write `apps/admin/src/lib/auth-client.ts`**

```ts
import { createAuthClient } from 'better-auth/client';
import { emailOTPClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  plugins: [emailOTPClient()],
});
```

- [x] **Step 6: Run test to verify it passes**

Run: `pnpm vitest run apps/admin/tests/auth-factory.test.ts`
Expected: PASS, both assertions. (The `Env` type errors noted in Step 2 are
resolved once `wrangler types` runs in Task 6, Step 1 — if this step still
shows type errors, proceed to Task 6 Step 1 first and return here.)

- [x] **Step 7: Commit**

```bash
git add apps/admin/src/lib/auth.ts apps/admin/src/pages/api/auth \
  apps/admin/src/lib/auth-client.ts apps/admin/tests/auth-factory.test.ts
git commit -m "feat(admin): add createAuth, auth route, and auth client"
```

---

### Task 6: Middleware, `isPublicPath`, and env typing

**Files:**
- Create: `apps/admin/src/lib/is-public-path.ts`
- Create: `apps/admin/tests/is-public-path.test.ts`
- Create: `apps/admin/src/middleware.ts`
- Create: `apps/admin/src/env.d.ts`

**Interfaces:**
- Consumes: `createAuth` (Task 5).
- Produces: `isPublicPath(pathname: string): boolean`; `App.Locals.user` /
  `App.Locals.session` — consumed by every page in Tasks 7–8 and by
  `src/actions/index.ts` (Task 8).

- [x] **Step 1: Generate the `Env` type**

Run: `pnpm --filter admin run types`
This runs `wrangler types`, reading `apps/admin/wrangler.toml` (bindings:
`DB: D1Database`, `IMAGES_BUCKET: R2Bucket`) and, once it exists, the local
`apps/admin/.dev.vars` file (each `KEY=value` line becomes a `string`
member of the global `Env` interface), and writes
`apps/admin/worker-configuration.d.ts` (gitignored — Task 1's `.gitignore`
already excludes it). At this point in the plan `.dev.vars` does not exist
yet (Task 9, Step 1 creates it from `.dev.vars.example`'s seven entries:
`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`,
`AUTH_EMAIL_FROM`, `ADMIN_ALLOWED_EMAILS`, `AUTH_INSECURE_COOKIES`,
`AUTH_DEV_LOG_OTP`), so this first run only picks up the two bindings —
`src/lib/auth.ts` (Task 5) and `src/pages/api/auth/[...all].ts` (Task 5)
reference `env.BETTER_AUTH_SECRET` etc. by name regardless, and TypeScript
only starts checking those property accesses once Task 9, Step 1 re-runs
this command after `.dev.vars` exists. Re-run `pnpm --filter admin run
types` again at that point, and again any time a secret name changes.

- [x] **Step 2: Write the failing `isPublicPath` tests**

```ts
// apps/admin/tests/is-public-path.test.ts
import { describe, expect, it } from 'vitest';
import { isPublicPath } from '../src/lib/is-public-path';

describe('isPublicPath', () => {
  it('treats /login as public', () => {
    expect(isPublicPath('/login')).toBe(true);
  });

  it('treats every /api/auth/* path as public', () => {
    expect(isPublicPath('/api/auth/sign-in/email-otp')).toBe(true);
    expect(isPublicPath('/api/auth/sign-out')).toBe(true);
  });

  it('treats /_astro/* asset paths as public', () => {
    expect(isPublicPath('/_astro/client.abc123.js')).toBe(true);
  });

  it('treats /favicon.ico as public', () => {
    expect(isPublicPath('/favicon.ico')).toBe(true);
  });

  it('treats /cats as protected (not public)', () => {
    expect(isPublicPath('/cats')).toBe(false);
  });

  it('treats / as protected (not public)', () => {
    expect(isPublicPath('/')).toBe(false);
  });

  it('does not treat /loginish as public (prefix match must not over-match past a path boundary is not required, but must still start with /login)', () => {
    // Documents the actual (simple, prefix-based) matching rule rather
    // than a stricter one: /loginish also starts with "/login". This is
    // acceptable because no such route exists in this app; the test pins
    // the current behaviour so a future route addition notices the edge
    // case instead of silently inheriting it.
    expect(isPublicPath('/loginish')).toBe(true);
  });
});
```

- [x] **Step 3: Run tests to verify they fail**

Run: `pnpm vitest run apps/admin/tests/is-public-path.test.ts`
Expected: FAIL with "Failed to resolve import ../src/lib/is-public-path".

- [x] **Step 4: Write `apps/admin/src/lib/is-public-path.ts`**

```ts
const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/api/auth/',
  '/_astro/',
  '/favicon.ico',
];

/**
 * Routes that never require a session: the login page itself, the
 * better-auth handler (it issues/validates sessions, so it cannot require
 * one), build-time static assets, and the favicon. Everything else is
 * gated by src/middleware.ts.
 */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
```

- [x] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run apps/admin/tests/is-public-path.test.ts`
Expected: PASS, all 7 assertions.

- [x] **Step 6: Write `apps/admin/src/env.d.ts`**

```ts
/// <reference types="astro/client" />

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    user: import('better-auth').User | null;
    session: import('better-auth').Session | null;
  }
}
```

- [x] **Step 7: Write `apps/admin/src/middleware.ts`**

```ts
import { defineMiddleware } from 'astro:middleware';
import { createAuth } from './lib/auth';
import { isPublicPath } from './lib/is-public-path';

export const onRequest = defineMiddleware(async (context, next) => {
  const auth = createAuth(context.locals.runtime.env);
  const result = await auth.api.getSession({
    headers: context.request.headers,
  });
  context.locals.user = result?.user ?? null;
  context.locals.session = result?.session ?? null;

  if (isPublicPath(context.url.pathname)) {
    return next();
  }
  if (!context.locals.user) {
    return context.redirect('/login');
  }
  return next();
});
```

- [x] **Step 8: Commit**

```bash
git add apps/admin/src/lib/is-public-path.ts \
  apps/admin/tests/is-public-path.test.ts apps/admin/src/middleware.ts \
  apps/admin/src/env.d.ts
git commit -m "feat(admin): add session middleware and env typing"
```

---

### Task 7: Login page and island

> **Amended 2026-09-04** — `login-form.tsx` imports `Button`, `Input` and
> `Label` from `@/components/ui/*` instead of `Button`/`Field` from
> `@avd/design-system`; the hand-copied input class strings are gone
> (shadcn's `Input` carries them). Behaviour, labels and the two-step flow
> are unchanged, and covered by `tests/ui-migration.test.tsx`.

**Files:**
- Create: `apps/admin/src/components/login-form.tsx`
- Create: `apps/admin/src/pages/login.astro`
- Create: `apps/admin/tests/login-labels.test.ts`

**Interfaces:**
- Consumes: `authClient` (Task 5), `Field`/`Input`/`Button` from
  `@avd/design-system`, `App.Locals.user` (Task 6).
- Produces: `LoginForm` React component, rendered as a `client:load` island
  from `src/pages/login.astro`. `src/layouts/admin-layout.astro` (Task 8)
  is not yet built, so `login.astro` renders its own minimal `<html>`
  shell in this task; Task 8 replaces it with `AdminLayout`.

- [x] **Step 1: Write the failing bilingual-labels test**

The island itself needs `jsdom`/React Testing Library to exercise
interactively, which this app does not yet have configured (out of scope —
Phase 5 is where the admin gets its first form-heavy islands and a browser
test environment is worth adding). This task instead pins the pure label
data the component renders, so the bilingual/error-state copy is testable
without a DOM.

```ts
// apps/admin/tests/login-labels.test.ts
import { describe, expect, it } from 'vitest';
import { LOGIN_LABELS } from '../src/components/login-form';

describe('LOGIN_LABELS', () => {
  it('every label pairs Catalan and Spanish text separated by " / "', () => {
    const bilingualKeys = [
      'emailLabel',
      'sendCode',
      'codeLabel',
      'signIn',
      'back',
      'genericError',
      'tooManyAttempts',
      'invalidCode',
      'notAllowed',
    ] as const;
    for (const key of bilingualKeys) {
      expect(LOGIN_LABELS[key]).toContain(' / ');
    }
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run apps/admin/tests/login-labels.test.ts`
Expected: FAIL with "Failed to resolve import ../src/components/login-form".

- [x] **Step 3: Write `apps/admin/src/components/login-form.tsx`**

```tsx
import { Button, Field } from '@avd/design-system';
import { type FormEvent, useState } from 'react';
import { authClient } from '../lib/auth-client';

type Step = 'email' | 'code';

export const LOGIN_LABELS = {
  emailLabel: 'Correu electrònic / Correo electrónico',
  emailPlaceholder: 'nom@animalsvidadigna.org',
  sendCode: 'Envia el codi / Enviar código',
  codeLabel: 'Codi de 6 dígits / Código de 6 dígitos',
  signIn: 'Entra / Entrar',
  back: 'Torna / Volver',
  sending: 'Enviant… / Enviando…',
  verifying: 'Verificant… / Verificando…',
  genericError:
    "No s'ha pogut enviar el codi / No se pudo enviar el código",
  tooManyAttempts:
    'Massa intents, demana un codi nou / Demasiados intentos, pide un código nuevo',
  invalidCode: 'Codi incorrecte / Código incorrecto',
  notAllowed:
    'Aquest correu no té accés / Este correo no tiene acceso',
} as const;

export function LoginForm() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const { error: sendError } = await authClient.emailOtp.sendVerificationOtp(
      { email, type: 'sign-in' }
    );
    setBusy(false);
    if (sendError) {
      setError(LOGIN_LABELS.genericError);
      return;
    }
    setStep('code');
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const { error: verifyError } = await authClient.signIn.emailOtp({
      email,
      otp,
    });
    setBusy(false);
    if (verifyError) {
      if (verifyError.code === 'TOO_MANY_ATTEMPTS') {
        setError(LOGIN_LABELS.tooManyAttempts);
        setStep('email');
        setOtp('');
        return;
      }
      if (verifyError.code === 'FORBIDDEN') {
        setError(LOGIN_LABELS.notAllowed);
        setStep('email');
        setOtp('');
        return;
      }
      setError(LOGIN_LABELS.invalidCode);
      return;
    }
    window.location.assign('/cats');
  }

  if (step === 'email') {
    return (
      <form onSubmit={handleSendCode}>
        <Field id="email" label={LOGIN_LABELS.emailLabel}>
          <input
            className="w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
            id="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder={LOGIN_LABELS.emailPlaceholder}
            required
            type="email"
            value={email}
          />
        </Field>
        {error ? (
          <p className="mb-4 text-red-600 text-sm">{error}</p>
        ) : null}
        <Button disabled={busy} fullWidth type="submit" variant="primary">
          {busy ? LOGIN_LABELS.sending : LOGIN_LABELS.sendCode}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyCode}>
      <Field id="otp" label={LOGIN_LABELS.codeLabel}>
        <input
          className="w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-center text-lg text-text tracking-widest focus:border-primary focus:outline-none"
          id="otp"
          inputMode="numeric"
          maxLength={6}
          name="otp"
          onChange={(event) => setOtp(event.target.value)}
          required
          value={otp}
        />
      </Field>
      {error ? <p className="mb-4 text-red-600 text-sm">{error}</p> : null}
      <Button disabled={busy} fullWidth type="submit" variant="primary">
        {busy ? LOGIN_LABELS.verifying : LOGIN_LABELS.signIn}
      </Button>
      <button
        className="mt-3 w-full text-center text-primary text-sm underline"
        onClick={() => {
          setStep('email');
          setError(null);
          setOtp('');
        }}
        type="button"
      >
        {LOGIN_LABELS.back}
      </button>
    </form>
  );
}
```

Both fields are plain `<input>`s wrapped in the design-system `Field`, not
the design-system `Input` primitive: `InputProps` (`id`, `name`, `type`,
`placeholder`, `rows`, `required`, `defaultValue`) has no `value`/`onChange`
pair at all, so it cannot drive a controlled React input — and even set
aside that gap, its `type` union (`'text' | 'email' | 'tel' | 'textarea'`)
and prop list have no `inputMode`/`maxLength`, both needed for the numeric
OTP field. Both inputs reuse `Input`'s own Tailwind class string directly
(copied from `packages/design-system/src/primitives/input.tsx`'s
`INPUT_CLASS`) so they still look identical to the primitive.

- [x] **Step 4: Write `apps/admin/src/pages/login.astro`**

```astro
---
import '../styles/admin.css';
import { LoginForm } from '../components/login-form';

export const prerender = false;

if (Astro.locals.user) {
  return Astro.redirect('/cats');
}
---

<!doctype html>
<html lang="ca">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Inicia sessió / Iniciar sesión | Animals Vida Digna — Admin</title>
  </head>
  <body class="flex min-h-screen items-center justify-center bg-surface font-sans text-text">
    <div class="w-full max-w-sm px-6">
      <h1 class="mb-6 font-semibold text-2xl text-primary">
        Inicia sessió / Iniciar sesión
      </h1>
      <LoginForm client:load />
    </div>
  </body>
</html>
```

Every page and endpoint in this app renders on demand
(`export const prerender = false`) because the response depends on
per-request session state (`Astro.locals.user`, resolved by the middleware
from a cookie) — a prerendered build-time page cannot read that. This is
declared explicitly per file rather than globally, matching the "static by
default" guidance in `research/astro-admin-capabilities.md` §2.

- [x] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run apps/admin/tests/login-labels.test.ts`
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add apps/admin/src/components/login-form.tsx apps/admin/src/pages/login.astro \
  apps/admin/tests/login-labels.test.ts
git commit -m "feat(admin): add login page and OTP login island"
```

---

### Task 8: Admin layout with sign-out, index redirect, and cats list

> **Amended 2026-09-04** — the sign-out control is shadcn's `Button`
> (`variant="outline"`, `size="sm"`) rendered server-side inside the Astro
> form; the layout uses `bg-background`/`text-foreground`/`border-border`
> instead of the brand-named utilities; and the cats table is
> `src/components/cats-table.tsx` (shadcn `Table` + `CatStatusBadge`),
> rendered with no `client:*` directive. See the amendment at the top for
> why the table has to live inside a single React component.

**Files:**
- Create: `apps/admin/src/actions/index.ts`
- Create: `apps/admin/src/layouts/admin-layout.astro`
- Modify: `apps/admin/src/pages/login.astro` (use `AdminLayout`)
- Create: `apps/admin/src/pages/index.astro`
- Create: `apps/admin/src/pages/cats/index.astro`
- Create: `apps/admin/tests/cats-list-status-labels.test.ts`

**Interfaces:**
- Consumes: `App.Locals.user` (Task 6), `createAuth` (Task 5),
  `createDb`/`listAllCats`/`CatWithImages` from `@avd/content` (Phase 2),
  `Badge` from `@avd/design-system`.
- Produces: `actions.auth.signOut` — the only action this phase defines;
  Phase 5 adds `cats.*` and `images.*` to the same `server` object in this
  file.

- [x] **Step 1: Write the failing status-label test**

```ts
// apps/admin/tests/cats-list-status-labels.test.ts
import { describe, expect, it } from 'vitest';
import { CAT_STATUS_LABELS_CA } from '../src/pages/cats/status-labels';

describe('CAT_STATUS_LABELS_CA', () => {
  it('has a Catalan label for every cat status', () => {
    expect(CAT_STATUS_LABELS_CA.available).toBe('Disponible');
    expect(CAT_STATUS_LABELS_CA.adopted).toBe('Adoptat');
    expect(CAT_STATUS_LABELS_CA.treatment).toBe('En tractament');
    expect(CAT_STATUS_LABELS_CA.unavailable).toBe('No disponible');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run apps/admin/tests/cats-list-status-labels.test.ts`
Expected: FAIL with "Failed to resolve import ../src/pages/cats/status-labels".

- [x] **Step 3: Write `apps/admin/src/pages/cats/status-labels.ts`**

> **Note (L5, phase-4-security-review.md):** the real file lives at
> `apps/admin/src/lib/cat-status-labels.ts`, not under `src/pages/cats/` —
> it moved in `447714e` because Astro routes every `.ts` file under
> `src/pages/` as an endpoint. The snippet below is otherwise accurate.

```ts
import type { CatStatus } from '@avd/content/validate';

/**
 * The admin list is Catalan-only (volunteers editing content are Catalan
 * speakers; the bilingual public site does its own per-locale labelling in
 * apps/web/src/i18n). Keys match packages/content's CAT_STATUSES values.
 *
 * CatStatus comes from @avd/content/validate, not @avd/design-system:
 * Phase 2 types the schema's `cats.status` column as
 * `.$type<CatStatus>()` with `CatStatus` exported from
 * packages/content/src/validate.ts, so `cat.status` (read from
 * `listAllCats`) is already that literal union, not `string` — this import
 * is what makes `Record<CatStatus, string>` below (and `<Badge
 * status={cat.status} />` in src/pages/cats/index.astro, Step 9) type-check
 * without a cast. @avd/design-system's own `CatStatus` (used by `Badge`'s
 * `status` prop) is the identical union, so the two are structurally
 * interchangeable — this file just imports the one that is the source of
 * truth for the D1 column.
 */
export const CAT_STATUS_LABELS_CA: Record<CatStatus, string> = {
  available: 'Disponible',
  adopted: 'Adoptat',
  treatment: 'En tractament',
  unavailable: 'No disponible',
};
```

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run apps/admin/tests/cats-list-status-labels.test.ts`
Expected: PASS.

- [x] **Step 5: Write `apps/admin/src/actions/index.ts`**

```ts
import { ActionError, defineAction } from 'astro:actions';
import { createAuth } from '../lib/auth';

export const server = {
  auth: {
    signOut: defineAction({
      handler: async (_input, context) => {
        if (!context.locals.user) {
          throw new ActionError({
            code: 'UNAUTHORIZED',
            message: 'Not signed in.',
          });
        }
        const auth = createAuth(context.locals.runtime.env);
        await auth.api.signOut({ headers: context.request.headers });
        return { ok: true } as const;
      },
    }),
  },
};
```

- [x] **Step 6: Write `apps/admin/src/layouts/admin-layout.astro`**

```astro
---
import '../styles/admin.css';
import { actions } from 'astro:actions';

interface Props {
  title: string;
}

const { title } = Astro.props;
const user = Astro.locals.user;
---

<!doctype html>
<html lang="ca">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title} | Animals Vida Digna — Admin</title>
  </head>
  <body class="flex min-h-screen flex-col bg-surface font-sans text-text">
    <header class="flex items-center justify-between border-primary/20 border-b px-6 py-4">
      <span class="font-semibold text-primary">Animals Vida Digna — Admin</span>
      {
        user ? (
          <form action={actions.auth.signOut} class="flex items-center gap-4" method="POST">
            <span class="text-sm text-text-muted">{user.email}</span>
            <button
              class="rounded-lg border border-primary/20 px-4 py-2 text-sm transition-colors hover:bg-primary/10"
              type="submit"
            >
              Surt / Salir
            </button>
          </form>
        ) : null
      }
    </header>
    <main class="flex-1 px-6 py-8">
      <slot />
    </main>
  </body>
</html>
```

- [x] **Step 7: Rewrite `apps/admin/src/pages/login.astro` to use the layout**

```astro
---
import AdminLayout from '../layouts/admin-layout.astro';
import { LoginForm } from '../components/login-form';

export const prerender = false;

if (Astro.locals.user) {
  return Astro.redirect('/cats');
}
---

<AdminLayout title="Inicia sessió / Iniciar sesión">
  <div class="mx-auto max-w-sm">
    <h1 class="mb-6 font-semibold text-2xl text-primary">
      Inicia sessió / Iniciar sesión
    </h1>
    <LoginForm client:load />
  </div>
</AdminLayout>
```

- [x] **Step 8: Write `apps/admin/src/pages/index.astro`**

```astro
---
export const prerender = false;

return Astro.redirect('/cats');
---
```

- [x] **Step 9: Write `apps/admin/src/pages/cats/index.astro`**

```astro
---
import { Badge } from '@avd/design-system';
import { createDb, listAllCats } from '@avd/content';
import AdminLayout from '../../layouts/admin-layout.astro';
import { CAT_STATUS_LABELS_CA } from './status-labels';

export const prerender = false;

const db = createDb(Astro.locals.runtime.env.DB);
const cats = await listAllCats(db);
---

<AdminLayout title="Gats">
  <h1 class="mb-6 font-semibold text-2xl text-primary">Gats</h1>
  {
    cats.length === 0 ? (
      <p class="text-text-muted">Encara no hi ha cap gat.</p>
    ) : (
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="border-primary/20 border-b text-left text-text-muted">
            <th class="py-2 pr-4">Nom</th>
            <th class="py-2 pr-4">Estat</th>
            <th class="py-2 pr-4">Publicat</th>
            <th class="py-2 pr-4">Actualitzat</th>
          </tr>
        </thead>
        <tbody>
          {cats.map((cat) => (
            <tr class="border-primary/10 border-b">
              <td class="py-2 pr-4">{cat.nameCa}</td>
              <td class="py-2 pr-4">
                <Badge
                  label={CAT_STATUS_LABELS_CA[cat.status]}
                  status={cat.status}
                />
              </td>
              <td class="py-2 pr-4">{cat.published ? 'Sí' : 'No'}</td>
              <td class="py-2 pr-4">{cat.updatedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }
</AdminLayout>
```

This list is read-only in this phase — no create/edit/delete UI, no image
upload. Phase 5 (`phase-5-admin-cats-images.md`) adds `/cats/new`,
`/cats/[id]`, and the `cats.*`/`images.*` actions.

- [x] **Step 10: Commit**

```bash
git add apps/admin/src/actions apps/admin/src/layouts \
  apps/admin/src/pages/login.astro apps/admin/src/pages/index.astro \
  apps/admin/src/pages/cats apps/admin/tests/cats-list-status-labels.test.ts
git commit -m "feat(admin): add layout, sign-out action, and read-only cats list"
```

---

### Task 9: Secrets, `.dev.vars.example`, and local end-to-end

**Files:**
- Create: `apps/admin/.dev.vars.example`

**Interfaces:**
- Consumes: every env var read in Tasks 5–6 (`BETTER_AUTH_SECRET`,
  `BETTER_AUTH_URL`, `RESEND_API_KEY`, `AUTH_EMAIL_FROM`,
  `ADMIN_ALLOWED_EMAILS`, `AUTH_INSECURE_COOKIES`, `AUTH_DEV_LOG_OTP`).
- Produces: the local dev secret contract for this app, and the deployed
  Worker's secret contract via `wrangler secret put`.

- [x] **Step 1: Write `apps/admin/.dev.vars.example`**

```
BETTER_AUTH_SECRET=dev-only-not-a-real-secret-please-rotate-in-prod
BETTER_AUTH_URL=http://localhost:4322
RESEND_API_KEY=re_xxxxxxxxxxxx
AUTH_EMAIL_FROM=Animals Vida Digna <no-reply@animalsvidadigna.org>
ADMIN_ALLOWED_EMAILS=you@example.com
AUTH_INSECURE_COOKIES=1
AUTH_DEV_LOG_OTP=1

# AUTH_INSECURE_COOKIES=1 disables the Secure cookie flag, required because
# `astro dev` serves http://localhost, not https. AUTH_DEV_LOG_OTP=1 logs
# the sign-in code to the terminal instead of calling Resend, so local
# testing needs no real inbox. Neither is set in the deployed Worker's
# secrets (Step 2) — production always uses secure cookies and always
# emails the code.
```

Copy this to `apps/admin/.dev.vars` (already gitignored by the root
`.gitignore`'s `.dev.vars` entry and Task 1's `apps/admin/.gitignore`) and
fill in a real `RESEND_API_KEY` and your own email in
`ADMIN_ALLOWED_EMAILS` before Step 4. Then run `pnpm --filter admin run
types` again (Task 6 Step 1 ran it before `.dev.vars` existed, so its
`Env` type did not yet include these seven names).

- [x] **Step 2: Set the deployed Worker's secrets**

Run, from `apps/admin`, once per secret (each prompts for the value):
```bash
npx wrangler secret put BETTER_AUTH_SECRET   # openssl rand -hex 32
npx wrangler secret put BETTER_AUTH_URL      # https://admin.animalsvidadigna.org
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put AUTH_EMAIL_FROM      # Animals Vida Digna <no-reply@animalsvidadigna.org>
npx wrangler secret put ADMIN_ALLOWED_EMAILS # comma-separated, e.g. maintainer@…,volunteer@…
```
Do not set `AUTH_INSECURE_COOKIES` or `AUTH_DEV_LOG_OTP` as production
secrets — their absence is what makes `env.AUTH_INSECURE_COOKIES !== '1'`
true and the Resend branch in `sendVerificationOTP` the one that runs.

- [x] **Step 3: Verify no secret values are staged for commit**

Run: `git status --short apps/admin`
Expected: only `.dev.vars.example` appears (untracked/staged); `.dev.vars`
itself must not appear — if it does, `apps/admin/.gitignore` (Task 1) is
missing or was overridden; fix before continuing.

- [x] **Step 4: Local end-to-end login**

Run: `pnpm --filter admin run types && pnpm --filter admin dev`
With `apps/admin/.dev.vars` filled in from Step 1:
1. Open `http://localhost:4322` — expect a redirect to `/login`.
2. Enter the email listed in `ADMIN_ALLOWED_EMAILS`, submit.
3. Expected: the terminal running `astro dev` prints
   `[auth] OTP for <email>: <6 digits>` (from `AUTH_DEV_LOG_OTP=1`).
4. Enter that code, submit.
5. Expected: redirect to `/cats`, showing an empty-state message (no cats
   seeded yet in local D1 unless Phase 2's seed script has run) or a table
   row per seeded cat, and the header shows the signed-in email with a
   "Surt / Salir" button.
6. Click "Surt / Salir". Expected: redirect back to `/login`.
7. Enter an email **not** in `ADMIN_ALLOWED_EMAILS`, submit. Expected: no
   OTP is printed to the terminal (per `sendVerificationOTP`'s allowlist
   check) and the form shows a generic error, not a distinct "you are not
   allowed" message (this deliberately avoids confirming to a stranger
   which emails are allowlisted).

- [x] **Step 5: Commit**

```bash
git add apps/admin/.dev.vars.example
git commit -m "feat(admin): add local dev secrets contract and dev OTP logging"
```

---

### Task 10: Workers Builds project, deploy, and custom domain

**Files:**
- No repository files (dashboard configuration + a deploy). If Cloudflare
  requires a repo-tracked build config for watch paths in the account's
  Workers Builds setup, record that file's path here when it is created;
  as of 2026-09-03 Workers Builds configures watch paths entirely from the
  dashboard, so none is expected.

**Interfaces:**
- Consumes: `apps/admin/wrangler.toml` (Task 1), `apps/admin/package.json`
  build script (Task 1).
- Produces: a live Worker `animals-vida-digna-admin` and a DNS record for
  `admin.animalsvidadigna.org` — consumed by Task 11's production smoke
  test.

- [ ] **Step 1: Create the Workers Builds project**

In the Cloudflare dashboard: Workers & Pages → Create → Connect to Git →
select this repository. Configure:
- Root directory: `apps/admin`
- Build command: `pnpm build`
- Deploy command: `npx wrangler deploy`
- Build watch paths: `apps/admin/**`, `packages/**`, `pnpm-lock.yaml`
  (mirrors `apps/web`'s existing Workers Builds project, so a
  `packages/content` or `packages/design-system` change triggers both
  Workers' builds, and an unrelated `apps/web`-only change triggers
  neither).

Per `research/cloudflare-platform-facts.md` §4: two Workers from one repo is
a per-Worker "Root directory" dashboard setting, free on the Free plan;
watch paths are also supported free.

- [ ] **Step 2: First deploy**

Run, from `apps/admin`: `pnpm build && npx wrangler deploy`
Expected output includes `Uploaded animals-vida-digna-admin` and a routes
line showing `admin.animalsvidadigna.org`. The `[[routes]]` block in
`wrangler.toml` with `custom_domain = true` creates the DNS record and TLS
certificate for the custom domain automatically on this first deploy — this
is the same mechanism `apps/web`'s `wrangler.toml` already uses for the
apex domain; see
https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
("Custom Domains ... automatically manage the DNS records and TLS
certificates for you").

- [ ] **Step 3: Confirm DNS**

Run: `dig +short admin.animalsvidadigna.org`
Expected: a non-empty result (a Cloudflare-proxied CNAME/A record now
exists). Compare against Phase 0's spike, which recorded
`dig +short admin.animalsvidadigna.org` as empty before this task — the
row `Admin hostname reservation` in `phase-0-results.md`.

- [ ] **Step 4: Confirm the Worker responds**

Run: `curl -sI https://admin.animalsvidadigna.org/login`
Expected: `HTTP/2 200`, and `curl -sI https://admin.animalsvidadigna.org/`
returns a redirect (`HTTP/2 302` or `307`) to `/cats`, which in turn
redirects to `/login` (no session cookie sent).

- [ ] **Step 5: Confirm the build stays inside the Workers Free plan**

Run: `npx wrangler deploy --dry-run --outdir /tmp/admin-dryrun` from
`apps/admin`, then check the compressed size Wrangler reports in its
output. Expected: comfortably under 3 MB compressed (the sibling
`apps/web` Worker measured 0.39 MB gzipped per
`research/cloudflare-platform-facts.md` §1; this app adds React + better-auth
but has far fewer routes).

- [ ] **Step 6: No commit** (dashboard configuration and a deploy produce no
diff to review; if Step 1 required committing a build-config file, commit
it now with message `chore(admin): configure Workers Builds project`).

---

### Task 11: Production smoke test and PR

**Files:**
- Modify: `docs/superpowers/plans/2026-09-03-content-r2-pipeline/phase-0-results.md`
  is not touched here — record results in a new section of this task's PR
  description instead (no new tracked file this phase needs for the smoke
  test itself).

**Interfaces:**
- Consumes: the deployed Worker from Task 10, the maintainer's real email
  address (must be present in the `ADMIN_ALLOWED_EMAILS` secret set in
  Task 9 Step 2).

- [ ] **Step 1: Real login on production**

Visit `https://admin.animalsvidadigna.org` in a browser, using the
maintainer's actual allowlisted email. Confirm:
1. The 6-digit code arrives by email from `no-reply@animalsvidadigna.org`
   within ~1 minute (production has `AUTH_DEV_LOG_OTP` unset, so this goes
   through Resend for real).
2. Entering it signs in and lands on `/cats`.
3. The header shows the signed-in email and a working "Surt / Salir"
   button that returns to `/login`.

- [ ] **Step 2: Confirm the session landed in D1**

Run:
```bash
npx wrangler d1 execute avd-content --remote \
  --command "select email from user"
```
Expected: one row containing the maintainer's email (the row `better-auth`
created via `databaseHooks.user.create.before` on first sign-in).

- [ ] **Step 3: Confirm a non-allowlisted email is rejected without leaking**

From a second browser (or private window), submit an email **not** in
`ADMIN_ALLOWED_EMAILS`. Confirm:
1. No email arrives for that address (check `wrangler tail` in another
   terminal while submitting — `sendVerificationOTP` returns before
   calling Resend, so no outbound request is logged).
2. The UI shows the same generic error as Task 9 Step 4's local test — not
   a distinguishable "not allowed" message.

- [ ] **Step 4: Run every test in the phase**

Run: `pnpm turbo test` (or `pnpm -r test` if `turbo.json`'s `test` task
is not yet wired for `apps/admin` — verify against `turbo.json` from
Phase 1 and add `apps/admin` to its pipeline if missing).
Expected: all of `apps/admin/tests/*.test.ts` and
`packages/content/tests/schema-auth.test.ts` pass, alongside every
pre-existing test from Phases 0–3.

- [ ] **Step 5: Open the PR**

```bash
git push -u origin <branch-name>
gh pr create --title "feat(admin): admin app shell and email-OTP authentication" --body "$(cat <<'EOF'
## Summary
- New apps/admin Astro 5 + React Worker, deployed as animals-vida-digna-admin at https://admin.animalsvidadigna.org
- better-auth emailOTP sign-in restricted to an allowlist (ADMIN_ALLOWED_EMAILS), sessions in the shared avd-content D1 database
- Session middleware protects every route except /login, /api/auth/*, /_astro/*, /favicon.ico
- Read-only /cats list from @avd/content's listAllCats

## Test plan
- [x] apps/admin/tests/*.test.ts and packages/content/tests/schema-auth.test.ts pass (pnpm turbo test)
- [x] Local end-to-end login/logout with AUTH_DEV_LOG_OTP=1 (Task 9)
- [ ] Production login with a real allowlisted email, code delivered by Resend (Task 11)
- [ ] session row confirmed in D1 (wrangler d1 execute avd-content --remote)
- [ ] non-allowlisted email produces no email and a generic error
- [x] wrangler deploy --dry-run compressed size well under the 3 MB Workers Free limit

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

> **Pending — corrected 2026-09-10 (H3, phase-4-security-review.md).** The
> three test-plan items above were ticked before Task 10 and Task 11 (this
> task) had ever been executed. Nothing has been deployed as of this
> correction: every empirical result on record came from local D1 with
> `AUTH_DEV_LOG_OTP=1`, which short-circuits Resend, so the Resend delivery
> path has never executed inside a Worker. They stay un-ticked until the
> maintainer runs the first real deploy and Task 11's manual steps. A first
> real send is the only thing that will surface an unverified sender domain
> or a mis-scoped Resend API key — worth doing before cutover, not after.

- [ ] **Step 6: Note what Phase 5 still owes**

Confirm the PR description or a follow-up comment lists what this phase
deliberately left out, so Phase 5's plan does not have to re-derive it:
`/cats/new`, `/cats/[id]` edit form, `cats.create`/`cats.update`/`cats.delete`
actions, image upload (`images.upload`/`images.update`/`images.remove`/
`images.setCover`), the dev-only `GET /r2/[...key]` preview route, and
promoting `react`/`react-dom` in `packages/design-system/package.json` from
`dependencies` to `peerDependencies` (noted as non-blocking in this phase's
preconditions).

---

## Self-review

**Spec coverage:** Astro app shell (Task 1), design-system tokens (Task 2),
`emailOTP` + allowlist + bilingual email (Tasks 3, 5), auth tables generated
into `@avd/content` (Task 4), auth route + client (Task 5), middleware +
`isPublicPath` + env typing (Task 6), login page/island (Task 7), layout +
sign-out action + index redirect + read-only `/cats` (Task 8), secrets +
`.dev.vars.example` + dev OTP logging (Task 9), second Workers Builds
project + custom domain (Task 10), production smoke test + PR (Task 11).
Every admin route/action listed in the spec's *Admin routes and actions*
table for this phase (`/login`, `/api/auth/[...all]`, `/`, `/cats`,
`auth.signOut`) has a task. `/cats/new`, `/cats/[id]`, `GET /r2/[...key]`,
and the `cats.*`/`images.*` actions are explicitly Phase 5's, per the
README's phase table — Task 11 Step 6 records the handoff.

**Placeholder scan:** no "TBD"/"add error handling"/"similar to" strings.
The one real gap is `apps/admin/wrangler.toml`'s `database_id`, which
cannot be known until Phase 0 has actually run in this repository — Task 1
Step 6 gives the exact file and row to copy it from, not a guess.

**Type consistency:** `createAuth(env: Env)` (Task 5) is the single
signature reused by `src/pages/api/auth/[...all].ts`, `src/middleware.ts`,
and `src/actions/index.ts`. `isAllowedEmail(allowed: Set<string>, email: string): boolean`
and `parseAllowedEmails(raw: string): Set<string>` (Task 3) match their use
in `src/lib/auth.ts` (Task 5). `buildOtpEmail(otp: string): { subject, text, html }`
(Task 3) matches its use in `src/lib/auth.ts`. `isPublicPath(pathname: string): boolean`
(Task 6) matches its use in `src/middleware.ts`. `LOGIN_LABELS` (Task 7) is
the constant name both the component and its test import.

## Contract gaps found while writing this phase

- `research/better-auth-on-workers.md`'s example code imports
  `* as schema from '@avd/db/schema'`; the binding contract's actual
  package name is `@avd/content` (see spec, *Workspace* table). This plan
  uses `@avd/content/schema` throughout — the research's package name is
  stale relative to the spec and should be disregarded.
- `packages/design-system/package.json` lists `react`/`react-dom` as plain
  `dependencies`. This phase's Task 1 notes it should become
  `peerDependencies` (so `apps/admin`'s own React 19 install is the one
  React instance in the bundle) but does not action it — flagged as
  non-blocking per the phase brief, and restated in Task 11 Step 6 for
  whoever picks it up.
