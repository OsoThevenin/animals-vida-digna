import { describe, expect, it } from 'vitest';
import type { LocalizedCat } from '@avd/content/localize';
import { toCatCardProps } from '../src/lib/cat-card-props';

function makeLocalizedCat(
  overrides: Partial<LocalizedCat> = {}
): LocalizedCat {
  return {
    name: 'Luna',
    slug: 'luna',
    race: '',
    shortDescription: 'A sweet cat',
    description: '',
    specialNeeds: '',
    observations: '',
    status: 'available',
    age: 2,
    gender: 'female',
    size: 'medium',
    personality: ['playful'],
    goodWith: [],
    healthStatus: 'healthy',
    vaccinated: true,
    microchipped: true,
    sterilized: true,
    weight: 3.5,
    rescueDate: null,
    adoptionDate: null,
    featured: true,
    order: 0,
    coverImage: {
      key: 'cats/abc/1.webp',
      alt: 'Luna smiling',
      width: 1280,
      height: 960,
    },
    gallery: [],
    seo: null,
    ...overrides,
  } as LocalizedCat;
}

describe('toCatCardProps', () => {
  it('maps the fields CatCard needs', () => {
    const cat = makeLocalizedCat();
    expect(toCatCardProps(cat)).toEqual({
      name: 'Luna',
      slug: 'luna',
      shortDescription: 'A sweet cat',
      status: 'available',
      coverImage: {
        key: 'cats/abc/1.webp',
        alt: 'Luna smiling',
        width: 1280,
        height: 960,
      },
    });
  });

  it('defaults shortDescription to empty string when falsy', () => {
    const cat = makeLocalizedCat({ shortDescription: '' });
    expect(toCatCardProps(cat).shortDescription).toBe('');
  });

  it('maps null coverImage to null', () => {
    const cat = makeLocalizedCat({ coverImage: null });
    expect(toCatCardProps(cat).coverImage).toBeNull();
  });
});
