import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards Phase 1 code-review finding: the root `turbo.json` `test` task
 * declared `dependsOn: ["^build"]` only (upstream packages), never its own
 * `build`. `apps/web`'s tests that assert against `dist/_worker.js`
 * (wrangler-config.test.ts, worker-bundle-no-keystatic.test.ts) either
 * hard-fail or silently `describe.skip` without a prior build. And because
 * `dist/` is gitignored — so not a turbo input — a skipped result can cache
 * under the same hash and replay green forever, even once the underlying
 * assertions would fail.
 */

interface TurboTaskConfig {
  dependsOn?: string[];
}

interface TurboConfig {
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
});
