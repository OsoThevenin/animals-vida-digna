/**
 * Pure, framework-free helpers for the `image-manager.tsx` island. Kept
 * separate from the component so the state-update and error-formatting
 * logic can be unit tested without a DOM or `astro:actions`.
 */
import { validateUploadFile } from '@/lib/image-upload';

/**
 * `browser-image-compression`'s target output size. Astro caps action
 * request bodies at 1 MB in this app (found during Task 6's live
 * verification) — well below `MAX_UPLOAD_BYTES` (5 MB), which only bounds
 * what the server-side `validateUploadFile` accepts. Compressing to this
 * target, rather than to 5 MB, is what actually keeps an upload from
 * failing at the framework boundary.
 */
export const UPLOAD_COMPRESSION_TARGET_MB = 0.9;

/**
 * Conservative round-number budget for a compressed upload. Astro's real
 * action request body cap, measured live against `wrangler dev` in this
 * app, is 1,048,576 bytes (1 MiB exactly — the response body was
 * `"Request body exceeds 1048576 bytes"`). This constant is kept a little
 * below that on purpose, not because it *is* the cap.
 */
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
  /**
   * Unique per upload attempt, NOT `file.name` — two files selected in
   * the same batch can share a name, and keying by name made them collide
   * on both the React `key` and every `withUploadStatus` patch (task-9
   * fix-round-1 MINOR 6).
   */
  id: string;
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
  id: string,
  patch: Partial<UploadProgressItem>
): UploadProgressItem[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
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

export interface ProcessUploadDeps<Image> {
  compress: (file: File) => Promise<File>;
  readDimensions: (file: File) => Promise<{ width: number; height: number }>;
  upload: (formData: FormData) => Promise<{ data?: Image; error?: unknown }>;
}

export type ProcessUploadResult<Image> =
  | { status: 'done'; image: Image }
  | { status: 'error'; message: string };

/**
 * Runs one selected file through compress -> size-gate -> validate -> read
 * dimensions -> upload, never throwing: every step that can fail returns
 * an error result instead of rejecting. Dependencies are injected so this
 * is unit-testable without a browser (no `createImageBitmap`, no network).
 *
 * Fixes task-9 fix-round-1 IMPORTANT 1: the previous inline version had
 * no `catch` around reading dimensions, unlike every step around it.
 * `createImageBitmap` rejects on a decode failure or an
 * unsupported/animated source, which left that upload row stuck at
 * "comprimint…" forever AND, because the failure propagated out of the
 * `for` loop in `handleFiles`, silently dropped every file queued after
 * it. Returning `{ status: 'error' }` here instead means the caller's
 * loop always proceeds to the next file.
 */
export async function processUploadFile<Image>(
  file: File,
  catId: string,
  deps: ProcessUploadDeps<Image>
): Promise<ProcessUploadResult<Image>> {
  let compressed: File;
  try {
    compressed = await deps.compress(file);
  } catch {
    return { status: 'error', message: "No s'ha pogut comprimir la imatge." };
  }

  const sizeError = describeCompressedSizeError(compressed.size);
  if (sizeError) {
    return { status: 'error', message: sizeError };
  }

  const validation = validateUploadFile({
    type: compressed.type,
    size: compressed.size,
  });
  if (!validation.ok) {
    return {
      status: 'error',
      message:
        validation.reason === 'type'
          ? 'Format no vàlid.'
          : 'Fitxer massa gran.',
    };
  }

  let dimensions: { width: number; height: number };
  try {
    dimensions = await deps.readDimensions(compressed);
  } catch {
    return {
      status: 'error',
      message: "No s'ha pogut llegir la imatge. Prova amb un altre fitxer.",
    };
  }

  const formData = new FormData();
  formData.append('catId', catId);
  formData.append('file', compressed, file.name);
  formData.append('width', String(dimensions.width));
  formData.append('height', String(dimensions.height));

  const { data, error } = await deps.upload(formData);
  if (error || !data) {
    return {
      status: 'error',
      message: describeActionError(error, 'Error pujant la imatge.'),
    };
  }
  return { status: 'done', image: data };
}

interface OrderableImage {
  id: string;
  altCa: string;
  altEs: string;
  position: number;
}

/**
 * True when `current` no longer matches what was actually sent as `sent`
 * — i.e. the volunteer reordered or re-edited alt text while a save was
 * in flight. `images.update` always resolves `{ ok: true }` regardless,
 * so this is the only way to tell a genuine save apart from a stale one
 * (task-9 fix-round-1 IMPORTANT 2). `saveOrderAndAlts` uses this to warn
 * instead of claiming "Desat." for a version the server no longer holds.
 */
export function ordersDiffer(
  sent: OrderableImage[],
  current: OrderableImage[]
): boolean {
  if (sent.length !== current.length) return true;
  const byId = new Map(current.map((image) => [image.id, image]));
  return sent.some((image) => {
    const now = byId.get(image.id);
    return (
      !now ||
      now.position !== image.position ||
      now.altCa !== image.altCa ||
      now.altEs !== image.altEs
    );
  });
}

/**
 * True when `requestId` is still the most recently dispatched
 * `setCover` call. `setCover` keeps only one `savingCoverId`/`previous`
 * pair per call, so a response for an older, superseded request must be
 * ignored entirely — otherwise it can roll back a newer optimistic
 * update it knows nothing about, or clear the saving indicator out from
 * under the request that's actually still in flight (task-9 fix-round-1
 * IMPORTANT 3): cover=A; click B (dispatched, latest=B); click C
 * (dispatched, latest=C); C succeeds first; B then fails — B's response
 * must be ignored, not rolled back to A over the top of C.
 */
export function shouldApplyCoverResponse(
  requestId: string,
  latestRequestId: string | null
): boolean {
  return requestId === latestRequestId;
}
