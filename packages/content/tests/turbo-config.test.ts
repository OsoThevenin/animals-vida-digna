import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards two Phase 1 code-review findings in the root `turbo.json` so they
 * cannot silently regress:
 *
 * - The `test` task must depend on this package's own `build`, not just
 *   `^build` (upstream packages). Without it, `apps/web`'s tests that assert
 *   against `dist/_worker.js` (wrangler-config.test.ts,
 *   worker-bundle-no-keystatic.test.ts) either hard-fail or silently skip on
 *   a fresh clone, and — because `dist/` is gitignored and therefore not a
 *   turbo input — a skipped result can cache and replay green forever.
 * - `PUBLIC_*` and `RESEND_API_KEY` must be declared as env inputs (Turbo 2
 *   runs `envMode: "strict"` by default), or build-time `import.meta.env`
 *   reads are stripped rather than merely miscached -- which stops being
 *   benign once PUBLIC_IMAGES_ORIGIN becomes a build-time variable in
 *   Phase 3.
 * - A root-level `lint` task must exist (Phase 2 code review finding F7):
 *   the root `lint` npm script (`biome check .`) is whole-repo and is not a
 *   turbo task, so it was never covered by any phase's `test`/`build`/
 *   `check` gate. Individual packages opt in by giving themselves their own
 *   `lint` script (see `packages/content/package.json` and
 *   `apps/web/package.json`, both scoped to the files that package has
 *   actually cleaned up) — `pnpm turbo lint` then runs it for every package
 *   that defines one and fails the pipeline if any of them fail.
 */

interface TurboTaskConfig {
  dependsOn?: string[];
  env?: string[];
}

interface TurboConfig {
  globalEnv?: string[];
  tasks: Record<string, TurboTaskConfig>;
}

function readTurboConfig(): TurboConfig {
  const turboJsonPath = resolve(import.meta.dirname, '../../../turbo.json');
  return JSON.parse(readFileSync(turboJsonPath, 'utf-8')) as TurboConfig;
}

describe('root turbo.json', () => {
  it('makes the test task depend on its own package build, not only ^build', () => {
    const { tasks } = readTurboConfig();

    expect(tasks.test?.dependsOn).toContain('build');
    expect(tasks.test?.dependsOn).toContain('^build');
  });

  it('declares PUBLIC_* and RESEND_API_KEY as env inputs', () => {
    const config = readTurboConfig();
    const declaredEnv = [
      ...(config.globalEnv ?? []),
      ...(config.tasks.build?.env ?? []),
    ];

    expect(declaredEnv).toContain('PUBLIC_*');
    expect(declaredEnv).toContain('RESEND_API_KEY');
  });

  it('declares a lint task, so `pnpm turbo lint` covers every package that opts in', () => {
    const { tasks } = readTurboConfig();

    expect(tasks.lint).toBeDefined();
  });
});
