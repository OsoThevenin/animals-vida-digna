import {
  DEFAULT_IMAGES_ORIGIN,
  DEFAULT_SIZES as R2_DEFAULT_SIZES,
  DEFAULT_WIDTHS as R2_DEFAULT_WIDTHS,
  imageSrcset as r2ImageSrcset,
  imageUrl as r2ImageUrl,
} from '@avd/content/image-url';
import {
  DEFAULT_SIZES,
  DEFAULT_WIDTHS,
  generateSrcset,
  imageUrl as siteImageUrl,
} from './image-utils';

export interface OptimizedImageInput {
  src?: string;
  r2Key?: string;
  widths?: number[];
  sizes?: string;
  width?: number;
  isDev: boolean;
  imagesOrigin?: string;
}

export interface OptimizedImageSource {
  src: string;
  srcset: string;
  sizes: string;
  width: number;
}

/**
 * Choose the transform width to send to Cloudflare Images for a given
 * intrinsic width, constrained to an allowlist of widths (the four widths a
 * production WAF rule allows verbatim on images.animalsvidadigna.org).
 *
 * Rule: the smallest allowlisted width that is >= the intrinsic width (so
 * the delivered image is never smaller/blurrier than the space it fills);
 * if the intrinsic width exceeds every allowlisted width (real stored
 * widths run up to MAX_UPLOAD_EDGE = 2000, above the largest allowlisted
 * width of 1280), fall back to the largest allowlisted width.
 */
function pickAllowlistedTransformWidth(
  intrinsicWidth: number,
  allowedWidths: number[]
): number {
  const sorted = [...allowedWidths].sort((a, b) => a - b);
  return sorted.find((w) => w >= intrinsicWidth) ?? sorted[sorted.length - 1];
}

/**
 * Resolve the <img> src/srcset/sizes/width for OptimizedImage.astro.
 * Exactly one of `src` (site-relative static asset) or `r2Key` (R2 object
 * key, resolved through the images origin) must be given.
 */
export function resolveOptimizedImageSource(
  input: OptimizedImageInput
): OptimizedImageSource {
  const hasSrc = input.src != null;
  const hasR2Key = input.r2Key != null;
  if (hasSrc === hasR2Key) {
    throw new Error(
      'OptimizedImage requires exactly one of "src" or "r2Key"'
    );
  }

  if (hasR2Key) {
    const origin = input.imagesOrigin ?? DEFAULT_IMAGES_ORIGIN;
    const widths = input.widths ?? R2_DEFAULT_WIDTHS;
    // `intrinsicWidth` is the real (stored) pixel width of the source image
    // -- it becomes the HTML `width` attribute, which the browser needs to
    // reserve layout space and avoid CLS. It must NEVER be used to build the
    // transform URL directly: the production WAF rule in front of
    // images.animalsvidadigna.org only allows the four widths in
    // R2_DEFAULT_WIDTHS (320/640/960/1280) verbatim -- any other width
    // (including real stored widths up to MAX_UPLOAD_EDGE = 2000) returns a
    // 403. `transformWidth` is the allowlisted width actually sent to
    // Cloudflare Images.
    const intrinsicWidth = input.width ?? widths[widths.length - 1];
    const transformWidth = pickAllowlistedTransformWidth(
      intrinsicWidth,
      widths
    );
    return {
      src: r2ImageUrl(input.r2Key as string, transformWidth, origin),
      srcset: r2ImageSrcset(input.r2Key as string, widths, origin),
      sizes: input.sizes ?? R2_DEFAULT_SIZES,
      width: intrinsicWidth,
    };
  }

  const widths = input.widths ?? DEFAULT_WIDTHS;
  const width = input.width ?? widths[widths.length - 1];
  return {
    src: siteImageUrl(input.src as string, width, input.isDev),
    srcset: generateSrcset(input.src as string, widths, input.isDev),
    sizes: input.sizes ?? DEFAULT_SIZES,
    width,
  };
}
