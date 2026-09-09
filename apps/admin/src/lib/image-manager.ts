/**
 * Pure, framework-free helpers for the `image-manager.tsx` island. Kept
 * separate from the component so the state-update and error-formatting
 * logic can be unit tested without a DOM or `astro:actions`.
 */

/**
 * `browser-image-compression`'s target output size. Astro caps action
 * request bodies at 1 MB in this app (found during Task 6's live
 * verification) — well below `MAX_UPLOAD_BYTES` (5 MB), which only bounds
 * what the server-side `validateUploadFile` accepts. Compressing to this
 * target, rather than to 5 MB, is what actually keeps an upload from
 * failing at the framework boundary.
 */
export const UPLOAD_COMPRESSION_TARGET_MB = 0.9;

/** Astro's action request body cap in this app. */
export const MAX_ACTION_BODY_BYTES = 1_000_000;

/**
 * Warn threshold applied to the *compressed* file, below the raw 1 MB cap
 * to leave headroom for multipart/form-data overhead (boundaries, field
 * names, the width/height fields) so a volunteer sees a clear Catalan
 * message instead of an opaque framework failure.
 */
export const UPLOAD_SIZE_HEADROOM_BYTES = 950_000;

export interface CompressionOptions {
  fileType: 'image/webp';
  initialQuality: number;
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
}

export function buildCompressionOptions(maxEdge: number): CompressionOptions {
  return {
    fileType: 'image/webp',
    initialQuality: 0.82,
    maxSizeMB: UPLOAD_COMPRESSION_TARGET_MB,
    maxWidthOrHeight: maxEdge,
    useWebWorker: true,
  };
}

export function describeCompressedSizeError(bytes: number): string | null {
  if (bytes <= UPLOAD_SIZE_HEADROOM_BYTES) return null;
  return "La imatge segueix pesant més d'1 MB després de comprimir-la. Prova amb una foto més petita.";
}

export type ImageAltField = 'altCa' | 'altEs';

export function withAltEdit<T extends { id: string }>(
  images: T[],
  id: string,
  field: ImageAltField,
  value: string
): T[] {
  return images.map((image) =>
    image.id === id ? { ...image, [field]: value } : image
  );
}

export function withoutImage<T extends { id: string }>(
  images: T[],
  id: string
): T[] {
  return images.filter((image) => image.id !== id);
}

export function coverAfterRemoval(
  coverImageId: string | null,
  removedId: string
): string | null {
  return coverImageId === removedId ? null : coverImageId;
}

export interface UploadProgressItem {
  name: string;
  status: 'compressing' | 'uploading' | 'done' | 'error';
  message?: string;
}

export function withUploadItem(
  items: UploadProgressItem[],
  item: UploadProgressItem
): UploadProgressItem[] {
  return [...items, item];
}

export function withUploadStatus(
  items: UploadProgressItem[],
  name: string,
  patch: Partial<UploadProgressItem>
): UploadProgressItem[] {
  return items.map((item) =>
    item.name === name ? { ...item, ...patch } : item
  );
}

/**
 * Formats an unknown thrown/returned error into a Catalan message,
 * defaulting to `fallback` when the value carries no usable message —
 * covers `actions.images.setCover` surfacing a bare `Error('image not in
 * cat')` as a 500 (task-9 correction 3): Astro's action client still
 * deserializes that into an ActionError-shaped `{ message }` object, so
 * this only needs to defend against a genuinely message-less failure.
 */
export function describeActionError(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string' &&
    (error as { message: string }).message.length > 0
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}
