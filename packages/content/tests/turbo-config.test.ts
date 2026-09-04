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
});
