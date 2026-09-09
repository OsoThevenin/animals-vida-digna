import type { CatImage, Db } from '@avd/content/cats';
import { addCatImage } from '@avd/content/cats';

export interface UploadImageParams {
  catId: string;
  key: string;
  file: File;
  width: number;
  height: number;
}

/**
 * Streams a resized photo into R2 then records it in D1. If the D1 write
 * fails, the just-uploaded R2 object is deleted so no orphan is left behind
 * (compensating action — R2 has no transactions shared with D1).
 */
export async function uploadImageToBucket(
  bucket: Pick<R2Bucket, 'put' | 'delete'>,
  db: Db,
  params: UploadImageParams
): Promise<CatImage> {
  // Pass the File/Blob itself, not params.file.stream(): a bare
  // ReadableStream has no known length in Workers/Miniflare unless it is
  // the direct body of an incoming Request, so bucket.put throws
  // "Provided readable stream must have a known length" against a real R2
  // binding. A Blob/File carries its own length, so R2 can stream it
  // without that constraint.
  await bucket.put(params.key, params.file, {
    httpMetadata: {
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });

  try {
    return await addCatImage(db, params.catId, {
      r2Key: params.key,
      width: params.width,
      height: params.height,
    });
  } catch (error) {
    await bucket.delete(params.key);
    throw error;
  }
}

/**
 * Deletes R2 objects after their D1 rows are already gone. Best-effort: an
 * R2 failure here is logged, not thrown, so the caller (which has already
 * committed the D1 delete) does not report an error to the volunteer for an
 * orphaned object that Phase 6's sweep script will clean up later.
 */
export async function deleteImagesFromBucket(
  bucket: Pick<R2Bucket, 'delete'>,
  keys: string[]
): Promise<void> {
  if (keys.length === 0) return;
  try {
    await bucket.delete(keys);
  } catch (error) {
    console.error('image-store: failed to delete R2 objects', {
      keys,
      error,
    });
  }
}
