import { DEFAULT_WIDTHS, imageUrl } from '@avd/content/image-url';

/**
 * Builds the `/cats` list's cover thumbnail URL. Always uses
 * `DEFAULT_WIDTHS[0]` (the smallest of the four widths the production WAF
 * rule in front of images.animalsvidadigna.org allows verbatim) rather
 * than an arbitrary pixel size chosen for the CSS box the thumbnail is
 * displayed in (64x64, scaled via `object-cover`) — any other width 403s
 * at the edge in production. See tests/cover-thumbnail.test.ts for the bug
 * this replaced (`imageUrl(key, 128, origin)`).
 */
export function coverThumbnailUrl(r2Key: string, origin: string): string {
  return imageUrl(r2Key, DEFAULT_WIDTHS[0], origin);
}
