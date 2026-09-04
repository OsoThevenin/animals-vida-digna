import { describe, expect, it } from 'vitest';
import {
  DEFAULT_IMAGES_ORIGIN,
  DEFAULT_SIZES,
  DEFAULT_WIDTHS,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_EDGE,
  imageKey,
  imageSrcset,
  imageUrl,
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
