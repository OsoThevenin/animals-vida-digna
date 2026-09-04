import type { CatWithImages } from './cats';

export interface LocalizedImage {
  key: string;
  alt: string;
  width: number;
  height: number;
}

export interface LocalizedCat {
  name: string;
  slug: string;
  race: string;
  shortDescription: string;
  description: string;
  specialNeeds: string;
  observations: string;
  status: string;
  age: number | null;
  gender: string;
  size: string;
  personality: string[];
  goodWith: string[];
  healthStatus: string;
  vaccinated: boolean;
  microchipped: boolean;
  sterilized: boolean;
  weight: number | null;
  rescueDate: string | null;
  adoptionDate: string | null;
  featured: boolean;
  order: number;
  coverImage: LocalizedImage | null;
  gallery: LocalizedImage[];
  seo: { title: string; description: string } | null;
}

function toLocalizedImage(
  image: CatWithImages['images'][number],
  locale: 'ca' | 'es'
): LocalizedImage {
  return {
    key: image.r2Key,
    alt: locale === 'ca' ? image.altCa : image.altEs,
    width: image.width,
    height: image.height,
  };
}

export function localizeCat(
  cat: CatWithImages,
  locale: 'ca' | 'es'
): LocalizedCat {
  return {
    name: locale === 'ca' ? cat.nameCa : cat.nameEs,
    slug: locale === 'ca' ? cat.slugCa : cat.slugEs,
    race: locale === 'ca' ? cat.raceCa : cat.raceEs,
    shortDescription:
      locale === 'ca' ? cat.shortDescriptionCa : cat.shortDescriptionEs,
    description: locale === 'ca' ? cat.descriptionCa : cat.descriptionEs,
    specialNeeds: locale === 'ca' ? cat.specialNeedsCa : cat.specialNeedsEs,
    observations: locale === 'ca' ? cat.observationsCa : cat.observationsEs,
    status: cat.status,
    age: cat.age,
    gender: cat.gender,
    size: cat.size,
    personality: cat.personality,
    goodWith: cat.goodWith,
    healthStatus: cat.healthStatus,
    vaccinated: cat.vaccinated,
    microchipped: cat.microchipped,
    sterilized: cat.sterilized,
    weight: cat.weight,
    rescueDate: cat.rescueDate,
    adoptionDate: cat.adoptionDate,
    featured: cat.featured,
    order: cat.sortOrder,
    coverImage: cat.coverImage ? toLocalizedImage(cat.coverImage, locale) : null,
    gallery: cat.images.map((image) => toLocalizedImage(image, locale)),
    seo:
      locale === 'ca'
        ? { title: cat.seoTitleCa, description: cat.seoDescriptionCa }
        : { title: cat.seoTitleEs, description: cat.seoDescriptionEs },
  };
}
