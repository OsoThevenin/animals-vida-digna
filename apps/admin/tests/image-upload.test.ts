import { describe, expect, it } from 'vitest';
import { validateUploadFile } from '../src/lib/image-upload';

describe('validateUploadFile', () => {
  it('accepts a webp file within the size limit', () => {
    const result = validateUploadFile({
      type: 'image/webp',
      size: 1024,
    });
    expect(result).toEqual({ ok: true });
  });

  it('accepts a file exactly at the size limit', () => {
    const result = validateUploadFile({
      type: 'image/webp',
      size: 5 * 1024 * 1024,
    });
    expect(result).toEqual({ ok: true });
  });

  it('rejects a non-webp mime type', () => {
    const result = validateUploadFile({
      type: 'image/png',
      size: 1024,
    });
    expect(result).toEqual({ ok: false, reason: 'type' });
  });

  it('rejects a file over the size limit', () => {
    const result = validateUploadFile({
      type: 'image/webp',
      size: 5 * 1024 * 1024 + 1,
    });
    expect(result).toEqual({ ok: false, reason: 'size' });
  });

  it('checks type before size', () => {
    const result = validateUploadFile({
      type: 'image/png',
      size: 5 * 1024 * 1024 + 1,
    });
    expect(result).toEqual({ ok: false, reason: 'type' });
  });
});
