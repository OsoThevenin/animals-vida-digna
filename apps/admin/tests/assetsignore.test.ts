import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Regression guard for a real deploy failure.
 *
 * `wrangler.toml` serves `./dist` as the assets directory, and the Astro
 * Cloudflare adapter emits the server bundle into `dist/_worker.js/`.
 * Wrangler refuses to upload a `_worker.js` directory as a public asset:
 *
 *   ✘ [ERROR] Uploading a Pages _worker.js directory as an asset.
 *     This could expose your private server-side code to the public Internet.
 *
 * The fix is a `.assetsignore` in `public/` (Astro copies `public/` verbatim
 * into `dist/`), listing the paths wrangler must not publish.
 *
 * This was missed for `apps/admin` because the app had no `public/`
 * directory at all, and `wrangler deploy --dry-run` — the only deploy check
 * this repo ran — does not exercise asset upload, so it reported success.
 * The first real `wrangler deploy` failed outright.
 *
 * `apps/web` has always had the file; nothing asserted it there either.
 */
const REQUIRED_ENTRIES = ['_worker.js', '_routes.json'];

function readAssetsIgnore(appDir: string): string[] {
  const path = resolve(__dirname, '..', '..', appDir, 'public/.assetsignore');
  expect(
    existsSync(path),
    `${appDir}/public/.assetsignore is missing — \`wrangler deploy\` will ` +
      'refuse to upload dist/_worker.js as a public asset'
  ).toBe(true);
  return readFileSync(path, 'utf-8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

describe('.assetsignore', () => {
  for (const appDir of ['admin', 'web']) {
    it(`${appDir} excludes the server bundle from asset upload`, () => {
      const entries = readAssetsIgnore(appDir);
      for (const required of REQUIRED_ENTRIES) {
        expect(entries).toContain(required);
      }
    });
  }
});
