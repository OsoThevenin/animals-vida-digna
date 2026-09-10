import { describe, expect, it } from 'vitest';
import {
  CAT_GENDERS,
  CAT_GOOD_WITH,
  CAT_HEALTH_STATUSES,
  CAT_PERSONALITIES,
  CAT_SIZES,
  CAT_STATUSES,
  catInputSchema,
  SlugifyError,
  slugify,
} from '../src/validate';

const validInput = {
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
  personality: ['playful', 'curious', 'social'],
  goodWith: ['children', 'other-cats', 'dogs'],
  healthStatus: 'healthy',
  vaccinated: true,
  microchipped: true,
  sterilized: true,
  weight: 3.1,
  rescueDate: '2025-01-10',
  adoptionDate: null,
  specialNeedsCa: '',
  specialNeedsEs: '',
  observationsCa: '',
  observationsEs: '',
  shortDescriptionCa: 'Una gateta jove i juganera.',
  shortDescriptionEs: 'Una gatita joven y juguetona.',
  descriptionCa: 'En Lluna es...',
  descriptionEs: 'Lluna es...',
  seoTitleCa: 'Adopta la Lluna',
  seoTitleEs: 'Adopta a Luna',
  seoDescriptionCa: 'Lluna es una gata siames...',
  seoDescriptionEs: 'Luna es una gata siames...',
  featured: true,
  sortOrder: 2,
  published: true,
};

describe('catInputSchema', () => {
  it('accepts a fully populated valid cat', () => {
    const result = catInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects a missing nameCa', () => {
    const result = catInputSchema.safeParse({ ...validInput, nameCa: '' });
    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0].path[0]).toBe(
      'nameCa'
    );
  });

  it('rejects an invalid status', () => {
    const result = catInputSchema.safeParse({ ...validInput, status: 'lost' });
    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0].path[0]).toBe(
      'status'
    );
  });

  it('rejects a negative age', () => {
    const result = catInputSchema.safeParse({ ...validInput, age: -1 });
    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0].path[0]).toBe(
      'age'
    );
  });

  it('accepts a null age', () => {
    const result = catInputSchema.safeParse({ ...validInput, age: null });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid gender', () => {
    const result = catInputSchema.safeParse({ ...validInput, gender: 'other' });
    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0].path[0]).toBe(
      'gender'
    );
  });

  it('rejects an invalid size', () => {
    const result = catInputSchema.safeParse({ ...validInput, size: 'huge' });
    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0].path[0]).toBe(
      'size'
    );
  });

  it('rejects an invalid personality value and dedupes valid ones', () => {
    const invalid = catInputSchema.safeParse({
      ...validInput,
      personality: ['playful', 'grumpy'],
    });
    expect(invalid.success).toBe(false);

    const deduped = catInputSchema.parse({
      ...validInput,
      personality: ['playful', 'playful', 'curious'],
    });
    expect(deduped.personality).toEqual(['playful', 'curious']);
  });

  it('rejects an invalid goodWith value', () => {
    const result = catInputSchema.safeParse({
      ...validInput,
      goodWith: ['children', 'birds'],
    });
    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0].path[0]).toBe(
      'goodWith'
    );
  });

  it('rejects an invalid healthStatus', () => {
    const result = catInputSchema.safeParse({
      ...validInput,
      healthStatus: 'terminal',
    });
    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0].path[0]).toBe(
      'healthStatus'
    );
  });

  it('rejects a negative weight', () => {
    const result = catInputSchema.safeParse({ ...validInput, weight: -0.5 });
    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0].path[0]).toBe(
      'weight'
    );
  });

  it('accepts a null weight', () => {
    const result = catInputSchema.safeParse({ ...validInput, weight: null });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed rescueDate', () => {
    const result = catInputSchema.safeParse({
      ...validInput,
      rescueDate: '10/01/2025',
    });
    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0].path[0]).toBe(
      'rescueDate'
    );
  });

  it('accepts a null rescueDate and adoptionDate', () => {
    const result = catInputSchema.safeParse({
      ...validInput,
      rescueDate: null,
      adoptionDate: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed adoptionDate', () => {
    const result = catInputSchema.safeParse({
      ...validInput,
      adoptionDate: 'not-a-date',
    });
    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0].path[0]).toBe(
      'adoptionDate'
    );
  });

  it('defaults text fields to empty string when omitted', () => {
    const { raceCa, raceEs, specialNeedsCa, ...rest } = validInput;
    const result = catInputSchema.parse(rest);
    expect(result.raceCa).toBe('');
    expect(result.raceEs).toBe('');
    expect(result.specialNeedsCa).toBe('');
  });

  it('defaults sortOrder to 0 and published to true when omitted', () => {
    const { sortOrder, published, ...rest } = validInput;
    const result = catInputSchema.parse(rest);
    expect(result.sortOrder).toBe(0);
    expect(result.published).toBe(true);
  });
});

describe('catInputSchema slug format', () => {
  it('rejects a slugCa with spaces (would produce an unreachable URL)', () => {
    const result = catInputSchema.safeParse({
      ...validInput,
      slugCa: 'Lluna Blanca',
    });
    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0].path[0]).toBe(
      'slugCa'
    );
  });

  it('rejects a slugEs with a slash', () => {
    const result = catInputSchema.safeParse({
      ...validInput,
      slugEs: 'a/b',
    });
    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0].path[0]).toBe(
      'slugEs'
    );
  });

  it('rejects uppercase and accented slugs', () => {
    const upper = catInputSchema.safeParse({ ...validInput, slugCa: 'Lluna' });
    expect(upper.success).toBe(false);

    const accented = catInputSchema.safeParse({
      ...validInput,
      slugCa: 'gatét',
    });
    expect(accented.success).toBe(false);
  });

  it('accepts a well-formed slug', () => {
    const result = catInputSchema.safeParse({
      ...validInput,
      slugCa: 'lluna-blanca-2',
    });
    expect(result.success).toBe(true);
  });
});

describe('const enum arrays', () => {
  it('matches the values in keystatic.config.tsx', () => {
    expect(CAT_STATUSES).toEqual([
      'available',
      'adopted',
      'treatment',
      'unavailable',
    ]);
    expect(CAT_GENDERS).toEqual(['male', 'female']);
    expect(CAT_SIZES).toEqual(['small', 'medium', 'large']);
    expect(CAT_PERSONALITIES).toEqual([
      'playful',
      'calm',
      'shy',
      'affectionate',
      'independent',
      'social',
      'curious',
      'protective',
    ]);
    expect(CAT_GOOD_WITH).toEqual([
      'children',
      'other-cats',
      'dogs',
      'elderly',
    ]);
    expect(CAT_HEALTH_STATUSES).toEqual([
      'healthy',
      'treatment',
      'special-needs',
    ]);
  });
});

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Lluna Blanca')).toBe('lluna-blanca');
  });

  it('strips accents', () => {
    expect(slugify('Gatét Petit')).toBe('gatet-petit');
  });

  it('collapses repeated separators and trims leading/trailing hyphens', () => {
    expect(slugify('  Misi   (gata)! ')).toBe('misi-gata');
  });

  it('does not regress known Catalan/Spanish diacritic handling', () => {
    expect(slugify('Niño')).toBe('nino');
    expect(slugify('Tranquil·la')).toBe('tranquil-la');
    expect(slugify("L'Anna")).toBe('l-anna');
  });

  it('throws a typed SlugifyError instead of returning empty string', () => {
    expect(() => slugify('   ')).toThrow(SlugifyError);
    expect(() => slugify('猫')).toThrow(SlugifyError);
  });

  it('SlugifyError carries the original input for a legible admin message', () => {
    let caught: unknown;
    try {
      slugify('   ');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(SlugifyError);
    expect((caught as SlugifyError).input).toBe('   ');
    expect((caught as SlugifyError).message).toMatch(/could not derive/i);
  });
});
