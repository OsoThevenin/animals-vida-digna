import type { Locale } from './index';

/**
 * Read a locale-suffixed field from a content entry.
 * e.g. getLocalizedField(entry, 'name', 'ca') reads entry.name_ca
 */
export function getLocalizedField<T>(
  entry: Record<string, T>,
  fieldName: string,
  locale: Locale,
): T {
  return entry[`${fieldName}_${locale}`];
}

/**
 * Map a raw Keystatic cat entry to a clean localized object.
 * Shared fields (age, gender, status, etc.) pass through directly.
 */
export function getLocalizedCat(catEntry: Record<string, unknown>, locale: Locale) {
  return {
    // Localized text fields
    name: getLocalizedField(catEntry, 'name', locale) as string,
    slug: getLocalizedField(catEntry, 'slug', locale) as string,
    race: getLocalizedField(catEntry, 'race', locale) as string,
    shortDescription: getLocalizedField(catEntry, 'shortDescription', locale) as string,
    description: getLocalizedField(catEntry, 'description', locale),
    specialNeeds: getLocalizedField(catEntry, 'specialNeeds', locale) as string,
    observations: getLocalizedField(catEntry, 'observations', locale) as string,

    // Shared fields (not locale-dependent)
    status: catEntry.status as string,
    age: catEntry.age as number | null,
    gender: catEntry.gender as string,
    size: catEntry.size as string,
    personality: catEntry.personality as string[],
    goodWith: catEntry.goodWith as string[],
    healthStatus: catEntry.healthStatus as string,
    vaccinated: catEntry.vaccinated as boolean,
    microchipped: catEntry.microchipped as boolean,
    sterilized: catEntry.sterilized as boolean,
    weight: catEntry.weight as number | null,
    rescueDate: catEntry.rescueDate as string | null,
    adoptionDate: catEntry.adoptionDate as string | null,
    featured: catEntry.featured as boolean,
    order: catEntry.order as number,

    // Cover image with localized alt
    coverImage: catEntry.coverImage
      ? {
          src: (catEntry.coverImage as Record<string, unknown>).src as string,
          alt: getLocalizedField(
            catEntry.coverImage as Record<string, string>,
            'alt',
            locale,
          ),
        }
      : null,

    // Gallery with localized alts
    gallery: Array.isArray(catEntry.gallery)
      ? (catEntry.gallery as Record<string, unknown>[]).map((img) => ({
          src: img.src as string,
          alt: getLocalizedField(img as Record<string, string>, 'alt', locale),
        }))
      : [],

    // SEO
    seo: catEntry.seo
      ? {
          title: getLocalizedField(
            catEntry.seo as Record<string, string>,
            'title',
            locale,
          ),
          description: getLocalizedField(
            catEntry.seo as Record<string, string>,
            'description',
            locale,
          ),
        }
      : null,
  };
}
