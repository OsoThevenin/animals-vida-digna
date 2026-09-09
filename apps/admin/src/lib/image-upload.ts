import { MAX_UPLOAD_BYTES } from '@avd/content/image-url';

export interface UploadFileMeta {
  type: string;
  size: number;
}

export type ValidateUploadFileResult =
  | { ok: true }
  | { ok: false; reason: 'type' | 'size' };

const ALLOWED_TYPE = 'image/webp';

export function validateUploadFile(
  file: UploadFileMeta
): ValidateUploadFileResult {
  if (file.type !== ALLOWED_TYPE) {
    return { ok: false, reason: 'type' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: 'size' };
  }
  return { ok: true };
}
