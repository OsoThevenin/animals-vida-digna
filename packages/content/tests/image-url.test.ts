import { describe, expect, it } from 'vitest';
import {
  DEFAULT_IMAGES_ORIGIN,
  DEFAULT_SIZES,
  DEFAULT_WIDTHS,
  imageKey,
  imageSrcset,
  imageUrl,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_EDGE,
  originalImageUrl,
} from '../src/image-url';

describe('constants', () => {
  it('has the expected defaults', () => {
    expect(DEFAULT_IMAGES_ORIGIN).toBe('https://images.animalsvidadigna.org');
    expect(DEFAULT_WIDTHS).toEqual([320, 640, 960, 1280]);
    expect(DEFAULT_SIZES).toBe(
      '(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw'
    );
    expect(MAX_UPLOAD_EDGE).toBe(2000);
    expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024);
  });
});

describe('imageKey', () => {
  it('builds the cats/<catId>/<imageId>.webp key', () => {
    expect(imageKey('cat_abc', 'img_xyz')).toBe('cats/cat_abc/img_xyz.webp');
  });
});

describe('originalImageUrl', () => {
  it('joins the default origin and key', () => {
    expect(originalImageUrl('cats/cat_abc/img_xyz.webp')).toBe(
      'https://images.animalsvidadigna.org/cats/cat_abc/img_xyz.webp'
    );
  });

  it('joins a custom origin and key', () => {
    expect(
      originalImageUrl('cats/cat_abc/img_xyz.webp', 'http://localhost:8788')
    ).toBe('http://localhost:8788/cats/cat_abc/img_xyz.webp');
  });
});

describe('imageUrl', () => {
  it('builds a /cdn-cgi/image/ URL against the default images origin', () => {
    const result = imageUrl('cats/cat_abc/img_xyz.webp', 640);
    expect(result).toBe(
      'https://images.animalsvidadigna.org/cdn-cgi/image/width=640,fit=scale-down,quality=80,format=auto,onerror=redirect/cats/cat_abc/img_xyz.webp'
    );
  });

  it('passes through to a raw path for a non-default origin (local dev)', () => {
    const result = imageUrl(
      'cats/cat_abc/img_xyz.webp',
      640,
      'http://localhost:8788'
    );
    expect(result).toBe('http://localhost:8788/cats/cat_abc/img_xyz.webp');
  });
});

describe('imageSrcset', () => {
  it('builds a full srcset with default widths against the default origin', () => {
    const result = imageSrcset('cats/cat_abc/img_xyz.webp');
    expect(result).toBe(
      [320, 640, 960, 1280]
        .map(
          (w) =>
            `https://images.animalsvidadigna.org/cdn-cgi/image/width=${w},fit=scale-down,quality=80,format=auto,onerror=redirect/cats/cat_abc/img_xyz.webp ${w}w`
        )
        .join(', ')
    );
  });

  it('accepts custom widths and origin', () => {
    const result = imageSrcset(
      'cats/cat_abc/img_xyz.webp',
      [400, 800],
      'http://localhost:8788'
    );
    expect(result).toBe(
      'http://localhost:8788/cats/cat_abc/img_xyz.webp 400w, ' +
        'http://localhost:8788/cats/cat_abc/img_xyz.webp 800w'
    );
  });
});

/**
 * Phase 5 Deferred Verification item 2 (task-11-report.md): a production
 * WAF rule in front of images.animalsvidadigna.org allowlists ONLY the
 * exact transform string
 *   /cdn-cgi/image/width=<W>,fit=scale-down,quality=80,format=auto,onerror=redirect/<key>
 * for W in {320, 640, 960, 1280}, in exactly this parameter order and
 * spelling — anything else (a reordered/renamed/added/dropped param, a
 * non-allowlisted width, extra whitespace) 403s to a real visitor. This
 * sandbox cannot reach the live WAF, so this suite encodes the contract
 * as a regex that models the rule and asserts BOTH directions: every
 * `imageUrl`/`imageSrcset` output for the real code matches it, AND a
 * set of deliberately deviated strings — the exact kind of drift a future
 * refactor of image-url.ts could introduce — do NOT match it. A future
 * change to the transform string shape must fail this test before it can
 * ever reach production and 403 real visitors.
 */
describe('WAF canonical transform contract', () => {
  const CANONICAL_TRANSFORM_PATTERN =
    /^https:\/\/images\.animalsvidadigna\.org\/cdn-cgi\/image\/width=(320|640|960|1280),fit=scale-down,quality=80,format=auto,onerror=redirect\/.+$/;

  it.each(
    DEFAULT_WIDTHS
  )('imageUrl(%i) against the default origin matches the canonical WAF pattern', (width) => {
    const result = imageUrl('cats/cat_abc/img_xyz.webp', width);
    expect(result).toMatch(CANONICAL_TRANSFORM_PATTERN);
  });

  it('every entry in imageSrcset (default origin) matches the canonical WAF pattern', () => {
    const srcset = imageSrcset('cats/cat_abc/img_xyz.webp');
    const urls = srcset.split(', ').map((entry) => entry.split(' ')[0]);
    expect(urls).toHaveLength(DEFAULT_WIDTHS.length);
    for (const url of urls) {
      expect(url).toMatch(CANONICAL_TRANSFORM_PATTERN);
    }
  });

  it.each([
    [
      'non-allowlisted width (500 is not one of 320/640/960/1280)',
      'https://images.animalsvidadigna.org/cdn-cgi/image/width=500,fit=scale-down,quality=80,format=auto,onerror=redirect/cats/cat_abc/img_xyz.webp',
    ],
    [
      'reordered parameters (fit before width)',
      'https://images.animalsvidadigna.org/cdn-cgi/image/fit=scale-down,width=640,quality=80,format=auto,onerror=redirect/cats/cat_abc/img_xyz.webp',
    ],
    [
      'dropped parameter (onerror missing)',
      'https://images.animalsvidadigna.org/cdn-cgi/image/width=640,fit=scale-down,quality=80,format=auto/cats/cat_abc/img_xyz.webp',
    ],
    [
      'added parameter not in the allowlisted set',
      'https://images.animalsvidadigna.org/cdn-cgi/image/width=640,fit=scale-down,quality=80,format=auto,onerror=redirect,sharpen=1/cats/cat_abc/img_xyz.webp',
    ],
    [
      'deviated quality value (81 instead of 80)',
      'https://images.animalsvidadigna.org/cdn-cgi/image/width=640,fit=scale-down,quality=81,format=auto,onerror=redirect/cats/cat_abc/img_xyz.webp',
    ],
    [
      'extra whitespace after a comma',
      'https://images.animalsvidadigna.org/cdn-cgi/image/width=640, fit=scale-down,quality=80,format=auto,onerror=redirect/cats/cat_abc/img_xyz.webp',
    ],
  ])('rejects a deviated transform string: %s', (_label, deviated) => {
    expect(deviated).not.toMatch(CANONICAL_TRANSFORM_PATTERN);
  });
});
