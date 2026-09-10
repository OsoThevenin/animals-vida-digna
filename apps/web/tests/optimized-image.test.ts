import { describe, expect, it } from 'vitest';
import { imageUrl, generateSrcset, DEFAULT_WIDTHS, DEFAULT_SIZES } from '../src/lib/image-utils';

describe('imageUrl', () => {
  it('returns Cloudflare Image Resizing URL in production mode', () => {
    const result = imageUrl('images/cats/misi.jpg', 640, false);
    expect(result).toBe('/cdn-cgi/image/format=auto,fit=cover,width=640,quality=80/images/cats/misi.jpg');
  });

  it('returns raw src in dev mode', () => {
    const result = imageUrl('images/cats/misi.jpg', 640, true);
    expect(result).toBe('images/cats/misi.jpg');
  });

  it('handles different widths correctly', () => {
    const result = imageUrl('images/cats/misi.jpg', 320, false);
    expect(result).toBe('/cdn-cgi/image/format=auto,fit=cover,width=320,quality=80/images/cats/misi.jpg');
  });

  it('handles paths with leading slash', () => {
    const result = imageUrl('/images/cats/misi.jpg', 640, false);
    expect(result).toBe('/cdn-cgi/image/format=auto,fit=cover,width=640,quality=80/images/cats/misi.jpg');
  });
});

describe('generateSrcset', () => {
  it('returns proper srcset string with all widths in production', () => {
    const result = generateSrcset('images/cats/misi.jpg', [320, 640, 960, 1280], false);
    expect(result).toBe(
      '/cdn-cgi/image/format=auto,fit=cover,width=320,quality=80/images/cats/misi.jpg 320w, ' +
      '/cdn-cgi/image/format=auto,fit=cover,width=640,quality=80/images/cats/misi.jpg 640w, ' +
      '/cdn-cgi/image/format=auto,fit=cover,width=960,quality=80/images/cats/misi.jpg 960w, ' +
      '/cdn-cgi/image/format=auto,fit=cover,width=1280,quality=80/images/cats/misi.jpg 1280w'
    );
  });

  it('returns raw paths in dev mode', () => {
    const result = generateSrcset('images/cats/misi.jpg', [320, 640], true);
    expect(result).toBe('images/cats/misi.jpg 320w, images/cats/misi.jpg 640w');
  });
});

import { resolveOptimizedImageSource } from '../src/lib/optimized-image-url';

describe('resolveOptimizedImageSource', () => {
  it('throws when neither src nor r2Key is given', () => {
    expect(() =>
      resolveOptimizedImageSource({ isDev: false }),
    ).toThrow('OptimizedImage requires exactly one of "src" or "r2Key"');
  });

  it('throws when both src and r2Key are given', () => {
    expect(() =>
      resolveOptimizedImageSource({
        src: 'images/logo.webp',
        r2Key: 'cats/abc/1.webp',
        isDev: false,
      }),
    ).toThrow('OptimizedImage requires exactly one of "src" or "r2Key"');
  });

  it('resolves a site-relative src through /cdn-cgi/image/ in production mode', () => {
    const result = resolveOptimizedImageSource({
      src: 'images/logo.webp',
      isDev: false,
    });
    expect(result.src).toBe(
      '/cdn-cgi/image/format=auto,fit=cover,width=1280,quality=80/images/logo.webp',
    );
    expect(result.width).toBe(1280);
  });

  it('resolves an r2Key through the images origin', () => {
    const result = resolveOptimizedImageSource({
      r2Key: 'cats/abc123/img1.webp',
      isDev: false,
      imagesOrigin: 'https://images.animalsvidadigna.org',
    });
    expect(result.src).toBe(
      'https://images.animalsvidadigna.org/cdn-cgi/image/width=1280,fit=scale-down,quality=80,format=auto,onerror=redirect/cats/abc123/img1.webp',
    );
    expect(result.width).toBe(1280);
  });

  it('honors an explicit width for r2Key sources', () => {
    const result = resolveOptimizedImageSource({
      r2Key: 'cats/abc123/img1.webp',
      isDev: false,
      width: 960,
      imagesOrigin: 'https://images.animalsvidadigna.org',
    });
    expect(result.src).toBe(
      'https://images.animalsvidadigna.org/cdn-cgi/image/width=960,fit=scale-down,quality=80,format=auto,onerror=redirect/cats/abc123/img1.webp',
    );
    expect(result.width).toBe(960);
  });

  it('builds a full srcset for r2Key sources across the default widths', () => {
    const result = resolveOptimizedImageSource({
      r2Key: 'cats/abc123/img1.webp',
      isDev: false,
      imagesOrigin: 'https://images.animalsvidadigna.org',
    });
    expect(result.srcset).toContain('320w');
    expect(result.srcset).toContain('640w');
    expect(result.srcset).toContain('960w');
    expect(result.srcset).toContain('1280w');
  });

  it('defaults imagesOrigin to DEFAULT_IMAGES_ORIGIN when not given', () => {
    const result = resolveOptimizedImageSource({
      r2Key: 'cats/abc123/img1.webp',
      isDev: false,
    });
    expect(result.src.startsWith('https://images.animalsvidadigna.org/')).toBe(true);
  });

  // C2 regression: real stored intrinsic widths (Phase 5 bounds uploads at
  // MAX_UPLOAD_EDGE = 2000) are never one of the four widths the production
  // WAF rule allowlists (320/640/960/1280). The transform `src` must always
  // use an allowlisted width -- never the raw intrinsic width -- while the
  // `width` returned (used for the HTML width attribute, to reserve layout
  // and prevent CLS) must keep the real intrinsic value.
  it('maps a non-allowlisted intrinsic width (1500) to the largest allowlisted width in src, while keeping the intrinsic width for the width attribute', () => {
    const result = resolveOptimizedImageSource({
      r2Key: 'cats/abc123/img1.webp',
      isDev: false,
      width: 1500,
      imagesOrigin: 'https://images.animalsvidadigna.org',
    });
    expect(result.src).toBe(
      'https://images.animalsvidadigna.org/cdn-cgi/image/width=1280,fit=scale-down,quality=80,format=auto,onerror=redirect/cats/abc123/img1.webp',
    );
    expect(result.width).toBe(1500);
  });

  it('maps a non-allowlisted intrinsic width (2000, the MAX_UPLOAD_EDGE bound) to the largest allowlisted width in src', () => {
    const result = resolveOptimizedImageSource({
      r2Key: 'cats/abc123/img1.webp',
      isDev: false,
      width: 2000,
      imagesOrigin: 'https://images.animalsvidadigna.org',
    });
    expect(result.src).toBe(
      'https://images.animalsvidadigna.org/cdn-cgi/image/width=1280,fit=scale-down,quality=80,format=auto,onerror=redirect/cats/abc123/img1.webp',
    );
    expect(result.width).toBe(2000);
  });

  it('maps an intrinsic width below the smallest allowlisted width (200) up to the smallest allowlisted width (320)', () => {
    const result = resolveOptimizedImageSource({
      r2Key: 'cats/abc123/img1.webp',
      isDev: false,
      width: 200,
      imagesOrigin: 'https://images.animalsvidadigna.org',
    });
    expect(result.src).toBe(
      'https://images.animalsvidadigna.org/cdn-cgi/image/width=320,fit=scale-down,quality=80,format=auto,onerror=redirect/cats/abc123/img1.webp',
    );
    expect(result.width).toBe(200);
  });

  it('maps an intrinsic width between allowlisted steps (700) up to the next allowlisted width (960)', () => {
    const result = resolveOptimizedImageSource({
      r2Key: 'cats/abc123/img1.webp',
      isDev: false,
      width: 700,
      imagesOrigin: 'https://images.animalsvidadigna.org',
    });
    expect(result.src).toBe(
      'https://images.animalsvidadigna.org/cdn-cgi/image/width=960,fit=scale-down,quality=80,format=auto,onerror=redirect/cats/abc123/img1.webp',
    );
    expect(result.width).toBe(700);
  });

  it('never emits a non-allowlisted width in src across a sweep of realistic intrinsic widths', () => {
    const ALLOWED = new Set([320, 640, 960, 1280]);
    for (const width of [321, 500, 799, 961, 1279, 1281, 1600, 1800, 2000]) {
      const result = resolveOptimizedImageSource({
        r2Key: 'cats/abc123/img1.webp',
        isDev: false,
        width,
        imagesOrigin: 'https://images.animalsvidadigna.org',
      });
      const widthMatch = result.src.match(/width=(\d+)/);
      expect(widthMatch).not.toBeNull();
      expect(ALLOWED.has(Number(widthMatch?.[1]))).toBe(true);
    }
  });
});

describe('defaults', () => {
  it('has correct default widths', () => {
    expect(DEFAULT_WIDTHS).toEqual([320, 640, 960, 1280]);
  });

  it('has correct default sizes', () => {
    expect(DEFAULT_SIZES).toBe('(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw');
  });
});
