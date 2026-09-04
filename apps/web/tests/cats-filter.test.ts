import { describe, expect, it } from 'vitest';
import {
  filterCats,
  type CatFilterData,
  type CatFilterState,
} from '../src/lib/cat-filters';

const makeCat = (overrides: Partial<CatFilterData> = {}): CatFilterData => ({
  id: 'test-cat-id',
  name: 'Test Cat',
  slug: 'test-cat',
  status: 'available',
  age: 3,
  gender: 'female',
  personality: ['playful', 'social'],
  coverImage: {
    key: 'cats/test-cat-id/1.webp',
    alt: 'Test',
    width: 1280,
    height: 960,
  },
  shortDescription: 'A test cat',
  featured: false,
  ...overrides,
});

const sampleCats: CatFilterData[] = [
  makeCat({
    id: 'luna',
    name: 'Luna',
    slug: 'luna',
    status: 'available',
    gender: 'female',
    personality: ['playful', 'affectionate'],
    featured: true,
  }),
  makeCat({
    id: 'michi',
    name: 'Michi',
    slug: 'michi',
    status: 'adopted',
    gender: 'male',
    personality: ['calm', 'social'],
  }),
  makeCat({
    id: 'nala',
    name: 'Nala',
    slug: 'nala',
    status: 'available',
    gender: 'female',
    personality: ['shy', 'calm'],
  }),
  makeCat({
    id: 'simba',
    name: 'Simba',
    slug: 'simba',
    status: 'treatment',
    gender: 'male',
    personality: ['playful', 'curious'],
  }),
  makeCat({
    id: 'cleo',
    name: 'Cleo',
    slug: 'cleo',
    status: 'available',
    gender: 'male',
    personality: ['independent'],
    featured: true,
  }),
];

describe('filterCats', () => {
  it('returns all cats when all filters are "all"', () => {
    const filters: CatFilterState = {
      status: 'all',
      gender: 'all',
      personality: 'all',
    };
    expect(filterCats(sampleCats, filters)).toHaveLength(5);
  });

  it('filters by status "available"', () => {
    const filters: CatFilterState = {
      status: 'available',
      gender: 'all',
      personality: 'all',
    };
    const result = filterCats(sampleCats, filters);
    expect(result).toHaveLength(3);
    expect(result.every((c) => c.status === 'available')).toBe(true);
  });

  it('filters by status "adopted"', () => {
    const filters: CatFilterState = {
      status: 'adopted',
      gender: 'all',
      personality: 'all',
    };
    const result = filterCats(sampleCats, filters);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Michi');
  });

  it('filters by gender "female"', () => {
    const filters: CatFilterState = {
      status: 'all',
      gender: 'female',
      personality: 'all',
    };
    const result = filterCats(sampleCats, filters);
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.gender === 'female')).toBe(true);
  });

  it('filters by gender "male"', () => {
    const filters: CatFilterState = {
      status: 'all',
      gender: 'male',
      personality: 'all',
    };
    const result = filterCats(sampleCats, filters);
    expect(result).toHaveLength(3);
  });

  it('filters by personality trait', () => {
    const filters: CatFilterState = {
      status: 'all',
      gender: 'all',
      personality: 'playful',
    };
    const result = filterCats(sampleCats, filters);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.name).sort()).toEqual(['Luna', 'Simba']);
  });

  it('applies AND logic with multiple filters (status=available AND gender=female)', () => {
    const filters: CatFilterState = {
      status: 'available',
      gender: 'female',
      personality: 'all',
    };
    const result = filterCats(sampleCats, filters);
    expect(result).toHaveLength(2);
    expect(
      result.every((c) => c.status === 'available' && c.gender === 'female')
    ).toBe(true);
  });

  it('applies AND logic with all three filters', () => {
    const filters: CatFilterState = {
      status: 'available',
      gender: 'female',
      personality: 'playful',
    };
    const result = filterCats(sampleCats, filters);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Luna');
  });

  it('returns empty array when no cats match', () => {
    const filters: CatFilterState = {
      status: 'adopted',
      gender: 'female',
      personality: 'all',
    };
    const result = filterCats(sampleCats, filters);
    expect(result).toHaveLength(0);
  });

  it('featured filter can be applied by pre-filtering the input', () => {
    const featuredCats = sampleCats.filter((c) => c.featured);
    const filters: CatFilterState = {
      status: 'all',
      gender: 'all',
      personality: 'all',
    };
    const result = filterCats(featuredCats, filters);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.name).sort()).toEqual(['Cleo', 'Luna']);
  });
});
