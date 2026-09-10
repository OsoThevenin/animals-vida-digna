import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * C1 regression: the cat detail pages' JSON-LD `image` field must use an
 * allowlisted Cloudflare Images transform width (320/640/960/1280) --
 * matching the production WAF rule in front of images.animalsvidadigna.org
 * (see docs/superpowers/plans/2026-09-03-content-r2-pipeline/phase-0-results.md,
 * Findings §5). `imageUrl(cat.coverImage.key, 1200, imagesOrigin)` used a
 * non-allowlisted width of 1200, which the WAF rejects with a 403 -- so
 * Googlebot, Facebook and WhatsApp crawlers requesting the schema.org
 * `image` for any cat would get a 403 instead of the image.
 *
 * This asserts against the actual built worker output (mirroring the
 * reviewer's own evidence at
 * dist/_worker.js/pages/cat/_slug_.astro.mjs:36), not just the source
 * .astro file, so it catches the bug the way it actually manifests in
 * production. Requires a build to have been run first (`pnpm build`); skips
 * (loudly) if dist/ hasn't been built.
 */

const WORKER_DIR = join(process.cwd(), 'dist', '_worker.js');
const CAT_SLUG_CA = join(WORKER_DIR, 'pages', 'cat', '_slug_.astro.mjs');
const CAT_SLUG_ES = join(WORKER_DIR, 'pages', 'es', 'cat', '_slug_.astro.mjs');

const built = existsSync(CAT_SLUG_CA) && existsSync(CAT_SLUG_ES);

if (!built) {
  it.skip('SKIPPED: dist/_worker.js not built -- run `pnpm build` first to exercise this test', () => {});
}

describe.skipIf(!built)(
  'cat detail pages build the JSON-LD cover image URL with an allowlisted width',
  () => {
    for (const [label, entry] of [
      ['ca /cat/[slug]', CAT_SLUG_CA],
      ['es /cat/[slug]', CAT_SLUG_ES],
    ] as const) {
      it(`${label} calls imageUrl(..., 1280, ...) for the JSON-LD image, never a non-allowlisted width`, () => {
        const source = readFileSync(entry, 'utf-8');
        const call = source.match(
          /imageUrl\(cat\.coverImage\.key,\s*(\d+),\s*imagesOrigin\)/
        );
        expect(call, `${entry} must call imageUrl(key, <width>, imagesOrigin) for the JSON-LD image`).not.toBeNull();
        expect(Number(call?.[1])).toBe(1280);
      });
    }
  }
);
