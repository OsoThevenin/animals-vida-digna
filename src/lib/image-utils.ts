/** Default responsive breakpoint widths */
export const DEFAULT_WIDTHS = [320, 640, 960, 1280];

/** Default sizes attribute for responsive images */
export const DEFAULT_SIZES = '(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw';

/**
 * Generate a Cloudflare Image Resizing URL for a given image source and width.
 * In dev mode, returns the raw source path (no resizing available locally).
 */
export function imageUrl(src: string, width: number, isDev: boolean): string {
  if (isDev) {
    return normalizeSrc(src);
  }
  const normalized = normalizeSrc(src);
  return `/cdn-cgi/image/format=auto,fit=cover,width=${width},quality=80/${normalized}`;
}

/**
 * Generate a complete srcset string for responsive images.
 */
export function generateSrcset(src: string, widths: number[], isDev: boolean): string {
  return widths
    .map((w) => `${imageUrl(src, w, isDev)} ${w}w`)
    .join(', ');
}

/** Strip leading slash from src to avoid double-slash in generated URLs */
function normalizeSrc(src: string): string {
  return src.startsWith('/') ? src.slice(1) : src;
}
