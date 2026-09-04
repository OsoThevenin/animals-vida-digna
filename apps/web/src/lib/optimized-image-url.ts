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
    const width = input.width ?? widths[widths.length - 1];
    return {
      src: r2ImageUrl(input.r2Key as string, width, origin),
      srcset: r2ImageSrcset(input.r2Key as string, widths, origin),
      sizes: input.sizes ?? R2_DEFAULT_SIZES,
      width,
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
