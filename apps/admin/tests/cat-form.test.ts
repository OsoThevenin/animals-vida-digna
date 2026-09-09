import { describe, expect, it } from 'vitest';
import {
  catToInput,
  deriveSlugs,
  emptyCatInput,
  formStateToInput,
  inputErrorsToFieldErrors,
} from '../src/lib/cat-form';

describe('emptyCatInput', () => {
  it('has sensible defaults for a new cat', () => {
    const state = emptyCatInput();
    expect(state.status).toBe('available');
    expect(state.gender).toBe('male');
    expect(state.size).toBe('medium');
    expect(state.healthStatus).toBe('healthy');
    expect(state.published).toBe(true);
    expect(state.featured).toBe(false);
    expect(state.sortOrder).toBe('0');
    expect(state.personality).toEqual([]);
    expect(state.goodWith).toEqual([]);
    expect(state.age).toBe('');
    expect(state.weight).toBe('');
    expect(state.slugsEditedManually).toBe(false);
  });
});

describe('catToInput', () => {
  const cat = {
    id: 'cat_1',
    slugCa: 'mimi',
    slugEs: 'mimi-es',
    nameCa: 'Mimi',
    nameEs: 'Mimi',
    raceCa: '',
    raceEs: '',
    status: 'available',
    age: 3,
    gender: 'female',
    size: 'small',
    personality: ['playful', 'curious'],
    goodWith: ['children'],
    healthStatus: 'healthy',
    vaccinated: true,
    microchipped: false,
    sterilized: true,
    weight: 3.5,
    rescueDate: '2026-01-01',
    adoptionDate: null,
    specialNeedsCa: '',
    specialNeedsEs: '',
    observationsCa: '',
    observationsEs: '',
    shortDescriptionCa: 'Molt jugueta',
    shortDescriptionEs: 'Muy juguetona',
    descriptionCa: '',
    descriptionEs: '',
    seoTitleCa: '',
    seoTitleEs: '',
    seoDescriptionCa: '',
    seoDescriptionEs: '',
    featured: true,
    sortOrder: 2,
    published: true,
    coverImageId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'volunteer@example.org',
    images: [],
    coverImage: null,
    // biome-ignore lint/suspicious/noExplicitAny: test fixture, not the real CatWithImages import
  } as any;

  it('stringifies numeric and nullable fields', () => {
    const state = catToInput(cat);
    expect(state.age).toBe('3');
    expect(state.weight).toBe('3.5');
    expect(state.rescueDate).toBe('2026-01-01');
    expect(state.adoptionDate).toBe('');
    expect(state.sortOrder).toBe('2');
    expect(state.slugCa).toBe('mimi');
    expect(state.slugsEditedManually).toBe(true);
  });

  it('preserves boolean and array fields', () => {
    const state = catToInput(cat);
    expect(state.vaccinated).toBe(true);
    expect(state.microchipped).toBe(false);
    expect(state.personality).toEqual(['playful', 'curious']);
    expect(state.goodWith).toEqual(['children']);
  });
});

describe('formStateToInput', () => {
  it('coerces empty numeric strings to null', () => {
    const state = { ...emptyCatInput(), age: '', weight: '' };
    const input = formStateToInput(state) as Record<string, unknown>;
    expect(input.age).toBeNull();
    expect(input.weight).toBeNull();
  });

  it('coerces numeric strings to numbers', () => {
    const state = { ...emptyCatInput(), age: '4', weight: '3.2' };
    const input = formStateToInput(state) as Record<string, unknown>;
    expect(input.age).toBe(4);
    expect(input.weight).toBe(3.2);
  });

  it('coerces empty date strings to null and keeps non-empty dates', () => {
    const state = {
      ...emptyCatInput(),
      rescueDate: '',
      adoptionDate: '2026-02-01',
    };
    const input = formStateToInput(state) as Record<string, unknown>;
    expect(input.rescueDate).toBeNull();
    expect(input.adoptionDate).toBe('2026-02-01');
  });

  it('coerces sortOrder to a number, defaulting to 0 on empty string', () => {
    const state = { ...emptyCatInput(), sortOrder: '' };
    const input = formStateToInput(state) as Record<string, unknown>;
    expect(input.sortOrder).toBe(0);
  });

  it('does not include client-only fields', () => {
    const input = formStateToInput(emptyCatInput()) as Record<string, unknown>;
    expect(input).not.toHaveProperty('slugsEditedManually');
  });

  it('keeps booleans and string arrays as-is', () => {
    const state = {
      ...emptyCatInput(),
      vaccinated: true,
      personality: ['calm'],
    };
    const input = formStateToInput(state) as Record<string, unknown>;
    expect(input.vaccinated).toBe(true);
    expect(input.personality).toEqual(['calm']);
  });
});

describe('deriveSlugs', () => {
  it('derives both slugs from the names when not edited manually', () => {
    const result = deriveSlugs('Bigotis', 'Bigotis', {
      slugCa: '',
      slugEs: '',
      slugsEditedManually: false,
    });
    expect(result).toEqual({ slugCa: 'bigotis', slugEs: 'bigotis' });
  });

  it('keeps existing slugs when the user edited them manually', () => {
    const result = deriveSlugs('Bigotis', 'Bigotis', {
      slugCa: 'custom-slug',
      slugEs: 'custom-slug-es',
      slugsEditedManually: true,
    });
    expect(result).toEqual({
      slugCa: 'custom-slug',
      slugEs: 'custom-slug-es',
    });
  });
});

describe('inputErrorsToFieldErrors', () => {
  it('keeps bare field names as-is in create mode', () => {
    const result = inputErrorsToFieldErrors(
      { nameCa: ['Required'], nameEs: ['Required'] },
      'create'
    );
    expect(result).toEqual({ nameCa: 'Required', nameEs: 'Required' });
  });

  it('strips the "data." prefix in edit mode', () => {
    const result = inputErrorsToFieldErrors(
      { 'data.nameCa': ['Required'] },
      'edit'
    );
    expect(result).toEqual({ nameCa: 'Required' });
  });

  it('takes only the first message per field', () => {
    const result = inputErrorsToFieldErrors(
      { 'data.nameCa': ['Required', 'Too short'] },
      'edit'
    );
    expect(result).toEqual({ nameCa: 'Required' });
  });

  it('skips fields with no messages', () => {
    const result = inputErrorsToFieldErrors(
      { nameCa: undefined, nameEs: [] },
      'create'
    );
    expect(result).toEqual({});
  });

  it('leaves an edit-mode field without the "data." prefix unchanged', () => {
    // Defensive: a top-level Zod issue (e.g. on the whole input object)
    // would not carry the "data." prefix; the mapper must not corrupt it.
    const result = inputErrorsToFieldErrors({ id: ['Required'] }, 'edit');
    expect(result).toEqual({ id: 'Required' });
  });
});
