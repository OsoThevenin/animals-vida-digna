import type { ActionAPIContext } from 'astro:actions';
import { ActionError } from 'astro:actions';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Final fix wave, FIX 3: `images.upload`'s handler built the R2 key from
 * a client-supplied `catId` and called `bucket.put` before anything
 * confirmed that cat actually exists. Today a bogus `catId` fails the D1
 * foreign key on the compensating `addCatImage` write, and
 * `uploadImageToBucket` deletes the just-put object -- but if that
 * delete itself fails, the object is left outside every `cats/<realId>/`
 * prefix, where Phase 6's prefix-based sweep can never find it.
 *
 * The fix mirrors what `cats.update` already does: call `getCatById` and
 * throw a NOT_FOUND `ActionError` before ever touching the bucket, right
 * after `requireUser` and `validateUploadFile` -- so the ordering
 * becomes requireUser -> validate file -> confirm cat exists -> put.
 *
 * `server.images.upload` is Astro's `defineAction` wrapper, so it's
 * exercised through `.orThrow`, called with an explicit `this` context
 * (its `serverHandler` only ever touches `context.locals`, never any
 * Astro-internal symbol) -- the same technique used to unit-test action
 * handlers without booting the full Astro pipeline.
 */

vi.mock('@avd/content/cats', () => ({
  getCatById: vi.fn(),
  createDb: vi.fn(() => ({})),
}));

const uploadImageToBucket = vi.fn();
vi.mock('../src/lib/image-store', () => ({
  uploadImageToBucket: (...args: unknown[]) => uploadImageToBucket(...args),
  deleteImagesFromBucket: vi.fn(),
}));

import { getCatById } from '@avd/content/cats';
import { server } from '../src/actions/index';

function fakeContext(): ActionAPIContext {
  const bucketPut = vi.fn();
  return {
    locals: {
      user: { id: 'user_1', email: 'ana@example.com' },
      runtime: {
        env: {
          DB: {} as unknown,
          IMAGES_BUCKET: { put: bucketPut } as unknown,
        },
      },
    },
  } as unknown as ActionAPIContext;
}

function fakeFormData(catId: string): FormData {
  const formData = new FormData();
  formData.append('catId', catId);
  formData.append(
    'file',
    new File(['x'], 'photo.webp', { type: 'image/webp' })
  );
  formData.append('width', '800');
  formData.append('height', '600');
  return formData;
}

describe('images.upload action', () => {
  beforeEach(() => {
    vi.mocked(getCatById).mockReset();
    uploadImageToBucket.mockReset();
  });

  it('throws NOT_FOUND for a bogus catId and never calls bucket.put', async () => {
    vi.mocked(getCatById).mockResolvedValue(null);
    const context = fakeContext();

    await expect(
      server.images.upload.orThrow.call(context, fakeFormData('cat_bogus'))
    ).rejects.toThrow(ActionError);

    expect(uploadImageToBucket).not.toHaveBeenCalled();
    expect(context.locals.runtime.env.IMAGES_BUCKET.put).not.toHaveBeenCalled();
  });

  it('uploads once the cat is confirmed to exist', async () => {
    vi.mocked(getCatById).mockResolvedValue({
      id: 'cat_1',
    } as never);
    uploadImageToBucket.mockResolvedValue({ id: 'img_1' });
    const context = fakeContext();

    const result = await server.images.upload.orThrow.call(
      context,
      fakeFormData('cat_1')
    );

    expect(result).toEqual({ id: 'img_1' });
    expect(uploadImageToBucket).toHaveBeenCalledTimes(1);
  });
});
