import { DEFAULT_IMAGES_ORIGIN, DEFAULT_WIDTHS } from '@avd/content/image-url';
import { describe, expect, it } from 'vitest';
import { coverThumbnailUrl } from '@/lib/cover-thumbnail';

/**
 * Regression test for a real bug found by Task 11's manual verification
 * (task-11-report.md, Deferred Verification item 2): src/pages/cats/
 * index.astro used to build the `/cats` list's cover thumbnail with
 * `imageUrl(key, 128, origin)` — 128 is not one of the four widths
 * (320/640/960/1280) the production WAF rule in front of
 * images.animalsvidadigna.org allows verbatim, so every cover thumbnail on
 * the admin cats list would have 403'd in production. Confirmed live
 * against `wrangler dev`: the rendered `<img src>` was
 * ".../cdn-cgi/image/width=128,.../cats/<id>/<img>.webp".
 *
 * coverThumbnailUrl must always use an allowlisted width, never an
 * arbitrary pixel size chosen for the CSS box it's displayed in.
 */
describe('coverThumbnailUrl', () => {
  it('uses the smallest allowlisted transform width against the default (production) origin', () => {
    const result = coverThumbnailUrl(
      'cats/cat_abc/img_xyz.webp',
      DEFAULT_IMAGES_ORIGIN
    );
    expect(result).toBe(
      `https://images.animalsvidadigna.org/cdn-cgi/image/width=${DEFAULT_WIDTHS[0]},fit=scale-down,quality=80,format=auto,onerror=redirect/cats/cat_abc/img_xyz.webp`
    );
    // Never the non-allowlisted 128 this replaces.
    expect(result).not.toContain('width=128');
  });

  it('passes through to a raw path for a non-default origin (local dev)', () => {
    const result = coverThumbnailUrl(
      'cats/cat_abc/img_xyz.webp',
      'http://localhost:4322/r2'
    );
    expect(result).toBe(
      'http://localhost:4322/r2/cats/cat_abc/img_xyz.webp'
    );
  });
});
