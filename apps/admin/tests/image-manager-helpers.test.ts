import { describe, expect, it } from 'vitest';
import {
  buildCompressionOptions,
  coverAfterRemoval,
  describeActionError,
  describeCompressedSizeError,
  MAX_ACTION_BODY_BYTES,
  UPLOAD_SIZE_HEADROOM_BYTES,
  withAltEdit,
  withoutImage,
  withUploadItem,
  withUploadStatus,
} from '../src/lib/image-manager';

describe('buildCompressionOptions', () => {
  it('targets comfortably under the 1 MB Astro action body cap', () => {
    const options = buildCompressionOptions(2000);
    // The real ceiling is the framework's 1 MB action body limit, not the
    // 5 MB MAX_UPLOAD_BYTES server check — see task-9 correction 2.
    expect(options.maxSizeMB * 1024 * 1024).toBeLessThan(MAX_ACTION_BODY_BYTES);
    expect(options.fileType).toBe('image/webp');
    expect(options.maxWidthOrHeight).toBe(2000);
    expect(options.useWebWorker).toBe(true);
  });
});

describe('describeCompressedSizeError', () => {
  it('returns null when the compressed file is comfortably under the cap', () => {
    expect(describeCompressedSizeError(500_000)).toBeNull();
  });

  it('returns a Catalan message when the compressed file still exceeds the cap', () => {
    const message = describeCompressedSizeError(1_200_000);
    expect(message).toBeTruthy();
    expect(message).toMatch(/1 ?MB/i);
  });

  it('treats the headroom boundary as the cutoff', () => {
    expect(describeCompressedSizeError(UPLOAD_SIZE_HEADROOM_BYTES)).toBeNull();
    expect(
      describeCompressedSizeError(UPLOAD_SIZE_HEADROOM_BYTES + 1)
    ).not.toBeNull();
  });
});

describe('withAltEdit', () => {
  const images = [
    { id: 'a', altCa: '', altEs: '' },
    { id: 'b', altCa: 'Bola', altEs: 'Bola' },
  ];

  it('updates only the matching image, immutably', () => {
    const next = withAltEdit(images, 'a', 'altCa', 'Micu');
    expect(next).not.toBe(images);
    expect(next[0]).not.toBe(images[0]);
    expect(next[0].altCa).toBe('Micu');
    expect(next[1]).toBe(images[1]);
    // original untouched
    expect(images[0].altCa).toBe('');
  });

  it('is a no-op for an unknown id', () => {
    const next = withAltEdit(images, 'missing', 'altEs', 'x');
    expect(next[0].altEs).toBe('');
    expect(next[1].altEs).toBe('Bola');
  });
});

describe('withoutImage', () => {
  it('removes only the matching image, immutably', () => {
    const images = [{ id: 'a' }, { id: 'b' }];
    const next = withoutImage(images, 'a');
    expect(next).toEqual([{ id: 'b' }]);
    expect(images).toHaveLength(2);
  });
});

describe('coverAfterRemoval', () => {
  it('clears the cover when the removed image was the cover', () => {
    expect(coverAfterRemoval('a', 'a')).toBeNull();
  });

  it('leaves the cover untouched otherwise', () => {
    expect(coverAfterRemoval('a', 'b')).toBe('a');
    expect(coverAfterRemoval(null, 'b')).toBeNull();
  });
});

describe('withUploadItem / withUploadStatus', () => {
  it('appends a new upload item immutably', () => {
    const items = [{ name: 'a.jpg', status: 'compressing' as const }];
    const next = withUploadItem(items, {
      name: 'b.jpg',
      status: 'compressing',
    });
    expect(next).toHaveLength(2);
    expect(items).toHaveLength(1);
  });

  it('patches only the matching item by name, immutably', () => {
    const items = [
      { name: 'a.jpg', status: 'compressing' as const },
      { name: 'b.jpg', status: 'compressing' as const },
    ];
    const next = withUploadStatus(items, 'a.jpg', {
      status: 'error',
      message: 'boom',
    });
    expect(next[0]).toEqual({
      name: 'a.jpg',
      status: 'error',
      message: 'boom',
    });
    expect(next[1]).toBe(items[1]);
    expect(items[0].status).toBe('compressing');
  });
});

describe('describeActionError', () => {
  it('extracts the message from an ActionError-shaped object', () => {
    expect(
      describeActionError({ message: 'image not in cat' }, 'fallback')
    ).toBe('image not in cat');
  });

  it('falls back for a message-less thrown value (non-ActionError failure)', () => {
    expect(describeActionError(new Error(), 'fallback')).toBe('fallback');
    expect(describeActionError('boom', 'fallback')).toBe('fallback');
    expect(describeActionError(null, 'fallback')).toBe('fallback');
  });

  it('falls back when the message is an empty string', () => {
    expect(describeActionError({ message: '' }, 'fallback')).toBe('fallback');
  });
});
