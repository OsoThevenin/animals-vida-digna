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

describe('defaults', () => {
  it('has correct default widths', () => {
    expect(DEFAULT_WIDTHS).toEqual([320, 640, 960, 1280]);
  });

  it('has correct default sizes', () => {
    expect(DEFAULT_SIZES).toBe('(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw');
  });
});
