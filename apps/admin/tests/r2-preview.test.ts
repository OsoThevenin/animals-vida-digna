import { describe, expect, it } from 'vitest';
import {
  isDevPreviewEnabled,
  resolveR2PreviewKey,
} from '../src/lib/r2-preview';

/**
 * `GET /r2/[...key]` streams objects straight out of the R2 bucket with no
 * authentication — acceptable only because it must never be reachable in a
 * deployed Worker. `isDevPreviewEnabled` is the one gate that decides that,
 * and it must be driven by the build-time `import.meta.env.DEV` flag (see
 * the route module), never a runtime env var a misconfiguration could
 * flip. `resolveR2PreviewKey` is the second line of defense: even in dev,
 * the key comes straight from the URL path, so it must reject anything
 * that could escape the `cats/` prefix.
 */

describe('isDevPreviewEnabled', () => {
  it('is enabled only when import.meta.env.DEV is exactly true', () => {
    expect(isDevPreviewEnabled(true)).toBe(true);
  });

  it('is disabled in a production build, where DEV is false', () => {
    expect(isDevPreviewEnabled(false)).toBe(false);
  });
});

describe('resolveR2PreviewKey', () => {
  it('accepts a well-formed key under the cats/ prefix', () => {
    expect(resolveR2PreviewKey('cats/cat_1/img_1.webp')).toBe(
      'cats/cat_1/img_1.webp'
    );
  });

  it('rejects an undefined key', () => {
    expect(resolveR2PreviewKey(undefined)).toBeNull();
  });

  it('rejects an empty key', () => {
    expect(resolveR2PreviewKey('')).toBeNull();
  });

  it('rejects a key outside the cats/ prefix', () => {
    expect(resolveR2PreviewKey('secrets/config.json')).toBeNull();
  });

  it('rejects a bare .. traversal segment', () => {
    expect(resolveR2PreviewKey('cats/../secrets.json')).toBeNull();
  });

  it('rejects a deep .. traversal segment', () => {
    expect(resolveR2PreviewKey('cats/cat_1/../../secrets.json')).toBeNull();
  });

  it('rejects a percent-encoded .. traversal segment', () => {
    expect(resolveR2PreviewKey('cats/%2e%2e/secrets.json')).toBeNull();
  });

  it('rejects a double percent-encoded traversal segment', () => {
    expect(resolveR2PreviewKey('cats/%252e%252e/secrets.json')).toBeNull();
  });

  it('rejects an absolute-path key', () => {
    expect(resolveR2PreviewKey('/etc/passwd')).toBeNull();
  });

  it('rejects a key containing a backslash', () => {
    expect(resolveR2PreviewKey('cats\\..\\secrets.json')).toBeNull();
  });

  it('rejects a lone dot segment', () => {
    expect(resolveR2PreviewKey('cats/./secrets.json')).toBeNull();
  });

  it('rejects a key with an empty segment (double slash)', () => {
    expect(resolveR2PreviewKey('cats//secrets.json')).toBeNull();
  });

  it('rejects an undecodable percent sequence', () => {
    expect(resolveR2PreviewKey('cats/%zz/img.webp')).toBeNull();
  });
});
