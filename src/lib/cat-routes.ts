/**
 * Pure path-generation logic for cat detail pages.
 * Extracted for testability.
 */

export interface CatRouteEntry {
  keystatic_slug: string;
  slug_ca?: string;
  slug_es?: string;
}

export interface CatStaticPath {
  params: { slug: string };
  props: { keystatic_slug: string };
}

/**
 * Generate static paths for Catalan cat routes.
 * Uses the keystatic slug (which IS slug_ca) as the URL slug.
 */
export function generateCatPathsCa(entries: CatRouteEntry[]): CatStaticPath[] {
  return entries.map((entry) => ({
    params: { slug: entry.keystatic_slug },
    props: { keystatic_slug: entry.keystatic_slug },
  }));
}

/**
 * Generate static paths for Spanish cat routes.
 * Uses slug_es if available, falls back to keystatic slug.
 */
export function generateCatPathsEs(entries: CatRouteEntry[]): CatStaticPath[] {
  return entries.map((entry) => ({
    params: { slug: entry.slug_es || entry.keystatic_slug },
    props: { keystatic_slug: entry.keystatic_slug },
  }));
}
