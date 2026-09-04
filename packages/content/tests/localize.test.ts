import { describe, expect, it } from 'vitest';
import type { CatWithImages } from '../src/cats';
import { localizeCat } from '../src/localize';

function makeCat(overrides: Partial<CatWithImages> = {}): CatWithImages {
  const base: CatWithImages = {
    id: 'cat_1',
    slugCa: 'lluna',
    slugEs: 'luna',
    nameCa: 'Lluna',
    nameEs: 'Luna',
    raceCa: 'Siames',
    raceEs: 'Siames',
    status: 'available',
    age: 1,
    gender: 'female',
    size: 'small',
    personality: ['playful', 'curious'],
    goodWith: ['children'],
    healthStatus: 'healthy',
    vaccinated: true,
    microchipped: true,
    sterilized: true,
    weight: 3.1,
    rescueDate: '2025-01-10',
    adoptionDate: null,
    specialNeedsCa: '',
    specialNeedsEs: '',
    observationsCa: 'Cap',
    observationsEs: 'Ninguna',
    shortDescriptionCa: 'Curta CA',
    shortDescriptionEs: 'Corta ES',
    descriptionCa: '# Lluna\n\nUna gata molt bonica.',
    descriptionEs: '# Luna\n\nUna gata muy bonita.',
    seoTitleCa: 'Adopta la Lluna',
    seoTitleEs: 'Adopta a Luna',
    seoDescriptionCa: 'SEO CA',
    seoDescriptionEs: 'SEO ES',
    featured: true,
    sortOrder: 2,
    published: true,
    coverImageId: 'img_1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'seed',
    images: [
      {
        id: 'img_1',
        catId: 'cat_1',
        r2Key: 'cats/cat_1/img_1.webp',
        altCa: 'Lluna asseguda',
        altEs: 'Luna sentada',
        width: 800,
        height: 600,
        position: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'img_2',
        catId: 'cat_1',
        r2Key: 'cats/cat_1/img_2.webp',
        altCa: 'Lluna jugant',
        altEs: 'Luna jugando',
        width: 800,
        height: 600,
        position: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    coverImage: null,
    ...overrides,
  };
  base.coverImage =
    overrides.coverImage !== undefined
      ? overrides.coverImage
      : (base.images.find((img) => img.id === base.coverImageId) ?? null);
  return base;
}

describe('localizeCat', () => {
  it('returns the ca-localized shape', () => {
    const cat = makeCat();
    const result = localizeCat(cat, 'ca');

    expect(result.name).toBe('Lluna');
    expect(result.slug).toBe('lluna');
    expect(result.race).toBe('Siames');
    expect(result.shortDescription).toBe('Curta CA');
    expect(result.description).toBe('# Lluna\n\nUna gata molt bonica.');
    expect(result.observations).toBe('Cap');
    expect(result.status).toBe('available');
    expect(result.age).toBe(1);
    expect(result.personality).toEqual(['playful', 'curious']);
    expect(result.order).toBe(2);
    expect(result.coverImage).toEqual({
      key: 'cats/cat_1/img_1.webp',
      alt: 'Lluna asseguda',
      width: 800,
      height: 600,
    });
    expect(result.gallery).toEqual([
      {
        key: 'cats/cat_1/img_1.webp',
        alt: 'Lluna asseguda',
        width: 800,
        height: 600,
      },
      {
        key: 'cats/cat_1/img_2.webp',
        alt: 'Lluna jugant',
        width: 800,
        height: 600,
      },
    ]);
    expect(result.seo).toEqual({
      title: 'Adopta la Lluna',
      description: 'SEO CA',
    });
  });

  it('returns the es-localized shape', () => {
    const cat = makeCat();
    const result = localizeCat(cat, 'es');

    expect(result.name).toBe('Luna');
    expect(result.slug).toBe('luna');
    expect(result.description).toBe('# Luna\n\nUna gata muy bonita.');
    expect(result.coverImage?.alt).toBe('Luna sentada');
    expect(result.gallery[1].alt).toBe('Luna jugando');
    expect(result.seo).toEqual({
      title: 'Adopta a Luna',
      description: 'SEO ES',
    });
  });

  it('returns null coverImage when the cat has none', () => {
    const cat = makeCat({ coverImageId: null, coverImage: null });
    const result = localizeCat(cat, 'ca');
    expect(result.coverImage).toBeNull();
  });

  it('returns an empty gallery array when the cat has no images', () => {
    const cat = makeCat({ images: [], coverImage: null, coverImageId: null });
    const result = localizeCat(cat, 'ca');
    expect(result.gallery).toEqual([]);
  });

  it('returns null seo when both title and description are empty for the locale', () => {
    // Matches today's getLocalizedCat (apps/web/src/i18n/content.ts), which
    // returns `seo: null` when the seo object is absent from the source
    // entry. In the DB, "absent" for a locale means both its seo columns
    // are empty — that must still produce `seo: null`, not
    // `{ title: '', description: '' }`.
    const cat = makeCat({ seoTitleEs: '', seoDescriptionEs: '' });
    const result = localizeCat(cat, 'es');
    expect(result.seo).toBeNull();
  });

  it('returns a seo object when only one of title/description is set', () => {
    const cat = makeCat({ seoTitleEs: 'Title only', seoDescriptionEs: '' });
    const result = localizeCat(cat, 'es');
    expect(result.seo).toEqual({ title: 'Title only', description: '' });
  });
});
