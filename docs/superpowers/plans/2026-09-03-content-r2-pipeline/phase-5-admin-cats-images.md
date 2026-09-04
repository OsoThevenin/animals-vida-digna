# Phase 5 — Admin: cats CRUD and image pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A signed-in volunteer can, from `apps/admin`, list cats (filter by status, see a cover thumbnail and published flag), create a cat, edit every field in Catalan and Spanish, upload photos that are resized in the browser to ≤2000px WebP and streamed into R2, reorder photos, edit alt texts, pick the cover, remove photos, toggle published, delete a cat (D1 row + all its R2 objects), and preview an image locally through a dev-only route.

**Architecture:** Pure, unit-tested helpers in `apps/admin/src/lib/` (validation/coercion/gallery-ordering/Markdoc preview, no I/O) are consumed by Astro Actions (`apps/admin/src/actions/index.ts`) that talk to `@avd/content`'s repository functions and the `IMAGES_BUCKET` R2 binding; the R2 write/compensate and delete logic is itself extracted into a pure-ish `image-store.ts` so it can be unit-tested against fake bucket objects. Three React islands (`cat-form.tsx`, `image-manager.tsx`, `delete-cat-button.tsx`) call the actions from three Astro pages (`cats/index.astro`, `cats/new.astro`, `cats/[id].astro`).

**Tech Stack:** Astro 5.18 (React islands, Astro Actions), `@astrojs/cloudflare` 12.6 (`context.locals.runtime.env`), `@avd/content` (Phase 2), `@avd/design-system` (React 19: `Button`, `Field`, `Input`, `Badge`), `browser-image-compression` 2.0.2, `nanoid` ^6.0.1, `@markdoc/markdoc` ^0.5.6, Vitest, Biome.

**Spec:** `docs/superpowers/specs/2026-09-03-content-r2-pipeline-design.md` — the *Interface contract* section is binding. This plan also depends on `docs/superpowers/plans/2026-09-03-content-r2-pipeline/README.md` (phase ordering) and the completed Phase 4 (`apps/admin` shell, auth, middleware, `admin-layout.astro`, `src/lib/auth.ts`, `src/styles/admin.css`, `IMAGES_BUCKET`/`DB` bindings in `apps/admin/wrangler.toml`).

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

## Deferred verification owed by this phase (added 2026-09-04)

**Nothing in this plan merges to `main` until every phase is complete.** The
maintainer decided on 2026-09-04 that the whole branch ships as one reviewed
unit, so gaps that would normally block an individual phase's merge are instead
collected here and settled at Phase 5.

Phase 5 is the first phase that produces a **real cat image**. Until it runs,
the image path has never been exercised end-to-end with real data: the three
seeded cats all have `coverImage.src: null` and empty galleries, so
`cat_images` is empty, the seed's placeholder rows carry Keystatic local paths
with `width`/`height` of `0`, and two specs in `apps/web/e2e/cat-detail.spec.ts`
remain `test.fixme` for want of anything to assert against.

**The Phase 5 verification (Opus reviewer) must explicitly confirm all of the
following, and must not accept "the unit tests pass" as evidence for any of
them:**

1. **The full chain works with a real photo**: upload through the admin →
   object lands in R2 under `cats/<catId>/<imageId>.webp` → a `cat_images` row
   records the correct `r2_key`, real non-zero `width`/`height`, and alt text →
   the public cat page renders an `<img>` whose `src`/`srcset` resolve to
   **HTTP 200** against `images.animalsvidadigna.org`.
2. **The rendered URLs survive the production WAF rule.** The allowlist deployed
   on 2026-09-04 blocks any transform string that is not character-for-character
   canonical — see `phase-0-results.md` *Findings* §5 for the measured 200/403
   matrix. Assert the four canonical widths, and assert that a deviation is
   rejected, so contract drift fails our tests rather than the live site.
3. **The seeded placeholder rows are reconciled.** Either backfilled with real
   R2 keys and dimensions, or deliberately removed. Zero dimensions mean no CLS
   reservation, which works against the Lighthouse ≥ 95 constraint above.
4. **The two `test.fixme` specs in `apps/web/e2e/cat-detail.spec.ts` are
   re-enabled and passing**, or their continued absence is justified in writing.
5. **Remote D1 is re-verified.** The Phase 2 migration and seed were applied by
   the maintainer by hand and are attested, not agent-verified — the agent
   sandbox refuses every `wrangler … --remote` call, including read-only
   `SELECT`s. Confirm `select slug_ca, status from cats` returns
   garfield/lluna/misi before the branch merges.

Treat this section as part of Phase 5's definition of done.

## Contract assumptions carried into this phase

`packages/content`'s `package.json` (Phase 2, Task 1) declares both a barrel
export and per-file subpath exports: `"."` → `src/index.ts` (which
re-exports everything), plus `./schema`, `./cats`, `./validate`,
`./localize`, `./image-url`. This plan imports from the subpaths
(`@avd/content/cats`, `@avd/content/validate`, `@avd/content/image-url`)
rather than the barrel, matching the pattern Phase 2's own `apps/web/src/lib/db.ts`
and Phase 4's `src/lib/auth.ts` (`@avd/content/schema`) use; Phase 4's
`cats/index.astro` and `cats/status-labels.ts` instead import `createDb`,
`listAllCats`, and `CatWithImages` from the bare `@avd/content` barrel —
both forms resolve to the same symbols, so either is correct and this plan
does not need to change Phase 4's file to match.

`R2Bucket` and `D1Database` are ambient types generated by `wrangler types`
into `apps/admin/worker-configuration.d.ts` (gitignored, regenerated by the
`dev`/`postinstall` script per Phase 4). Every file below that references
`R2Bucket` relies on that ambient type; no import is written for it.

`context.locals.user` is `import('better-auth').User | null` (Phase 4's
`src/env.d.ts`), which includes `id: string` and `email: string` among its
fields, guaranteed non-null on any route the Phase 4 middleware
(`src/middleware.ts`) allows through. Actions can still be invoked directly
against their endpoint (bypassing a page's render), so every action handler
in this phase still calls `requireUser(context)` explicitly — this is also
what the spec's Admin routes and actions table requires.

---

### Task 1: Dependencies and `validateUploadFile`

**Files:**
- Modify: `apps/admin/package.json`
- Create: `apps/admin/src/lib/image-upload.ts`
- Test: `apps/admin/tests/image-upload.test.ts`

**Interfaces:**
- Consumes: `MAX_UPLOAD_BYTES` from `@avd/content/image-url` (spec-defined constant, `5 * 1024 * 1024`).
- Produces: `validateUploadFile(file: { type: string; size: number }): { ok: true } | { ok: false; reason: 'type' | 'size' }`, used by Task 6's `images.upload` action and Task 9's `image-manager.tsx`.

- [ ] **Step 1: Add and pin the three new dependencies**

Check the exact versions to pin (run from the repo root, `apps/admin` does not exist as a separate installable package yet in this worktree — Phase 4 created it; these commands describe what Phase 4's `apps/admin` directory now contains):

```bash
npm view browser-image-compression version
npm view nanoid version
```

Confirmed at plan-writing time: `browser-image-compression@2.0.2`, `nanoid@6.0.1` (pin `^6.0.1` — same range Phase 2 already pins for `packages/content`, so pnpm can dedupe the two). Pin `@markdoc/markdoc` to the same range the root `apps/web` uses (`^0.5.6`) rather than latest, for consistency across the monorepo.

Edit `apps/admin/package.json` `dependencies` (keep existing Phase 4 entries — `astro`, `@astrojs/cloudflare`, `@astrojs/react`, `react`, `react-dom`, `better-auth`, `@avd/content`, `@avd/design-system`, `zod` — and add):

```json
{
  "dependencies": {
    "@markdoc/markdoc": "^0.5.6",
    "browser-image-compression": "2.0.2",
    "nanoid": "^6.0.1"
  }
}
```

Then install:

```bash
pnpm install
```

- [ ] **Step 2: Write the failing test**

```ts
// apps/admin/tests/image-upload.test.ts
import { describe, expect, it } from 'vitest';
import { validateUploadFile } from '../src/lib/image-upload';

describe('validateUploadFile', () => {
  it('accepts a webp file within the size limit', () => {
    const result = validateUploadFile({
      type: 'image/webp',
      size: 1024,
    });
    expect(result).toEqual({ ok: true });
  });

  it('accepts a file exactly at the size limit', () => {
    const result = validateUploadFile({
      type: 'image/webp',
      size: 5 * 1024 * 1024,
    });
    expect(result).toEqual({ ok: true });
  });

  it('rejects a non-webp mime type', () => {
    const result = validateUploadFile({
      type: 'image/png',
      size: 1024,
    });
    expect(result).toEqual({ ok: false, reason: 'type' });
  });

  it('rejects a file over the size limit', () => {
    const result = validateUploadFile({
      type: 'image/webp',
      size: 5 * 1024 * 1024 + 1,
    });
    expect(result).toEqual({ ok: false, reason: 'size' });
  });

  it('checks type before size', () => {
    const result = validateUploadFile({
      type: 'image/png',
      size: 5 * 1024 * 1024 + 1,
    });
    expect(result).toEqual({ ok: false, reason: 'type' });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter admin exec vitest run tests/image-upload.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/image-upload'`

- [ ] **Step 4: Write minimal implementation**

```ts
// apps/admin/src/lib/image-upload.ts
import { MAX_UPLOAD_BYTES } from '@avd/content/image-url';

export interface UploadFileMeta {
  type: string;
  size: number;
}

export type ValidateUploadFileResult =
  | { ok: true }
  | { ok: false; reason: 'type' | 'size' };

const ALLOWED_TYPE = 'image/webp';

export function validateUploadFile(
  file: UploadFileMeta,
): ValidateUploadFileResult {
  if (file.type !== ALLOWED_TYPE) {
    return { ok: false, reason: 'type' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: 'size' };
  }
  return { ok: true };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter admin exec vitest run tests/image-upload.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/admin/package.json apps/admin/pnpm-lock.yaml apps/admin/src/lib/image-upload.ts apps/admin/tests/image-upload.test.ts
git commit -m "feat(admin): add image upload deps and validateUploadFile"
```

---

### Task 2: `gallery.ts` — immutable reorder helpers

**Files:**
- Create: `apps/admin/src/lib/gallery.ts`
- Test: `apps/admin/tests/gallery.test.ts`

**Interfaces:**
- Consumes: nothing (pure, generic).
- Produces: `moveImage<T>(list: T[], from: number, to: number): T[]` and `withPositions<T>(list: T[]): (T & { position: number })[]`, used by Task 9's `image-manager.tsx` for the up/down reorder buttons and before calling `actions.images.update`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/admin/tests/gallery.test.ts
import { describe, expect, it } from 'vitest';
import { moveImage, withPositions } from '../src/lib/gallery';

describe('moveImage', () => {
  it('moves an item forward', () => {
    const result = moveImage(['a', 'b', 'c'], 0, 2);
    expect(result).toEqual(['b', 'c', 'a']);
  });

  it('moves an item backward', () => {
    const result = moveImage(['a', 'b', 'c'], 2, 0);
    expect(result).toEqual(['c', 'a', 'b']);
  });

  it('does not mutate the input array', () => {
    const input = ['a', 'b', 'c'];
    moveImage(input, 0, 2);
    expect(input).toEqual(['a', 'b', 'c']);
  });

  it('is a no-op when from equals to', () => {
    const input = ['a', 'b', 'c'];
    const result = moveImage(input, 1, 1);
    expect(result).toEqual(['a', 'b', 'c']);
    expect(result).not.toBe(input);
  });

  it('returns a copy unchanged for an out-of-range index', () => {
    const input = ['a', 'b', 'c'];
    expect(moveImage(input, -1, 1)).toEqual(['a', 'b', 'c']);
    expect(moveImage(input, 0, 5)).toEqual(['a', 'b', 'c']);
  });
});

describe('withPositions', () => {
  it('assigns 0-based positions in array order', () => {
    const result = withPositions([{ id: 'x' }, { id: 'y' }, { id: 'z' }]);
    expect(result).toEqual([
      { id: 'x', position: 0 },
      { id: 'y', position: 1 },
      { id: 'z', position: 2 },
    ]);
  });

  it('does not mutate the input items', () => {
    const input = [{ id: 'x' }];
    withPositions(input);
    expect(input[0]).not.toHaveProperty('position');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter admin exec vitest run tests/gallery.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/gallery'`

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/admin/src/lib/gallery.ts
export function moveImage<T>(list: T[], from: number, to: number): T[] {
  const isValidIndex = (index: number) => index >= 0 && index < list.length;
  if (!isValidIndex(from) || !isValidIndex(to)) {
    return list.slice();
  }
  const copy = list.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function withPositions<T>(
  list: T[],
): (T & { position: number })[] {
  return list.map((item, index) => ({ ...item, position: index }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter admin exec vitest run tests/gallery.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/gallery.ts apps/admin/tests/gallery.test.ts
git commit -m "feat(admin): add immutable gallery reorder helpers"
```

---

### Task 3: `cat-form.ts` — form state helpers

**Files:**
- Create: `apps/admin/src/lib/cat-form.ts`
- Test: `apps/admin/tests/cat-form.test.ts`

**Interfaces:**
- Consumes: `CAT_STATUSES`, `CAT_GENDERS`, `CAT_SIZES`, `slugify` from `@avd/content/validate`; `CatWithImages` type from `@avd/content/cats`.
- Produces: `CatFormState` type, `emptyCatInput(): CatFormState`, `catToInput(cat: CatWithImages): CatFormState`, `formStateToInput(state: CatFormState): unknown`, `deriveSlugs(nameCa: string, nameEs: string, current: { slugCa: string; slugEs: string; slugsEditedManually: boolean }): { slugCa: string; slugEs: string }`, `inputErrorsToFieldErrors(fields: Record<string, string[] | undefined>, mode: 'create' | 'edit'): Record<string, string>`. Consumed by Task 8's `cat-form.tsx` island, which calls `formStateToInput` before `actions.cats.create` / `actions.cats.update` (the action's zod schema, `catInputSchema`, does the actual validation server-side — `formStateToInput` only coerces string form values to the right JS types) and `inputErrorsToFieldErrors` to map `isInputError(error).fields` (which is `data.<field>`-prefixed in edit mode, since `cats.update`'s input is `{ id, data: catInputSchema }`) back to plain field names for the form's error display.

- [ ] **Step 1: Write the failing test**

```ts
// apps/admin/tests/cat-form.test.ts
import { describe, expect, it } from 'vitest';
import {
  catToInput,
  deriveSlugs,
  emptyCatInput,
  formStateToInput,
} from '../src/lib/cat-form';

describe('emptyCatInput', () => {
  it('has sensible defaults for a new cat', () => {
    const state = emptyCatInput();
    expect(state.status).toBe('available');
    expect(state.gender).toBe('male');
    expect(state.size).toBe('medium');
    expect(state.healthStatus).toBe('healthy');
    expect(state.published).toBe(true);
    expect(state.featured).toBe(false);
    expect(state.sortOrder).toBe('0');
    expect(state.personality).toEqual([]);
    expect(state.goodWith).toEqual([]);
    expect(state.age).toBe('');
    expect(state.weight).toBe('');
    expect(state.slugsEditedManually).toBe(false);
  });
});

describe('catToInput', () => {
  const cat = {
    id: 'cat_1',
    slugCa: 'mimi',
    slugEs: 'mimi-es',
    nameCa: 'Mimi',
    nameEs: 'Mimi',
    raceCa: '',
    raceEs: '',
    status: 'available',
    age: 3,
    gender: 'female',
    size: 'small',
    personality: ['playful', 'curious'],
    goodWith: ['children'],
    healthStatus: 'healthy',
    vaccinated: true,
    microchipped: false,
    sterilized: true,
    weight: 3.5,
    rescueDate: '2026-01-01',
    adoptionDate: null,
    specialNeedsCa: '',
    specialNeedsEs: '',
    observationsCa: '',
    observationsEs: '',
    shortDescriptionCa: 'Molt jugueta',
    shortDescriptionEs: 'Muy juguetona',
    descriptionCa: '',
    descriptionEs: '',
    seoTitleCa: '',
    seoTitleEs: '',
    seoDescriptionCa: '',
    seoDescriptionEs: '',
    featured: true,
    sortOrder: 2,
    published: true,
    coverImageId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'volunteer@example.org',
    images: [],
    coverImage: null,
    // biome-ignore lint/suspicious/noExplicitAny: test fixture, not the real CatWithImages import
  } as any;

  it('stringifies numeric and nullable fields', () => {
    const state = catToInput(cat);
    expect(state.age).toBe('3');
    expect(state.weight).toBe('3.5');
    expect(state.rescueDate).toBe('2026-01-01');
    expect(state.adoptionDate).toBe('');
    expect(state.sortOrder).toBe('2');
    expect(state.slugCa).toBe('mimi');
    expect(state.slugsEditedManually).toBe(true);
  });

  it('preserves boolean and array fields', () => {
    const state = catToInput(cat);
    expect(state.vaccinated).toBe(true);
    expect(state.microchipped).toBe(false);
    expect(state.personality).toEqual(['playful', 'curious']);
    expect(state.goodWith).toEqual(['children']);
  });
});

describe('formStateToInput', () => {
  it('coerces empty numeric strings to null', () => {
    const state = { ...emptyCatInput(), age: '', weight: '' };
    const input = formStateToInput(state) as Record<string, unknown>;
    expect(input.age).toBeNull();
    expect(input.weight).toBeNull();
  });

  it('coerces numeric strings to numbers', () => {
    const state = { ...emptyCatInput(), age: '4', weight: '3.2' };
    const input = formStateToInput(state) as Record<string, unknown>;
    expect(input.age).toBe(4);
    expect(input.weight).toBe(3.2);
  });

  it('coerces empty date strings to null and keeps non-empty dates', () => {
    const state = {
      ...emptyCatInput(),
      rescueDate: '',
      adoptionDate: '2026-02-01',
    };
    const input = formStateToInput(state) as Record<string, unknown>;
    expect(input.rescueDate).toBeNull();
    expect(input.adoptionDate).toBe('2026-02-01');
  });

  it('coerces sortOrder to a number, defaulting to 0 on empty string', () => {
    const state = { ...emptyCatInput(), sortOrder: '' };
    const input = formStateToInput(state) as Record<string, unknown>;
    expect(input.sortOrder).toBe(0);
  });

  it('does not include client-only fields', () => {
    const input = formStateToInput(emptyCatInput()) as Record<
      string,
      unknown
    >;
    expect(input).not.toHaveProperty('slugsEditedManually');
  });

  it('keeps booleans and string arrays as-is', () => {
    const state = {
      ...emptyCatInput(),
      vaccinated: true,
      personality: ['calm'],
    };
    const input = formStateToInput(state) as Record<string, unknown>;
    expect(input.vaccinated).toBe(true);
    expect(input.personality).toEqual(['calm']);
  });
});

describe('deriveSlugs', () => {
  it('derives both slugs from the names when not edited manually', () => {
    const result = deriveSlugs('Bigotis', 'Bigotis', {
      slugCa: '',
      slugEs: '',
      slugsEditedManually: false,
    });
    expect(result).toEqual({ slugCa: 'bigotis', slugEs: 'bigotis' });
  });

  it('keeps existing slugs when the user edited them manually', () => {
    const result = deriveSlugs('Bigotis', 'Bigotis', {
      slugCa: 'custom-slug',
      slugEs: 'custom-slug-es',
      slugsEditedManually: true,
    });
    expect(result).toEqual({
      slugCa: 'custom-slug',
      slugEs: 'custom-slug-es',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter admin exec vitest run tests/cat-form.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/cat-form'`

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/admin/src/lib/cat-form.ts
import { slugify } from '@avd/content/validate';
import type { CatWithImages } from '@avd/content/cats';

export interface CatFormState {
  slugCa: string;
  slugEs: string;
  nameCa: string;
  nameEs: string;
  raceCa: string;
  raceEs: string;
  status: string;
  age: string;
  gender: string;
  size: string;
  personality: string[];
  goodWith: string[];
  healthStatus: string;
  vaccinated: boolean;
  microchipped: boolean;
  sterilized: boolean;
  weight: string;
  rescueDate: string;
  adoptionDate: string;
  specialNeedsCa: string;
  specialNeedsEs: string;
  observationsCa: string;
  observationsEs: string;
  shortDescriptionCa: string;
  shortDescriptionEs: string;
  descriptionCa: string;
  descriptionEs: string;
  seoTitleCa: string;
  seoTitleEs: string;
  seoDescriptionCa: string;
  seoDescriptionEs: string;
  featured: boolean;
  sortOrder: string;
  published: boolean;
  /** Client-only: true once the volunteer has hand-edited a slug field. */
  slugsEditedManually: boolean;
}

export function emptyCatInput(): CatFormState {
  return {
    slugCa: '',
    slugEs: '',
    nameCa: '',
    nameEs: '',
    raceCa: '',
    raceEs: '',
    status: 'available',
    age: '',
    gender: 'male',
    size: 'medium',
    personality: [],
    goodWith: [],
    healthStatus: 'healthy',
    vaccinated: false,
    microchipped: false,
    sterilized: false,
    weight: '',
    rescueDate: '',
    adoptionDate: '',
    specialNeedsCa: '',
    specialNeedsEs: '',
    observationsCa: '',
    observationsEs: '',
    shortDescriptionCa: '',
    shortDescriptionEs: '',
    descriptionCa: '',
    descriptionEs: '',
    seoTitleCa: '',
    seoTitleEs: '',
    seoDescriptionCa: '',
    seoDescriptionEs: '',
    featured: false,
    sortOrder: '0',
    published: true,
    slugsEditedManually: false,
  };
}

function numberToString(value: number | null): string {
  return value === null || value === undefined ? '' : String(value);
}

export function catToInput(cat: CatWithImages): CatFormState {
  return {
    slugCa: cat.slugCa,
    slugEs: cat.slugEs,
    nameCa: cat.nameCa,
    nameEs: cat.nameEs,
    raceCa: cat.raceCa,
    raceEs: cat.raceEs,
    status: cat.status,
    age: numberToString(cat.age),
    gender: cat.gender,
    size: cat.size,
    personality: [...cat.personality],
    goodWith: [...cat.goodWith],
    healthStatus: cat.healthStatus,
    vaccinated: cat.vaccinated,
    microchipped: cat.microchipped,
    sterilized: cat.sterilized,
    weight: numberToString(cat.weight),
    rescueDate: cat.rescueDate ?? '',
    adoptionDate: cat.adoptionDate ?? '',
    specialNeedsCa: cat.specialNeedsCa,
    specialNeedsEs: cat.specialNeedsEs,
    observationsCa: cat.observationsCa,
    observationsEs: cat.observationsEs,
    shortDescriptionCa: cat.shortDescriptionCa,
    shortDescriptionEs: cat.shortDescriptionEs,
    descriptionCa: cat.descriptionCa,
    descriptionEs: cat.descriptionEs,
    seoTitleCa: cat.seoTitleCa,
    seoTitleEs: cat.seoTitleEs,
    seoDescriptionCa: cat.seoDescriptionCa,
    seoDescriptionEs: cat.seoDescriptionEs,
    featured: cat.featured,
    sortOrder: numberToString(cat.sortOrder),
    published: cat.published,
    // An existing cat already has slugs on record; do not silently
    // overwrite them if the volunteer edits the name.
    slugsEditedManually: true,
  };
}

function emptyStringToNull(value: string): string | null {
  return value.trim() === '' ? null : value;
}

function numericStringToNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

export function formStateToInput(state: CatFormState): unknown {
  const { slugsEditedManually, ...rest } = state;
  return {
    ...rest,
    age: numericStringToNumberOrNull(state.age),
    weight: numericStringToNumberOrNull(state.weight),
    sortOrder: numericStringToNumberOrNull(state.sortOrder) ?? 0,
    rescueDate: emptyStringToNull(state.rescueDate),
    adoptionDate: emptyStringToNull(state.adoptionDate),
  };
}

export function deriveSlugs(
  nameCa: string,
  nameEs: string,
  current: { slugCa: string; slugEs: string; slugsEditedManually: boolean },
): { slugCa: string; slugEs: string } {
  if (current.slugsEditedManually) {
    return { slugCa: current.slugCa, slugEs: current.slugEs };
  }
  return { slugCa: slugify(nameCa), slugEs: slugify(nameEs) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter admin exec vitest run tests/cat-form.test.ts`
Expected: PASS (12 tests)

- [ ] **Step 5: Write the failing test for `inputErrorsToFieldErrors`**

`actions.cats.update`'s input is `{ id, data: catInputSchema }` (per the
spec's Admin routes and actions table), so a Zod input error from `update`
reports field paths as `data.nameCa`, `data.nameEs`, etc., while
`actions.cats.create`'s input is `catInputSchema` directly, so its field
paths are bare (`nameCa`, `nameEs`). Task 8's `cat-form.tsx` needs one
mapper that strips the `data.` prefix only in edit mode, so it is extracted
here as a pure function and tested before Task 8 consumes it.

Append to `apps/admin/tests/cat-form.test.ts`:

```ts
// apps/admin/tests/cat-form.test.ts (append)
import { inputErrorsToFieldErrors } from '../src/lib/cat-form';

describe('inputErrorsToFieldErrors', () => {
  it('keeps bare field names as-is in create mode', () => {
    const result = inputErrorsToFieldErrors(
      { nameCa: ['Required'], nameEs: ['Required'] },
      'create',
    );
    expect(result).toEqual({ nameCa: 'Required', nameEs: 'Required' });
  });

  it('strips the "data." prefix in edit mode', () => {
    const result = inputErrorsToFieldErrors(
      { 'data.nameCa': ['Required'] },
      'edit',
    );
    expect(result).toEqual({ nameCa: 'Required' });
  });

  it('takes only the first message per field', () => {
    const result = inputErrorsToFieldErrors(
      { 'data.nameCa': ['Required', 'Too short'] },
      'edit',
    );
    expect(result).toEqual({ nameCa: 'Required' });
  });

  it('skips fields with no messages', () => {
    const result = inputErrorsToFieldErrors(
      { nameCa: undefined, nameEs: [] },
      'create',
    );
    expect(result).toEqual({});
  });

  it('leaves an edit-mode field without the "data." prefix unchanged', () => {
    // Defensive: a top-level Zod issue (e.g. on the whole input object)
    // would not carry the "data." prefix; the mapper must not corrupt it.
    const result = inputErrorsToFieldErrors({ id: ['Required'] }, 'edit');
    expect(result).toEqual({ id: 'Required' });
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm --filter admin exec vitest run tests/cat-form.test.ts`
Expected: FAIL — `inputErrorsToFieldErrors is not exported`

- [ ] **Step 7: Add `inputErrorsToFieldErrors` to `cat-form.ts`**

Append to `apps/admin/src/lib/cat-form.ts`:

```ts
// apps/admin/src/lib/cat-form.ts (append)
/**
 * Maps an Astro Action's isInputError().fields to a flat
 * { fieldName: message } object cat-form.tsx can index into. In edit mode
 * the action's input is `{ id, data: catInputSchema }`, so Zod reports
 * field paths as `data.nameCa`; this strips that prefix so the same
 * <Field error={fieldErrors.nameCa}> lookup works in both create and edit
 * mode. Only the first message per field is kept (Field only renders one).
 */
export function inputErrorsToFieldErrors(
  fields: Record<string, string[] | undefined>,
  mode: 'create' | 'edit',
): Record<string, string> {
  const prefix = mode === 'edit' ? 'data.' : '';
  const errors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(fields)) {
    if (!messages || messages.length === 0) continue;
    const key = prefix && field.startsWith(prefix)
      ? field.slice(prefix.length)
      : field;
    errors[key] = messages[0];
  }
  return errors;
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm --filter admin exec vitest run tests/cat-form.test.ts`
Expected: PASS (17 tests)

- [ ] **Step 9: Commit**

```bash
git add apps/admin/src/lib/cat-form.ts apps/admin/tests/cat-form.test.ts
git commit -m "feat(admin): add cat form state coercion and input-error mapping helpers"
```

---

### Task 4: `markdoc-preview.ts` — description live preview

**Files:**
- Create: `apps/admin/src/lib/markdoc-preview.ts`
- Test: `apps/admin/tests/markdoc-preview.test.ts`

**Interfaces:**
- Consumes: `@markdoc/markdoc` (installed in Task 1).
- Produces: `renderPreview(src: string): string`, called client-side (no server round trip) by Task 8's `cat-form.tsx` when the volunteer toggles the description preview.

- [ ] **Step 1: Write the failing test**

```ts
// apps/admin/tests/markdoc-preview.test.ts
import { describe, expect, it } from 'vitest';
import { renderPreview } from '../src/lib/markdoc-preview';

describe('renderPreview', () => {
  it('renders a paragraph', () => {
    const html = renderPreview('Hola, sóc en Mimi.');
    expect(html).toContain('<p>Hola, sóc en Mimi.</p>');
  });

  it('renders bold and italic markdown', () => {
    const html = renderPreview('**fort** i _cursiva_');
    expect(html).toContain('<strong>fort</strong>');
    expect(html).toContain('<em>cursiva</em>');
  });

  it('returns an empty string for empty input', () => {
    expect(renderPreview('')).toBe('');
    expect(renderPreview('   ')).toBe('');
  });

  it('does not throw on malformed input', () => {
    expect(() => renderPreview('{% unknown-tag %}')).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter admin exec vitest run tests/markdoc-preview.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/markdoc-preview'`

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/admin/src/lib/markdoc-preview.ts
import Markdoc from '@markdoc/markdoc';

/**
 * Renders raw Markdoc source to an HTML string for the admin's live
 * description preview. Pure — runs the same in the browser and on the
 * server, no network or filesystem access.
 */
export function renderPreview(src: string): string {
  if (!src || src.trim() === '') return '';
  try {
    const ast = Markdoc.parse(src);
    const transformed = Markdoc.transform(ast);
    return Markdoc.renderers.html(transformed) || '';
  } catch {
    return '';
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter admin exec vitest run tests/markdoc-preview.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/markdoc-preview.ts apps/admin/tests/markdoc-preview.test.ts
git commit -m "feat(admin): add Markdoc live preview renderer"
```

---

### Task 5: `requireUser`, `image-store.ts`, and `cats.*` actions

**Files:**
- Create: `apps/admin/src/actions/require-user.ts`
- Create: `apps/admin/src/lib/image-store.ts`
- Modify: `apps/admin/src/actions/index.ts` (Phase 4 Task 8 already created this file with `createAuth` and `server.auth.signOut`; this task adds `server.cats`)
- Test: `apps/admin/tests/image-store.test.ts`

**Interfaces:**
- Consumes: `createDb`, `createCat`, `updateCat`, `deleteCat`, `getCatById` from `@avd/content/cats` (`addCatImage` is consumed only inside `image-store.ts`, not directly in `actions/index.ts`); `catInputSchema` from `@avd/content/validate`; `createAuth` from `../lib/auth` (Phase 4, already imported by the existing `actions/index.ts`).
- Produces: `requireUser(context: import('astro:actions').ActionAPIContext): { id: string; email: string }` (throws `ActionError({ code: 'UNAUTHORIZED' })`), consumed by every action in this file and in Task 6. `uploadImageToBucket` and `deleteImagesFromBucket` from `image-store.ts`, consumed by Task 6's `images.upload`/`images.remove`/`cats.delete`. `server.cats.{create,update,delete}` added to the existing Actions export, consumed by Task 8's `cat-form.tsx` and Task 10's `delete-cat-button.tsx`.

- [ ] **Step 1: Write the failing test for the R2 compensation logic**

```ts
// apps/admin/tests/image-store.test.ts
import { describe, expect, it, vi } from 'vitest';
import { deleteImagesFromBucket, uploadImageToBucket } from '../src/lib/image-store';

vi.mock('@avd/content/cats', () => ({
  addCatImage: vi.fn(),
}));

import { addCatImage } from '@avd/content/cats';

function fakeFile(): File {
  return new File(['fake-bytes'], 'photo.webp', { type: 'image/webp' });
}

describe('uploadImageToBucket', () => {
  it('puts the object then records it in D1', async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const del = vi.fn().mockResolvedValue(undefined);
    const bucket = { put, delete: del };
    const db = {} as never;
    vi.mocked(addCatImage).mockResolvedValue({
      id: 'img_1',
      catId: 'cat_1',
      r2Key: 'cats/cat_1/img_1.webp',
      altCa: '',
      altEs: '',
      width: 800,
      height: 600,
      position: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    const result = await uploadImageToBucket(bucket, db, {
      catId: 'cat_1',
      key: 'cats/cat_1/img_1.webp',
      file: fakeFile(),
      width: 800,
      height: 600,
    });

    expect(put).toHaveBeenCalledWith(
      'cats/cat_1/img_1.webp',
      expect.anything(),
      {
        httpMetadata: {
          contentType: 'image/webp',
          cacheControl: 'public, max-age=31536000, immutable',
        },
      },
    );
    expect(addCatImage).toHaveBeenCalledWith(db, 'cat_1', {
      r2Key: 'cats/cat_1/img_1.webp',
      width: 800,
      height: 600,
    });
    expect(del).not.toHaveBeenCalled();
    expect(result.id).toBe('img_1');
  });

  it('deletes the just-uploaded object when the D1 write fails', async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const del = vi.fn().mockResolvedValue(undefined);
    const bucket = { put, delete: del };
    const db = {} as never;
    vi.mocked(addCatImage).mockRejectedValue(new Error('D1 write failed'));

    await expect(
      uploadImageToBucket(bucket, db, {
        catId: 'cat_1',
        key: 'cats/cat_1/img_2.webp',
        file: fakeFile(),
        width: 800,
        height: 600,
      }),
    ).rejects.toThrow('D1 write failed');

    expect(del).toHaveBeenCalledWith('cats/cat_1/img_2.webp');
  });
});

describe('deleteImagesFromBucket', () => {
  it('deletes all given keys in one call', async () => {
    const del = vi.fn().mockResolvedValue(undefined);
    await deleteImagesFromBucket({ delete: del }, ['a.webp', 'b.webp']);
    expect(del).toHaveBeenCalledWith(['a.webp', 'b.webp']);
  });

  it('does nothing for an empty key list', async () => {
    const del = vi.fn();
    await deleteImagesFromBucket({ delete: del }, []);
    expect(del).not.toHaveBeenCalled();
  });

  it('swallows a bucket delete failure and logs it', async () => {
    const del = vi.fn().mockRejectedValue(new Error('R2 unavailable'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      deleteImagesFromBucket({ delete: del }, ['a.webp']),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter admin exec vitest run tests/image-store.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/image-store'`

- [ ] **Step 3: Write `image-store.ts`**

```ts
// apps/admin/src/lib/image-store.ts
import { addCatImage } from '@avd/content/cats';
import type { CatImage, Db } from '@avd/content/cats';

export interface UploadImageParams {
  catId: string;
  key: string;
  file: File;
  width: number;
  height: number;
}

/**
 * Streams a resized photo into R2 then records it in D1. If the D1 write
 * fails, the just-uploaded R2 object is deleted so no orphan is left behind
 * (compensating action — R2 has no transactions shared with D1).
 */
export async function uploadImageToBucket(
  bucket: Pick<R2Bucket, 'put' | 'delete'>,
  db: Db,
  params: UploadImageParams,
): Promise<CatImage> {
  await bucket.put(params.key, params.file.stream(), {
    httpMetadata: {
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });

  try {
    return await addCatImage(db, params.catId, {
      r2Key: params.key,
      width: params.width,
      height: params.height,
    });
  } catch (error) {
    await bucket.delete(params.key);
    throw error;
  }
}

/**
 * Deletes R2 objects after their D1 rows are already gone. Best-effort: an
 * R2 failure here is logged, not thrown, so the caller (which has already
 * committed the D1 delete) does not report an error to the volunteer for an
 * orphaned object that Phase 6's sweep script will clean up later.
 */
export async function deleteImagesFromBucket(
  bucket: Pick<R2Bucket, 'delete'>,
  keys: string[],
): Promise<void> {
  if (keys.length === 0) return;
  try {
    await bucket.delete(keys);
  } catch (error) {
    console.error('image-store: failed to delete R2 objects', {
      keys,
      error,
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter admin exec vitest run tests/image-store.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Write `requireUser`**

```ts
// apps/admin/src/actions/require-user.ts
import { ActionError } from 'astro:actions';
import type { ActionAPIContext } from 'astro:actions';

export interface AdminUser {
  id: string;
  email: string;
}

/**
 * Every action handler in this app calls this first. The Phase 4 middleware
 * already redirects unauthenticated page loads to /login, but Actions can be
 * invoked directly (fetch to the action endpoint), so each handler re-checks.
 */
export function requireUser(context: ActionAPIContext): AdminUser {
  const user = context.locals.user;
  if (!user) {
    throw new ActionError({
      code: 'UNAUTHORIZED',
      message: 'Cal iniciar sessió (session required).',
    });
  }
  return user;
}
```

- [ ] **Step 6: Add `cats.*` actions to the existing `actions/index.ts`**

Phase 4 Task 8 already created `apps/admin/src/actions/index.ts` with
`createAuth` and `server.auth.signOut`:

```ts
// apps/admin/src/actions/index.ts (Phase 4 Task 8 — do not retype, shown for reference)
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

Modify that file: keep the `createAuth` import and the entire `auth.signOut`
block byte-for-byte, add the imports this task needs, and add a `cats` key
to `server` alongside `auth`:

```ts
// apps/admin/src/actions/index.ts
import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { createAuth } from '../lib/auth';
import {
  createCat,
  createDb,
  deleteCat,
  getCatById,
  updateCat,
} from '@avd/content/cats';
import { catInputSchema } from '@avd/content/validate';
import { deleteImagesFromBucket } from '../lib/image-store';
import { requireUser } from './require-user';

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
  cats: {
    create: defineAction({
      input: catInputSchema,
      handler: async (input, context) => {
        const user = requireUser(context);
        const db = createDb(context.locals.runtime.env.DB);
        return createCat(db, input, user.email);
      },
    }),
    update: defineAction({
      input: z.object({ id: z.string(), data: catInputSchema }),
      handler: async (input, context) => {
        const user = requireUser(context);
        const db = createDb(context.locals.runtime.env.DB);
        const existing = await getCatById(db, input.id);
        if (!existing) {
          throw new ActionError({
            code: 'NOT_FOUND',
            message: 'Gat no trobat.',
          });
        }
        return updateCat(db, input.id, input.data, user.email);
      },
    }),
    delete: defineAction({
      input: z.object({ id: z.string() }),
      handler: async (input, context) => {
        requireUser(context);
        const db = createDb(context.locals.runtime.env.DB);
        const { r2Keys } = await deleteCat(db, input.id);
        await deleteImagesFromBucket(
          context.locals.runtime.env.IMAGES_BUCKET,
          r2Keys,
        );
        return { ok: true } as const;
      },
    }),
  },
};
```

`requireUser` (Step 5) and the inline `if (!context.locals.user) throw …`
Phase 4 already wrote for `auth.signOut` do the same check; they are kept
separate rather than refactoring `auth.signOut` to call `requireUser`, since
this task's job is to add `cats`, not to edit Phase 4's tested code.

- [ ] **Step 7: Manually verify the action module type-checks**

Run: `pnpm --filter admin exec astro check`
Expected: no new type errors from `src/actions/index.ts`, `src/actions/require-user.ts`, or `src/lib/image-store.ts`.

- [ ] **Step 8: Commit**

```bash
git add apps/admin/src/actions/require-user.ts apps/admin/src/lib/image-store.ts apps/admin/src/actions/index.ts apps/admin/tests/image-store.test.ts
git commit -m "feat(admin): add requireUser, image-store, and cats actions"
```

---

### Task 6: `images.*` actions

**Files:**
- Modify: `apps/admin/src/actions/index.ts`

**Interfaces:**
- Consumes: `validateUploadFile` (Task 1), `uploadImageToBucket`/`deleteImagesFromBucket` (Task 5), `imageKey` from `@avd/content/image-url`, `updateCatImages`, `removeCatImage`, `setCoverImage` from `@avd/content/cats`, `nanoid` from `nanoid`.
- Produces: `server.images.{upload,update,remove,setCover}`, consumed by Task 9's `image-manager.tsx`.

- [ ] **Step 1: Add the `images` actions**

No new pure logic is introduced here (it was already tested in Task 5 via
`image-store.ts` and Task 1 via `image-upload.ts`), so this task wires
existing, tested pieces together — verified by a manual `astro dev` check in
Step 2, per the "TDD on the pure parts" scoping in this phase's brief.

Extend the same `apps/admin/src/actions/index.ts` from Task 5 — keep
`createAuth` and `auth.signOut` exactly as Phase 4 Task 8 wrote them (Task 5
already re-added them verbatim), and add the `images` key to `server`:

```ts
// apps/admin/src/actions/index.ts
import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { nanoid } from 'nanoid';
import { createAuth } from '../lib/auth';
import {
  createCat,
  createDb,
  deleteCat,
  getCatById,
  removeCatImage,
  setCoverImage,
  updateCat,
  updateCatImages,
} from '@avd/content/cats';
import { catInputSchema } from '@avd/content/validate';
import { imageKey } from '@avd/content/image-url';
import { validateUploadFile } from '../lib/image-upload';
import { deleteImagesFromBucket, uploadImageToBucket } from '../lib/image-store';
import { requireUser } from './require-user';

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
  cats: {
    create: defineAction({
      input: catInputSchema,
      handler: async (input, context) => {
        const user = requireUser(context);
        const db = createDb(context.locals.runtime.env.DB);
        return createCat(db, input, user.email);
      },
    }),
    update: defineAction({
      input: z.object({ id: z.string(), data: catInputSchema }),
      handler: async (input, context) => {
        const user = requireUser(context);
        const db = createDb(context.locals.runtime.env.DB);
        const existing = await getCatById(db, input.id);
        if (!existing) {
          throw new ActionError({
            code: 'NOT_FOUND',
            message: 'Gat no trobat.',
          });
        }
        return updateCat(db, input.id, input.data, user.email);
      },
    }),
    delete: defineAction({
      input: z.object({ id: z.string() }),
      handler: async (input, context) => {
        requireUser(context);
        const db = createDb(context.locals.runtime.env.DB);
        const { r2Keys } = await deleteCat(db, input.id);
        await deleteImagesFromBucket(
          context.locals.runtime.env.IMAGES_BUCKET,
          r2Keys,
        );
        return { ok: true } as const;
      },
    }),
  },
  images: {
    upload: defineAction({
      accept: 'form',
      input: z.object({
        catId: z.string(),
        file: z.instanceof(File),
        width: z.coerce.number().int().positive(),
        height: z.coerce.number().int().positive(),
      }),
      handler: async (input, context) => {
        requireUser(context);
        const validation = validateUploadFile({
          type: input.file.type,
          size: input.file.size,
        });
        if (!validation.ok) {
          throw new ActionError({
            code: 'BAD_REQUEST',
            message:
              validation.reason === 'type'
                ? 'invalid_file_type'
                : 'file_too_large',
          });
        }
        const db = createDb(context.locals.runtime.env.DB);
        const imageId = nanoid();
        const key = imageKey(input.catId, imageId);
        return uploadImageToBucket(context.locals.runtime.env.IMAGES_BUCKET, db, {
          catId: input.catId,
          key,
          file: input.file,
          width: input.width,
          height: input.height,
        });
      },
    }),
    update: defineAction({
      input: z.object({
        catId: z.string(),
        images: z.array(
          z.object({
            id: z.string(),
            altCa: z.string(),
            altEs: z.string(),
            position: z.number().int().nonnegative(),
          }),
        ),
      }),
      handler: async (input, context) => {
        requireUser(context);
        const db = createDb(context.locals.runtime.env.DB);
        await updateCatImages(db, input.catId, input.images);
        return { ok: true } as const;
      },
    }),
    remove: defineAction({
      input: z.object({ imageId: z.string() }),
      handler: async (input, context) => {
        requireUser(context);
        const db = createDb(context.locals.runtime.env.DB);
        const removed = await removeCatImage(db, input.imageId);
        if (removed) {
          await deleteImagesFromBucket(
            context.locals.runtime.env.IMAGES_BUCKET,
            [removed.r2Key],
          );
        }
        return { ok: true } as const;
      },
    }),
    setCover: defineAction({
      input: z.object({
        catId: z.string(),
        imageId: z.string().nullable(),
      }),
      handler: async (input, context) => {
        requireUser(context);
        const db = createDb(context.locals.runtime.env.DB);
        await setCoverImage(db, input.catId, input.imageId);
        return { ok: true } as const;
      },
    }),
  },
};
```

`addCatImage` is not imported in `actions/index.ts` at all — it is only
consumed inside `image-store.ts` (Task 5), so `actions/index.ts` never
touches it directly. Biome's unused-import rule would fail the build on a
dangling `addCatImage` import here, which is why the import list above
omits it.

- [ ] **Step 2: Manually verify against local D1 + R2**

Run: `pnpm --filter admin exec astro dev --port 4322` (requires Phase 4's
`platformProxy` config and Phase 2's migrations already applied locally per
`wrangler d1 migrations apply avd-content --local`). Astro does not expose
actions on `window`, so drive the check from a temporary inline module
script instead of the browser console. Add this scratch block to the bottom
of `apps/admin/src/pages/cats/index.astro`'s template (delete it again
before Step 3's commit):

```astro
<script type="module">
  import { actions } from 'astro:actions';
  const fd = new FormData();
  fd.append('catId', 'test-cat-id');
  fd.append('file', new File(['x'], 'a.webp', { type: 'image/webp' }));
  fd.append('width', '800');
  fd.append('height', '600');
  const { data, error } = await actions.images.upload(fd);
  console.log(data, error);
</script>
```

Reload `/cats` and check the browser console. Expected: `error` is
`undefined` only if `test-cat-id` exists in local D1 (it will not yet — Task
8 adds `cats.create`'s UI); an `ActionError` with a D1 foreign-key message is
an acceptable result here, since it proves the action reached the repository
layer. Remove the scratch `<script>` block once this check passes — it is
not part of the deliverable. This is a smoke check, not the full manual QA
pass (Task 11 does that once the UI exists and drives the same action
through the real `image-manager.tsx` upload flow).

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/actions/index.ts
git commit -m "feat(admin): add images upload/update/remove/setCover actions"
```

---

### Task 7: Cats list page

**Files:**
- Modify: `apps/admin/src/pages/cats/index.astro` (replaces the Phase 4 read-only table)

**Interfaces:**
- Consumes: `listAllCats` from `@avd/content/cats`, `createDb`, `imageUrl` from `@avd/content/image-url`, `Badge` and `CatStatus` from `@avd/design-system`, `admin-layout.astro` (Phase 4), `CAT_STATUS_LABELS_CA` from `./status-labels` (Phase 4 Task 8, `src/pages/cats/status-labels.ts`).
- Produces: nothing consumed by later tasks (leaf page), but links to `/cats/new` (Task 8) and `/cats/<id>` (Task 8).

- [ ] **Step 1: Write the page**

Phase 4 Task 8 already created this file as a read-only table (no filter, no
cover thumbnail, no published flag, no edit link) using
`CAT_STATUS_LABELS_CA` from `./status-labels.ts` for the `Badge` label.
Phase 2's schema types `cats.status` as `CatStatus` (a literal union, via
Drizzle's `.$type<>()`), so `<Badge status={cat.status} />` already
type-checks without a narrowing helper — this task keeps reusing
`CAT_STATUS_LABELS_CA` rather than redeclaring the same four labels locally,
and replaces the rest of Phase 4's file with the richer table below:

```astro
---
// apps/admin/src/pages/cats/index.astro
import AdminLayout from '../../layouts/admin-layout.astro';
import { createDb, listAllCats } from '@avd/content/cats';
import { imageUrl } from '@avd/content/image-url';
import { Badge } from '@avd/design-system';
import type { CatStatus } from '@avd/design-system';
import { CAT_STATUS_LABELS_CA } from './status-labels';

export const prerender = false;

const env = Astro.locals.runtime.env;
const db = createDb(env.DB);
const allCats = await listAllCats(db);

const statusParam = Astro.url.searchParams.get('status');
const validStatuses = Object.keys(CAT_STATUS_LABELS_CA) as CatStatus[];
const activeStatus = validStatuses.includes(statusParam as CatStatus)
  ? (statusParam as CatStatus)
  : null;

const cats = activeStatus
  ? allCats.filter((cat) => cat.status === activeStatus)
  : allCats;

const origin = import.meta.env.PUBLIC_IMAGES_ORIGIN;
---

<AdminLayout title="Gats">
  <div class="mb-6 flex items-center justify-between">
    <h1 class="font-semibold text-2xl text-text">Gats</h1>
    <a
      class="rounded-lg bg-primary px-4 py-2 font-semibold text-sm text-surface hover:bg-primary-dark"
      href="/cats/new"
    >
      Nou gat
    </a>
  </div>

  <form class="mb-4 flex items-center gap-2" method="get">
    <label class="text-sm text-text-muted" for="status-filter">
      Filtra per estat
    </label>
    <select
      class="rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text"
      id="status-filter"
      name="status"
      onchange="this.form.submit()"
    >
      <option value="" selected={!activeStatus}>Tots</option>
      {
        validStatuses.map((status) => (
          <option selected={status === activeStatus} value={status}>
            {CAT_STATUS_LABELS_CA[status]}
          </option>
        ))
      }
    </select>
  </form>

  {
    cats.length === 0 ? (
      <p class="text-text-muted">No hi ha gats per mostrar.</p>
    ) : (
      <table class="w-full border-collapse text-left text-sm">
        <thead>
          <tr class="border-primary/10 border-b text-text-muted">
            <th class="py-2 pr-4" scope="col">Foto</th>
            <th class="py-2 pr-4" scope="col">Nom (CA)</th>
            <th class="py-2 pr-4" scope="col">Nom (ES)</th>
            <th class="py-2 pr-4" scope="col">Estat</th>
            <th class="py-2 pr-4" scope="col">Publicat</th>
            <th class="py-2 pr-4" scope="col">Actualitzat</th>
            <th class="py-2 pr-4" scope="col">
              <span class="sr-only">Accions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {cats.map((cat) => (
            <tr class="border-primary/10 border-b">
              <td class="py-2 pr-4">
                {cat.coverImage ? (
                  <img
                    alt={cat.coverImage.altCa || cat.nameCa}
                    class="h-24 w-24 rounded-lg object-cover"
                    height={96}
                    src={imageUrl(cat.coverImage.r2Key, 320, origin)}
                    width={96}
                  />
                ) : (
                  <div class="flex h-24 w-24 items-center justify-center rounded-lg bg-primary/5 text-text-muted text-xs">
                    Sense foto
                  </div>
                )}
              </td>
              <td class="py-2 pr-4 text-text">{cat.nameCa}</td>
              <td class="py-2 pr-4 text-text">{cat.nameEs}</td>
              <td class="py-2 pr-4">
                <Badge
                  label={CAT_STATUS_LABELS_CA[cat.status]}
                  status={cat.status}
                />
              </td>
              <td class="py-2 pr-4">
                <span
                  class={`inline-block rounded-full px-2 py-0.5 text-xs ${
                    cat.published
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {cat.published ? 'Publicat' : 'Esborrany'}
                </span>
              </td>
              <td class="py-2 pr-4 text-text-muted text-xs">
                {cat.updatedAt} · {cat.updatedBy}
              </td>
              <td class="py-2 pr-4">
                <a
                  class="font-medium text-primary text-sm hover:underline"
                  href={`/cats/${cat.id}`}
                >
                  Edita
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }
</AdminLayout>
```

- [ ] **Step 2: Manually verify**

Run: `pnpm --filter admin exec astro dev --port 4322`, sign in, visit
`/cats`. Expected: table renders (empty state if local D1 has no cats yet),
`?status=adopted` filters rows, "Nou gat" links to `/cats/new` (404 until
Task 8).

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/pages/cats/index.astro
git commit -m "feat(admin): build cats list page with status filter"
```

---

### Task 8: `cat-form.tsx` island + create/edit pages

**Files:**
- Create: `apps/admin/src/components/cat-form.tsx`
- Create: `apps/admin/src/pages/cats/new.astro`
- Create: `apps/admin/src/pages/cats/[id].astro`

**Interfaces:**
- Consumes: `actions.cats.create` / `actions.cats.update` (Task 5/6), `emptyCatInput`/`catToInput`/`formStateToInput`/`deriveSlugs`/`inputErrorsToFieldErrors`/`CatFormState` (Task 3), `renderPreview` (Task 4), `CAT_STATUSES`/`CAT_GENDERS`/`CAT_SIZES`/`CAT_PERSONALITIES`/`CAT_GOOD_WITH`/`CAT_HEALTH_STATUSES` from `@avd/content/validate`, `Button`/`Field`/`Input` from `@avd/design-system`.
- Produces: `<CatForm client:load mode="create" />` and `<CatForm client:load mode="edit" cat={...} />`, consumed directly by the two pages in this task; `[id].astro` also renders `<ImageManager>` (Task 9) and `<DeleteCatButton>` (Task 10) once those tasks land — this task's `[id].astro` includes those two elements already so it does not need a second edit pass; Task 9/10 only add the component files those tags import.

- [ ] **Step 1: Write the `cat-form.tsx` island**

```tsx
// apps/admin/src/components/cat-form.tsx
import { useState } from 'react';
import { actions, isInputError } from 'astro:actions';
import { Button, Field, Input } from '@avd/design-system';
import {
  CAT_GENDERS,
  CAT_GOOD_WITH,
  CAT_HEALTH_STATUSES,
  CAT_PERSONALITIES,
  CAT_SIZES,
  CAT_STATUSES,
} from '@avd/content/validate';
import type { CatWithImages } from '@avd/content/cats';
import {
  catToInput,
  deriveSlugs,
  emptyCatInput,
  formStateToInput,
  inputErrorsToFieldErrors,
  type CatFormState,
} from '../lib/cat-form';
import { renderPreview } from '../lib/markdoc-preview';

// These labels intentionally restore the accents keystatic.config.tsx's
// select/multiselect option labels omit (e.g. "Timid", "Afectuos",
// "Curios") — the admin form is new, so it uses correct Catalan
// orthography rather than copying that ASCII-only shortcut forward.

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  adopted: 'Adoptat',
  treatment: 'En tractament',
  unavailable: 'No disponible',
};

const GENDER_LABELS: Record<string, string> = {
  male: 'Mascle',
  female: 'Femella',
};

const SIZE_LABELS: Record<string, string> = {
  small: 'Petit',
  medium: 'Mitjà',
  large: 'Gran',
};

const HEALTH_STATUS_LABELS: Record<string, string> = {
  healthy: 'Sa',
  treatment: 'En tractament',
  'special-needs': 'Necessitats especials',
};

const PERSONALITY_LABELS: Record<string, string> = {
  playful: 'Juganer',
  calm: 'Tranquil',
  shy: 'Tímid',
  affectionate: 'Afectuós',
  independent: 'Independent',
  social: 'Social',
  curious: 'Curiós',
  protective: 'Protector',
};

const GOOD_WITH_LABELS: Record<string, string> = {
  children: 'Nens',
  'other-cats': 'Altres gats',
  dogs: 'Gossos',
  elderly: 'Gent gran',
};

export interface CatFormProps {
  mode: 'create' | 'edit';
  cat?: CatWithImages;
}

export default function CatForm({ mode, cat }: CatFormProps) {
  const [state, setState] = useState<CatFormState>(() =>
    cat ? catToInput(cat) : emptyCatInput(),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [previewCa, setPreviewCa] = useState(false);
  const [previewEs, setPreviewEs] = useState(false);

  function update<K extends keyof CatFormState>(key: K, value: CatFormState[K]) {
    setState((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'nameCa' || key === 'nameEs') {
        const slugs = deriveSlugs(next.nameCa, next.nameEs, {
          slugCa: next.slugCa,
          slugEs: next.slugEs,
          slugsEditedManually: next.slugsEditedManually,
        });
        return { ...next, ...slugs };
      }
      return next;
    });
  }

  function toggleListValue(key: 'personality' | 'goodWith', value: string) {
    setState((prev) => {
      const list = prev[key];
      const next = list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value];
      return { ...prev, [key]: next };
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setServerError('');
    setFieldErrors({});
    setSubmitting(true);

    const input = formStateToInput({
      ...state,
      slugCa: state.slugCa.trim(),
      slugEs: state.slugEs.trim(),
    });

    const { data, error } =
      mode === 'create'
        ? await actions.cats.create(input as never)
        : await actions.cats.update({ id: cat!.id, data: input as never });

    setSubmitting(false);

    if (isInputError(error)) {
      // In edit mode, cats.update's input is { id, data: catInputSchema },
      // so Zod reports field paths as "data.nameCa" — strip that prefix so
      // <Field error={fieldErrors.nameCa}> below finds the same key in
      // both create and edit mode.
      setFieldErrors(inputErrorsToFieldErrors(error.fields, mode));
      return;
    }
    if (error) {
      setServerError(error.message || 'Hi ha hagut un error inesperat.');
      return;
    }
    if (data) {
      window.location.assign(`/cats/${data.id}`);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      {serverError ? (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 text-sm" role="alert">
          {serverError}
        </div>
      ) : null}

      <fieldset className="mb-8">
        <legend className="mb-3 font-semibold text-lg text-text">
          Identitat
        </legend>
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          <Field error={fieldErrors.nameCa} id="cat-name-ca" label="Nom (CA)">
            <Input
              id="cat-name-ca"
              onChange={(event) => update('nameCa', event.currentTarget.value)}
              required
              value={state.nameCa}
            />
          </Field>
          <Field error={fieldErrors.nameEs} id="cat-name-es" label="Nom (ES)">
            <Input
              id="cat-name-es"
              onChange={(event) => update('nameEs', event.currentTarget.value)}
              required
              value={state.nameEs}
            />
          </Field>
          <Field error={fieldErrors.slugCa} id="cat-slug-ca" label="Slug (CA)">
            <Input
              id="cat-slug-ca"
              onChange={(event) => {
                setState((prev) => ({
                  ...prev,
                  slugCa: event.currentTarget.value,
                  slugsEditedManually: true,
                }));
              }}
              required
              value={state.slugCa}
            />
          </Field>
          <Field error={fieldErrors.slugEs} id="cat-slug-es" label="Slug (ES)">
            <Input
              id="cat-slug-es"
              onChange={(event) => {
                setState((prev) => ({
                  ...prev,
                  slugEs: event.currentTarget.value,
                  slugsEditedManually: true,
                }));
              }}
              required
              value={state.slugEs}
            />
          </Field>
          <Field error={fieldErrors.raceCa} id="cat-race-ca" label="Raça (CA)">
            <Input
              id="cat-race-ca"
              onChange={(event) => update('raceCa', event.currentTarget.value)}
              value={state.raceCa}
            />
          </Field>
          <Field error={fieldErrors.raceEs} id="cat-race-es" label="Raza (ES)">
            <Input
              id="cat-race-es"
              onChange={(event) => update('raceEs', event.currentTarget.value)}
              value={state.raceEs}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="mb-8">
        <legend className="mb-3 font-semibold text-lg text-text">
          Característiques
        </legend>
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          <div className="mb-5">
            <label className="mb-1 block font-medium text-sm text-text" htmlFor="cat-status">
              Estat
            </label>
            <select
              className="w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text"
              id="cat-status"
              onChange={(event) => update('status', event.currentTarget.value)}
              value={state.status}
            >
              {CAT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABELS[value] ?? value}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-5">
            <label className="mb-1 block font-medium text-sm text-text" htmlFor="cat-gender">
              Gènere
            </label>
            <select
              className="w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text"
              id="cat-gender"
              onChange={(event) => update('gender', event.currentTarget.value)}
              value={state.gender}
            >
              {CAT_GENDERS.map((value) => (
                <option key={value} value={value}>
                  {GENDER_LABELS[value] ?? value}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-5">
            <label className="mb-1 block font-medium text-sm text-text" htmlFor="cat-size">
              Mida
            </label>
            <select
              className="w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text"
              id="cat-size"
              onChange={(event) => update('size', event.currentTarget.value)}
              value={state.size}
            >
              {CAT_SIZES.map((value) => (
                <option key={value} value={value}>
                  {SIZE_LABELS[value] ?? value}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-5">
            <label className="mb-1 block font-medium text-sm text-text" htmlFor="cat-health-status">
              Estat de salut
            </label>
            <select
              className="w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text"
              id="cat-health-status"
              onChange={(event) => update('healthStatus', event.currentTarget.value)}
              value={state.healthStatus}
            >
              {CAT_HEALTH_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {HEALTH_STATUS_LABELS[value] ?? value}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-5">
            <label className="mb-1 block font-medium text-sm text-text" htmlFor="cat-age">
              Edat (anys)
            </label>
            <input
              className="w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text"
              id="cat-age"
              min={0}
              onChange={(event) => update('age', event.currentTarget.value)}
              type="number"
              value={state.age}
            />
          </div>
          <div className="mb-5">
            <label className="mb-1 block font-medium text-sm text-text" htmlFor="cat-weight">
              Pes (kg)
            </label>
            <input
              className="w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text"
              id="cat-weight"
              min={0}
              onChange={(event) => update('weight', event.currentTarget.value)}
              step="0.1"
              type="number"
              value={state.weight}
            />
          </div>
        </div>

        <div className="mb-5">
          <span className="mb-1 block font-medium text-sm text-text">
            Personalitat
          </span>
          <div className="flex flex-wrap gap-3">
            {CAT_PERSONALITIES.map((value) => (
              <label className="flex items-center gap-1.5 text-sm text-text" key={value}>
                <input
                  checked={state.personality.includes(value)}
                  onChange={() => toggleListValue('personality', value)}
                  type="checkbox"
                />
                {PERSONALITY_LABELS[value] ?? value}
              </label>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <span className="mb-1 block font-medium text-sm text-text">
            Es porta bé amb
          </span>
          <div className="flex flex-wrap gap-3">
            {CAT_GOOD_WITH.map((value) => (
              <label className="flex items-center gap-1.5 text-sm text-text" key={value}>
                <input
                  checked={state.goodWith.includes(value)}
                  onChange={() => toggleListValue('goodWith', value)}
                  type="checkbox"
                />
                {GOOD_WITH_LABELS[value] ?? value}
              </label>
            ))}
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-6">
          <label className="flex items-center gap-1.5 text-sm text-text">
            <input
              checked={state.vaccinated}
              onChange={(event) => update('vaccinated', event.currentTarget.checked)}
              type="checkbox"
            />
            Vacunat
          </label>
          <label className="flex items-center gap-1.5 text-sm text-text">
            <input
              checked={state.microchipped}
              onChange={(event) => update('microchipped', event.currentTarget.checked)}
              type="checkbox"
            />
            Microxipat
          </label>
          <label className="flex items-center gap-1.5 text-sm text-text">
            <input
              checked={state.sterilized}
              onChange={(event) => update('sterilized', event.currentTarget.checked)}
              type="checkbox"
            />
            Esterilitzat
          </label>
        </div>

        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          <div className="mb-5">
            <label className="mb-1 block font-medium text-sm text-text" htmlFor="cat-rescue-date">
              Data de rescat
            </label>
            <input
              className="w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text"
              id="cat-rescue-date"
              onChange={(event) => update('rescueDate', event.currentTarget.value)}
              type="date"
              value={state.rescueDate}
            />
          </div>
          <div className="mb-5">
            <label className="mb-1 block font-medium text-sm text-text" htmlFor="cat-adoption-date">
              Data d'adopció
            </label>
            <input
              className="w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text"
              id="cat-adoption-date"
              onChange={(event) => update('adoptionDate', event.currentTarget.value)}
              type="date"
              value={state.adoptionDate}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="mb-8">
        <legend className="mb-3 font-semibold text-lg text-text">
          Textos
        </legend>
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          <Field
            error={fieldErrors.shortDescriptionCa}
            id="cat-short-description-ca"
            label="Descripció curta (CA)"
          >
            <Input
              id="cat-short-description-ca"
              onChange={(event) => update('shortDescriptionCa', event.currentTarget.value)}
              type="textarea"
              value={state.shortDescriptionCa}
            />
          </Field>
          <Field
            error={fieldErrors.shortDescriptionEs}
            id="cat-short-description-es"
            label="Descripción corta (ES)"
          >
            <Input
              id="cat-short-description-es"
              onChange={(event) => update('shortDescriptionEs', event.currentTarget.value)}
              type="textarea"
              value={state.shortDescriptionEs}
            />
          </Field>
          <Field
            error={fieldErrors.specialNeedsCa}
            id="cat-special-needs-ca"
            label="Necessitats especials (CA)"
          >
            <Input
              id="cat-special-needs-ca"
              onChange={(event) => update('specialNeedsCa', event.currentTarget.value)}
              type="textarea"
              value={state.specialNeedsCa}
            />
          </Field>
          <Field
            error={fieldErrors.specialNeedsEs}
            id="cat-special-needs-es"
            label="Necesidades especiales (ES)"
          >
            <Input
              id="cat-special-needs-es"
              onChange={(event) => update('specialNeedsEs', event.currentTarget.value)}
              type="textarea"
              value={state.specialNeedsEs}
            />
          </Field>
          <Field
            error={fieldErrors.observationsCa}
            id="cat-observations-ca"
            label="Observacions (CA)"
          >
            <Input
              id="cat-observations-ca"
              onChange={(event) => update('observationsCa', event.currentTarget.value)}
              type="textarea"
              value={state.observationsCa}
            />
          </Field>
          <Field
            error={fieldErrors.observationsEs}
            id="cat-observations-es"
            label="Observaciones (ES)"
          >
            <Input
              id="cat-observations-es"
              onChange={(event) => update('observationsEs', event.currentTarget.value)}
              type="textarea"
              value={state.observationsEs}
            />
          </Field>
        </div>

        <div className="mb-5">
          <div className="mb-1 flex items-center justify-between">
            <label className="font-medium text-sm text-text" htmlFor="cat-description-ca">
              Descripció (CA) — Markdoc
            </label>
            <button
              className="text-primary text-xs hover:underline"
              onClick={() => setPreviewCa((v) => !v)}
              type="button"
            >
              {previewCa ? 'Amaga la vista prèvia' : 'Mostra la vista prèvia'}
            </button>
          </div>
          <textarea
            className="w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text"
            id="cat-description-ca"
            onChange={(event) => update('descriptionCa', event.currentTarget.value)}
            rows={8}
            value={state.descriptionCa}
          />
          {previewCa ? (
            <div
              className="mt-2 rounded-lg border border-primary/10 bg-primary/5 p-4 text-sm text-text"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: renderPreview() runs Markdoc.renderers.html on volunteer-authored Markdoc, same trust boundary as the public site's renderMarkdoc.
              dangerouslySetInnerHTML={{ __html: renderPreview(state.descriptionCa) }}
            />
          ) : null}
        </div>

        <div className="mb-5">
          <div className="mb-1 flex items-center justify-between">
            <label className="font-medium text-sm text-text" htmlFor="cat-description-es">
              Descripción (ES) — Markdoc
            </label>
            <button
              className="text-primary text-xs hover:underline"
              onClick={() => setPreviewEs((v) => !v)}
              type="button"
            >
              {previewEs ? 'Amaga la vista prèvia' : 'Mostra la vista prèvia'}
            </button>
          </div>
          <textarea
            className="w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text"
            id="cat-description-es"
            onChange={(event) => update('descriptionEs', event.currentTarget.value)}
            rows={8}
            value={state.descriptionEs}
          />
          {previewEs ? (
            <div
              className="mt-2 rounded-lg border border-primary/10 bg-primary/5 p-4 text-sm text-text"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: renderPreview() runs Markdoc.renderers.html on volunteer-authored Markdoc, same trust boundary as the public site's renderMarkdoc.
              dangerouslySetInnerHTML={{ __html: renderPreview(state.descriptionEs) }}
            />
          ) : null}
        </div>
      </fieldset>

      <fieldset className="mb-8">
        <legend className="mb-3 font-semibold text-lg text-text">SEO</legend>
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          <Field id="cat-seo-title-ca" label="Meta títol (CA)">
            <Input
              id="cat-seo-title-ca"
              onChange={(event) => update('seoTitleCa', event.currentTarget.value)}
              value={state.seoTitleCa}
            />
          </Field>
          <Field id="cat-seo-title-es" label="Meta título (ES)">
            <Input
              id="cat-seo-title-es"
              onChange={(event) => update('seoTitleEs', event.currentTarget.value)}
              value={state.seoTitleEs}
            />
          </Field>
          <Field id="cat-seo-description-ca" label="Meta descripció (CA)">
            <Input
              id="cat-seo-description-ca"
              onChange={(event) => update('seoDescriptionCa', event.currentTarget.value)}
              type="textarea"
              value={state.seoDescriptionCa}
            />
          </Field>
          <Field id="cat-seo-description-es" label="Meta descripción (ES)">
            <Input
              id="cat-seo-description-es"
              onChange={(event) => update('seoDescriptionEs', event.currentTarget.value)}
              type="textarea"
              value={state.seoDescriptionEs}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="mb-8">
        <legend className="mb-3 font-semibold text-lg text-text">
          Publicació
        </legend>
        <div className="mb-5">
          <label className="mb-1 block font-medium text-sm text-text" htmlFor="cat-sort-order">
            Ordre
          </label>
          <input
            className="w-40 rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text"
            id="cat-sort-order"
            onChange={(event) => update('sortOrder', event.currentTarget.value)}
            type="number"
            value={state.sortOrder}
          />
        </div>
        <div className="mb-5 flex flex-wrap gap-6">
          <label className="flex items-center gap-1.5 text-sm text-text">
            <input
              checked={state.featured}
              onChange={(event) => update('featured', event.currentTarget.checked)}
              type="checkbox"
            />
            Destacat
          </label>
          <label className="flex items-center gap-1.5 text-sm text-text">
            <input
              checked={state.published}
              onChange={(event) => update('published', event.currentTarget.checked)}
              type="checkbox"
            />
            Publicat (visible al lloc web)
          </label>
        </div>
      </fieldset>

      <Button disabled={submitting} type="submit">
        {submitting
          ? 'Desant…'
          : mode === 'create'
            ? 'Crea el gat'
            : 'Desa els canvis'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Write `cats/new.astro`**

```astro
---
// apps/admin/src/pages/cats/new.astro
import AdminLayout from '../../layouts/admin-layout.astro';
import CatForm from '../../components/cat-form';

export const prerender = false;
---

<AdminLayout title="Nou gat">
  <h1 class="mb-6 font-semibold text-2xl text-text">Nou gat</h1>
  <CatForm client:load mode="create" />
</AdminLayout>
```

- [ ] **Step 3: Write `cats/[id].astro`**

```astro
---
// apps/admin/src/pages/cats/[id].astro
import AdminLayout from '../../layouts/admin-layout.astro';
import CatForm from '../../components/cat-form';
import ImageManager from '../../components/image-manager';
import DeleteCatButton from '../../components/delete-cat-button';
import { createDb, getCatById } from '@avd/content/cats';

export const prerender = false;

const { id } = Astro.params;
if (!id) {
  return new Response(null, { status: 404 });
}

const env = Astro.locals.runtime.env;
const db = createDb(env.DB);
const cat = await getCatById(db, id);

if (!cat) {
  return new Response(null, { status: 404 });
}
---

<AdminLayout title={`Edita ${cat.nameCa}`}>
  <div class="mb-6 flex items-center justify-between">
    <h1 class="font-semibold text-2xl text-text">Edita {cat.nameCa}</h1>
    <DeleteCatButton catId={cat.id} client:load />
  </div>
  <CatForm cat={cat} client:load mode="edit" />
  <hr class="my-10 border-primary/10" />
  <h2 class="mb-4 font-semibold text-xl text-text">Fotos</h2>
  <ImageManager
    catId={cat.id}
    client:load
    coverImageId={cat.coverImage?.id ?? null}
    images={cat.images}
  />
</AdminLayout>
```

`Astro.locals.runtime` is the Phase 4 `@astrojs/cloudflare` adapter-v12
shape (`context.locals.runtime.env`), matching `research/astro-admin-capabilities.md` §4.

- [ ] **Step 4: Manually verify**

Run: `pnpm --filter admin exec astro dev --port 4322`. Visit `/cats/new`,
fill in the required CA/ES names, submit; expect a redirect to
`/cats/<new-id>` (the edit page will 404 until Task 9's `ImageManager` and
Task 10's `DeleteCatButton` files exist — create placeholder-free versions of
both in the next two tasks before considering this task's manual check
complete). Confirm slugs auto-fill from the CA/ES names and stop auto-filling
once hand-edited.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/components/cat-form.tsx apps/admin/src/pages/cats/new.astro apps/admin/src/pages/cats/\[id\].astro
git commit -m "feat(admin): add cat create/edit form and pages"
```

---

### Task 9: `image-manager.tsx` island

**Files:**
- Create: `apps/admin/src/components/image-manager.tsx`

**Interfaces:**
- Consumes: `actions.images.{upload,update,remove,setCover}` (Task 6), `moveImage`/`withPositions` (Task 2), `validateUploadFile` (Task 1), `imageUrl` from `@avd/content/image-url`, `MAX_UPLOAD_EDGE` from `@avd/content/image-url`, `CatImage` type from `@avd/content/cats`, `Button` from `@avd/design-system`, `browser-image-compression`.
- Produces: `<ImageManager catId images coverImageId />`, already wired into Task 8's `[id].astro`.

- [ ] **Step 1: Write the component**

```tsx
// apps/admin/src/components/image-manager.tsx
import { useState } from 'react';
import { actions } from 'astro:actions';
import imageCompression from 'browser-image-compression';
import { Button } from '@avd/design-system';
import { MAX_UPLOAD_EDGE, imageUrl } from '@avd/content/image-url';
import type { CatImage } from '@avd/content/cats';
import { moveImage, withPositions } from '../lib/gallery';
import { validateUploadFile } from '../lib/image-upload';

export interface ImageManagerProps {
  catId: string;
  images: CatImage[];
  coverImageId: string | null;
}

interface UploadProgressItem {
  name: string;
  status: 'compressing' | 'uploading' | 'done' | 'error';
  message?: string;
}

const origin = import.meta.env.PUBLIC_IMAGES_ORIGIN;

export default function ImageManager({
  catId,
  images: initialImages,
  coverImageId: initialCoverImageId,
}: ImageManagerProps) {
  const [images, setImages] = useState<CatImage[]>(
    [...initialImages].sort((a, b) => a.position - b.position),
  );
  const [coverImageId, setCoverImageId] = useState(initialCoverImageId);
  const [uploads, setUploads] = useState<UploadProgressItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  function move(index: number, direction: -1 | 1) {
    setImages((prev) => moveImage(prev, index, index + direction));
  }

  function updateAlt(id: string, field: 'altCa' | 'altEs', value: string) {
    setImages((prev) =>
      prev.map((image) =>
        image.id === id ? { ...image, [field]: value } : image,
      ),
    );
  }

  async function removeImage(id: string) {
    if (!window.confirm('Segur que vols eliminar aquesta foto?')) return;
    const { error } = await actions.images.remove({ imageId: id });
    if (error) {
      setSaveMessage(`Error eliminant la foto: ${error.message}`);
      return;
    }
    setImages((prev) => prev.filter((image) => image.id !== id));
    if (coverImageId === id) {
      setCoverImageId(null);
      await actions.images.setCover({ catId, imageId: null });
    }
  }

  async function saveOrderAndAlts() {
    setSaving(true);
    setSaveMessage('');
    const positioned = withPositions(images);
    setImages(positioned);
    const { error } = await actions.images.update({
      catId,
      images: positioned.map((image) => ({
        id: image.id,
        altCa: image.altCa,
        altEs: image.altEs,
        position: image.position,
      })),
    });
    setSaving(false);
    setSaveMessage(error ? `Error desant: ${error.message}` : 'Desat.');
  }

  async function setCover(id: string) {
    setCoverImageId(id);
    const { error } = await actions.images.setCover({ catId, imageId: id });
    if (error) setSaveMessage(`Error triant la portada: ${error.message}`);
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    for (const file of files) {
      setUploads((prev) => [...prev, { name: file.name, status: 'compressing' }]);

      let compressed: File;
      try {
        compressed = await imageCompression(file, {
          maxWidthOrHeight: MAX_UPLOAD_EDGE,
          fileType: 'image/webp',
          initialQuality: 0.82,
          useWebWorker: true,
        });
      } catch {
        setUploads((prev) =>
          prev.map((item) =>
            item.name === file.name
              ? { ...item, status: 'error', message: 'No s\'ha pogut comprimir la imatge.' }
              : item,
          ),
        );
        continue;
      }

      const validation = validateUploadFile({
        type: compressed.type,
        size: compressed.size,
      });
      if (!validation.ok) {
        setUploads((prev) =>
          prev.map((item) =>
            item.name === file.name
              ? {
                  ...item,
                  status: 'error',
                  message:
                    validation.reason === 'type'
                      ? 'Format no vàlid.'
                      : 'Fitxer massa gran.',
                }
              : item,
          ),
        );
        continue;
      }

      const dimensions = await readImageDimensions(compressed);

      setUploads((prev) =>
        prev.map((item) =>
          item.name === file.name ? { ...item, status: 'uploading' } : item,
        ),
      );

      const formData = new FormData();
      formData.append('catId', catId);
      formData.append('file', compressed, file.name);
      formData.append('width', String(dimensions.width));
      formData.append('height', String(dimensions.height));

      const { data, error } = await actions.images.upload(formData);

      if (error || !data) {
        setUploads((prev) =>
          prev.map((item) =>
            item.name === file.name
              ? {
                  ...item,
                  status: 'error',
                  message: error?.message ?? 'Error pujant la imatge.',
                }
              : item,
          ),
        );
        continue;
      }

      setImages((prev) => [...prev, data]);
      setUploads((prev) =>
        prev.map((item) =>
          item.name === file.name ? { ...item, status: 'done' } : item,
        ),
      );
    }
  }

  return (
    <div>
      {saveMessage ? (
        <div className="mb-4 rounded-lg bg-primary/5 p-3 text-sm text-text" role="alert">
          {saveMessage}
        </div>
      ) : null}

      <ul className="mb-6 space-y-4">
        {images.map((image, index) => (
          <li
            className="flex flex-col gap-3 rounded-lg border border-primary/10 p-4 md:flex-row md:items-start"
            key={image.id}
          >
            <img
              alt={image.altCa || image.altEs || 'Foto del gat'}
              className="h-32 w-32 shrink-0 rounded-lg object-cover"
              height={128}
              src={imageUrl(image.r2Key, 320, origin)}
              width={128}
            />
            <div className="flex-1">
              <div className="mb-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block text-sm text-text" htmlFor={`alt-ca-${image.id}`}>
                  Text alternatiu (CA)
                  <input
                    className="mt-1 w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text"
                    id={`alt-ca-${image.id}`}
                    onChange={(event) => updateAlt(image.id, 'altCa', event.currentTarget.value)}
                    value={image.altCa}
                  />
                </label>
                <label className="block text-sm text-text" htmlFor={`alt-es-${image.id}`}>
                  Texto alternativo (ES)
                  <input
                    className="mt-1 w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text"
                    id={`alt-es-${image.id}`}
                    onChange={(event) => updateAlt(image.id, 'altEs', event.currentTarget.value)}
                    value={image.altEs}
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 text-sm text-text">
                  <input
                    checked={coverImageId === image.id}
                    name="cover-image"
                    onChange={() => setCover(image.id)}
                    type="radio"
                  />
                  Portada
                </label>
                <button
                  className="text-sm text-text-muted hover:text-text disabled:opacity-40"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  type="button"
                >
                  ↑ Mou amunt
                </button>
                <button
                  className="text-sm text-text-muted hover:text-text disabled:opacity-40"
                  disabled={index === images.length - 1}
                  onClick={() => move(index, 1)}
                  type="button"
                >
                  ↓ Mou avall
                </button>
                <button
                  className="text-red-600 text-sm hover:underline"
                  onClick={() => removeImage(image.id)}
                  type="button"
                >
                  Elimina
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Button disabled={saving} onClick={saveOrderAndAlts} type="button">
        {saving ? 'Desant…' : "Desa l'ordre i els textos alternatius"}
      </Button>

      <div className="mt-8">
        <label className="mb-1 block font-medium text-sm text-text" htmlFor="cat-image-upload">
          Afegeix fotos
        </label>
        <input
          accept="image/*"
          id="cat-image-upload"
          multiple
          onChange={(event) => handleFiles(event.currentTarget.files)}
          type="file"
        />
        {uploads.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm">
            {uploads.map((item) => (
              <li key={item.name}>
                {item.name} —{' '}
                {item.status === 'compressing' && 'comprimint…'}
                {item.status === 'uploading' && 'pujant…'}
                {item.status === 'done' && 'fet'}
                {item.status === 'error' && `error: ${item.message}`}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return createImageBitmap(file).then((bitmap) => {
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  });
}
```

- [ ] **Step 2: Manually verify**

Run: `pnpm --filter admin exec astro dev --port 4322`. On `/cats/<id>`,
upload a JPEG or PNG through the file input; expect it to appear resized to
WebP in the list after upload (network tab shows a WebP `multipart/form-data`
POST to the `images.upload` action). Reorder with the up/down buttons,
change an alt text, click "Desa l'ordre…", refresh, and confirm the order
and alt text persisted. Set a different photo as cover and confirm the radio
moves. Remove a photo and confirm it disappears and, if it was the cover,
the cover clears.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/components/image-manager.tsx
git commit -m "feat(admin): add image manager island with browser-side resize"
```

---

### Task 10: Delete button, dev R2 route, `.env.development`

**Files:**
- Create: `apps/admin/src/components/delete-cat-button.tsx`
- Create: `apps/admin/src/pages/r2/[...key].ts`
- Create: `apps/admin/.env.development`
- Modify: `apps/admin/.dev.vars.example`

**Interfaces:**
- Consumes: `actions.cats.delete` (Task 5), `Button` from `@avd/design-system`.
- Produces: `<DeleteCatButton catId />`, already wired into Task 8's `[id].astro`. `GET /r2/[...key]` dev-only image stream, referenced by `PUBLIC_IMAGES_ORIGIN=http://localhost:4322/r2` for local previews of `imageUrl()` output.

- [ ] **Step 1: Write `delete-cat-button.tsx`**

```tsx
// apps/admin/src/components/delete-cat-button.tsx
import { useState } from 'react';
import { actions } from 'astro:actions';
import { Button } from '@avd/design-system';

export interface DeleteCatButtonProps {
  catId: string;
}

export default function DeleteCatButton({ catId }: DeleteCatButtonProps) {
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !window.confirm(
        'Segur que vols eliminar aquest gat i totes les seves fotos? Aquesta acció no es pot desfer.',
      )
    ) {
      return;
    }
    setDeleting(true);
    setError('');
    const { error: actionError } = await actions.cats.delete({ id: catId });
    if (actionError) {
      setDeleting(false);
      setError(actionError.message || 'No s\'ha pogut eliminar el gat.');
      return;
    }
    window.location.assign('/cats');
  }

  return (
    <div>
      {error ? (
        <p className="mb-2 text-red-600 text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        className="bg-red-700 hover:bg-red-800"
        disabled={deleting}
        onClick={handleDelete}
        type="button"
        variant="primary"
      >
        {deleting ? 'Eliminant…' : 'Elimina el gat'}
      </Button>
    </div>
  );
}
```

`Button`'s `outline` variant (`border-surface/30`, `text-surface`) is styled
for the public site's dark hero sections and would be illegible on the
admin's light `admin.css` background (Phase 4). This button instead uses
`variant="primary"` (solid, readable on light backgrounds) with an added
`bg-red-700 hover:bg-red-800` utility class to signal a destructive action,
overriding `primary`'s default `bg-primary`/`hover:bg-primary-dark`. `Button`
does not declare a `className` prop in the design-system source this plan
read (`git show design-system:packages/design-system/src/primitives/button.tsx`),
so confirm during Task 11's manual pass that the rendered `<button>`/`<a>`
element still accepts a passed-through `className` (React forwards unknown
props by default only when the component spreads `...rest`); if
`design-system`'s `Button` does not spread extra props, wrap it instead:
`<span className="[&>button]:bg-red-700 [&>button]:hover:bg-red-800"><Button variant="primary" ...>…</Button></span>`.

- [ ] **Step 2: Write the dev-only R2 route**

```ts
// apps/admin/src/pages/r2/[...key].ts
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  if (!import.meta.env.DEV) {
    return new Response(null, { status: 404 });
  }

  const key = context.params.key;
  if (!key) {
    return new Response(null, { status: 404 });
  }

  const env = context.locals.runtime.env;
  const object = await env.IMAGES_BUCKET.get(key);
  if (!object) {
    return new Response(null, { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);

  return new Response(object.body, { headers, status: 200 });
};
```

- [ ] **Step 3: Add `.env.development`**

```bash
# apps/admin/.env.development
PUBLIC_IMAGES_ORIGIN=http://localhost:4322/r2
```

This is a `PUBLIC_` build-time variable, so it belongs in Astro/Vite's
`.env.development` (loaded automatically by `astro dev`), not `.dev.vars`
(which is for the Cloudflare runtime's `context.locals.runtime.env` secrets
and bindings — see the spec's Secrets table). Production builds omit this
file and `imageUrl()` falls back to `DEFAULT_IMAGES_ORIGIN` from
`@avd/content/image-url`.

- [ ] **Step 4: Update `.dev.vars.example`**

Confirm `apps/admin/.dev.vars.example` (from Phase 4) does **not** list
`PUBLIC_IMAGES_ORIGIN` — it is a `.env.development` concern, not a
`.dev.vars` one. If Phase 4's example file mistakenly included it, remove
that line and add a one-line comment pointing to `.env.development`:

```bash
# apps/admin/.dev.vars.example
# PUBLIC_IMAGES_ORIGIN is NOT a .dev.vars entry — see apps/admin/.env.development.
BETTER_AUTH_SECRET=change-me
BETTER_AUTH_URL=http://localhost:4322
RESEND_API_KEY=re_your_key_here
AUTH_EMAIL_FROM=Animals Vida Digna <no-reply@animalsvidadigna.org>
ADMIN_ALLOWED_EMAILS=volunteer@example.org
AUTH_INSECURE_COOKIES=1
```

- [ ] **Step 5: Manually verify**

Run: `pnpm --filter admin exec astro dev --port 4322`. Upload a photo
(Task 9), then open its `<img src>` directly in the browser — it should
resolve through `http://localhost:4322/r2/cats/<catId>/<imageId>.webp` and
render the image (via `object.writeHttpMetadata`, its content type is
`image/webp`). Delete a cat from `/cats/<id>` and confirm it redirects to
`/cats` and no longer appears in the list.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/components/delete-cat-button.tsx apps/admin/src/pages/r2 apps/admin/.env.development apps/admin/.dev.vars.example
git commit -m "feat(admin): add delete-cat button and dev-only R2 preview route"
```

---

### Task 11: Manual end-to-end checklist and PR

**Files:** none (verification task).

**Interfaces:** none — this task exercises the full stack built in Tasks 1–10 against local D1/R2 (via `platformProxy`) and, at the end, against the deployed `admin.animalsvidadigna.org` Worker.

- [ ] **Step 1: Run the full automated suite**

```bash
pnpm --filter admin exec vitest run
pnpm --filter admin exec astro check
pnpm turbo build
pnpm turbo test
```

Expected: all green, including the pre-existing `apps/web` tests (this phase
does not touch `apps/web`).

- [ ] **Step 2: Local manual QA on `astro dev --port 4322`**

Apply local migrations and start the dev server:

```bash
pnpm --filter admin exec wrangler d1 migrations apply avd-content --local
pnpm --filter admin exec astro dev --port 4322
```

Walk through, in order, checking each box:

- [ ] Sign in with an allow-listed email (Phase 4 login flow).
- [ ] `/cats` lists cats (empty state if D1 is empty), status filter works via `?status=`.
- [ ] "Nou gat" creates a cat with only the required CA/ES names filled in; redirects to its edit page.
- [ ] Editing every field (identity, characteristics, personality/goodWith checkboxes, dates, texts with Markdoc preview toggle, SEO, publication) and saving keeps all values on reload.
- [ ] Leaving a required field blank surfaces an inline error from `isInputError` without a full-page error.
- [ ] Uploading 2–3 photos (mixed JPEG/PNG) resizes them client-side to WebP ≤2000px edge, uploads sequentially with visible per-file progress, and each appears in the gallery.
- [ ] Reordering photos with ↑/↓ and clicking "Desa l'ordre…" persists the new order after reload.
- [ ] Editing an alt text and saving persists it after reload.
- [ ] Selecting a different cover radio updates the list page's thumbnail (`/cats`).
- [ ] Removing a photo removes it from R2 (`GET /r2/<key>` 404s afterward) and, if it was the cover, clears the cover.
- [ ] Toggling "Publicat" off and confirming the cat still appears in `/cats` (admin sees drafts) — full "invisible on the public site" behavior is verified in Phase 3/6, not here, since `apps/web` reads a separate D1 connection but the same table.
- [ ] Deleting a cat removes its row from `/cats` and its R2 objects (spot-check with `wrangler r2 object get` against the local bucket, or via the dev route 404ing).
- [ ] Deleting a cat leaves no orphaned `cat_images` rows: before deleting, note the cat's `id`; after deleting, run `pnpm --filter admin exec wrangler d1 execute avd-content --local --command "select count(*) from cat_images where cat_id='<id>'"` and confirm the count is `0`. This is a deliberate check, not a formality — Phase 2 flags the `cat_images.cat_id` FK's `ON DELETE CASCADE` as unverified against D1's actual enforcement behavior, and `deleteCat`'s own D1 delete is what this task's `cats.delete` action relies on to return the right `r2Keys` for the R2 cleanup above; if the count is not `0`, the cascade is not enforced and `deleteCat` (Phase 2, `packages/content/src/cats.ts`) needs an explicit `delete from cat_images where cat_id = ?` before deleting the cat row — file that as a Phase 2 bug, not a Phase 5 workaround.
- [ ] Every input has a visible label; tab through the form with keyboard only and confirm focus order is logical; error summaries use `role="alert"`.
- [ ] `PUBLIC_IMAGES_ORIGIN` from `.env.development` is reflected in gallery `<img src>` values (`http://localhost:4322/r2/...`).

- [ ] **Step 3: Production manual QA**

After merging (per the Ordering rules in the plan README, this phase's PR
follows Phase 4's), on `https://admin.animalsvidadigna.org`:

- [ ] Repeat the create → upload → reorder → publish → delete flow once.
- [ ] Confirm uploaded photo URLs resolve through `https://images.animalsvidadigna.org/cdn-cgi/image/...` (production `PUBLIC_IMAGES_ORIGIN` default), not `/r2/...` (the dev-only route 404s in production per its `import.meta.env.DEV` guard).
- [ ] Confirm Cloudflare dashboard shows no new Workers Paid or Images Paid subscription.

- [ ] **Step 4: Open the PR**

```bash
git push -u origin HEAD
gh pr create --title "feat(admin): cats CRUD and image pipeline" --body "$(cat <<'EOF'
## Summary
- Cats list with status filter, cover thumbnail, published flag
- Create/edit form covering every CA/ES field with Markdoc live preview
- Browser-side WebP resize (≤2000px) → Astro Action → R2, with D1
  compensation on upload failure
- Gallery reorder, alt text editing, cover selection, photo removal
- Cat delete (D1 + R2 cascade) with confirm
- Dev-only /r2/[...key] preview route + PUBLIC_IMAGES_ORIGIN local convention

## Test plan
- [x] `pnpm --filter admin exec vitest run`
- [x] `pnpm --filter admin exec astro check`
- [x] `pnpm turbo build && pnpm turbo test`
- [x] Manual QA checklist (Task 11, Steps 2–3) on local dev and production
EOF
)"
```

- [ ] **Step 5: Record completion**

No commit needed for this step — the PR from Step 4 is the deliverable. Once
merged, Phase 6 (`phase-6-cutover-docs.md`) can proceed.

---

## Contract gaps

No open gaps against Phase 2 or Phase 4. This plan was written and then
revised against the actual `phase-2-content-package.md` and
`phase-4-admin-shell-auth.md` documents (not just the spec's Interface
contract), which resolved the two real gaps an earlier draft had to guess
at:

- The `@avd/content` export map is confirmed by Phase 2 Task 1's
  `package.json`: both the bare barrel (`"."` → `src/index.ts`) and the
  per-file subpaths (`./cats`, `./validate`, `./localize`, `./image-url`,
  `./schema`) this plan imports from exist side by side.
- `auth.signOut` is confirmed by Phase 4 Task 8: it calls
  `createAuth(context.locals.runtime.env)` (not `context.locals.auth`,
  which does not exist) and `auth.api.signOut({ headers: context.request.headers })`.
  Tasks 5–6 keep that block byte-for-byte and only add `cats`/`images` to
  `server`.

**`packages/content` additions this phase needed but does not own:** none —
Tasks 1–10 only consume the Repository API, Validation, and Image URL
symbols already listed in the spec's Interface contract and confirmed
present in Phase 2. No new `packages/content` exports were required.

**Design decision recorded, not a gap:** Task 10's delete button uses
`variant="primary"` with an added `bg-red-700 hover:bg-red-800` class rather
than `variant="outline"` (built for the public site's dark hero sections,
illegible on the admin's light background) — see Task 10, Step 1 for the
full rationale and the fallback if `Button` does not forward `className`.
