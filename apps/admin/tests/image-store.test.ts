import { describe, expect, it, vi } from 'vitest';
import {
  deleteImagesFromBucket,
  uploadImageToBucket,
} from '../src/lib/image-store';

vi.mock('@avd/content/cats', () => ({
  addCatImage: vi.fn(),
}));

import { addCatImage } from '@avd/content/cats';

function fakeFile(): File {
  return new File(['fake-bytes'], 'photo.webp', { type: 'image/webp' });
}

describe('uploadImageToBucket', () => {
  it('puts the object then records it in D1', async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const del = vi.fn().mockResolvedValue(undefined);
    const bucket = { put, delete: del };
    const db = {} as never;
    vi.mocked(addCatImage).mockResolvedValue({
      id: 'img_1',
      catId: 'cat_1',
      r2Key: 'cats/cat_1/img_1.webp',
      altCa: '',
      altEs: '',
      width: 800,
      height: 600,
      position: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    const result = await uploadImageToBucket(bucket, db, {
      catId: 'cat_1',
      key: 'cats/cat_1/img_1.webp',
      file: fakeFile(),
      width: 800,
      height: 600,
    });

    expect(put).toHaveBeenCalledWith(
      'cats/cat_1/img_1.webp',
      expect.anything(),
      {
        httpMetadata: {
          contentType: 'image/webp',
          cacheControl: 'public, max-age=31536000, immutable',
        },
      }
    );
    expect(addCatImage).toHaveBeenCalledWith(db, 'cat_1', {
      r2Key: 'cats/cat_1/img_1.webp',
      width: 800,
      height: 600,
    });
    expect(del).not.toHaveBeenCalled();
    expect(result.id).toBe('img_1');
  });

  it('deletes the just-uploaded object when the D1 write fails', async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const del = vi.fn().mockResolvedValue(undefined);
    const bucket = { put, delete: del };
    const db = {} as never;
    vi.mocked(addCatImage).mockRejectedValue(new Error('D1 write failed'));

    await expect(
      uploadImageToBucket(bucket, db, {
        catId: 'cat_1',
        key: 'cats/cat_1/img_2.webp',
        file: fakeFile(),
        width: 800,
        height: 600,
      })
    ).rejects.toThrow('D1 write failed');

    expect(del).toHaveBeenCalledWith('cats/cat_1/img_2.webp');
  });
});

describe('deleteImagesFromBucket', () => {
  it('deletes all given keys in one call', async () => {
    const del = vi.fn().mockResolvedValue(undefined);
    await deleteImagesFromBucket({ delete: del }, ['a.webp', 'b.webp']);
    expect(del).toHaveBeenCalledWith(['a.webp', 'b.webp']);
  });

  it('does nothing for an empty key list', async () => {
    const del = vi.fn();
    await deleteImagesFromBucket({ delete: del }, []);
    expect(del).not.toHaveBeenCalled();
  });

  it('swallows a bucket delete failure and logs it', async () => {
    const del = vi.fn().mockRejectedValue(new Error('R2 unavailable'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      deleteImagesFromBucket({ delete: del }, ['a.webp'])
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
