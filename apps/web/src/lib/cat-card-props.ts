import type { LocalizedCat } from '@avd/content/localize';

export interface CatCardData {
  name: string;
  slug: string;
  shortDescription: string;
  status: string;
  coverImage: {
    key: string;
    alt: string;
    width: number;
    height: number;
  } | null;
}

/** Map a LocalizedCat to the props CatCard.astro needs. */
export function toCatCardProps(cat: LocalizedCat): CatCardData {
  return {
    name: cat.name,
    slug: cat.slug,
    shortDescription: cat.shortDescription ?? '',
    status: cat.status,
    coverImage: cat.coverImage,
  };
}
