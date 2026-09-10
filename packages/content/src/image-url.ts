export const DEFAULT_IMAGES_ORIGIN = 'https://images.animalsvidadigna.org';
export const DEFAULT_WIDTHS = [320, 640, 960, 1280];
export const DEFAULT_SIZES =
  '(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw';
export const MAX_UPLOAD_EDGE = 2000;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function imageKey(catId: string, imageId: string): string {
  return `cats/${catId}/${imageId}.webp`;
}

export function originalImageUrl(
  key: string,
  origin: string = DEFAULT_IMAGES_ORIGIN
): string {
  return `${origin}/${key}`;
}

export function imageUrl(
  key: string,
  width: number,
  origin: string = DEFAULT_IMAGES_ORIGIN
): string {
  if (origin === DEFAULT_IMAGES_ORIGIN) {
    return `${origin}/cdn-cgi/image/width=${width},fit=scale-down,quality=80,format=auto,onerror=redirect/${key}`;
  }
  return `${origin}/${key}`;
}

export function imageSrcset(
  key: string,
  widths: number[] = DEFAULT_WIDTHS,
  origin: string = DEFAULT_IMAGES_ORIGIN
): string {
  return widths.map((w) => `${imageUrl(key, w, origin)} ${w}w`).join(', ');
}
