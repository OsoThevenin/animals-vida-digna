import { sql } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupTestDb, type TestDb } from './helpers/db';
import { createCat, deleteCat, getCatById, updateCat } from '../src/cats';
import type { CatInput } from '../src/validate';

let ctx: TestDb;

function baseInput(overrides: Partial<CatInput> = {}): CatInput {
  return {
    slugCa: 'garfield',
    slugEs: 'garfield',
    nameCa: 'Garfield',
    nameEs: 'Garfield',
    raceCa: 'Persa',
    raceEs: 'Persa',
    status: 'treatment',
    age: 5,
    gender: 'male',
    size: 'large',
    personality: ['calm', 'independent'],
    goodWith: ['elderly'],
    healthStatus: 'treatment',
    vaccinated: true,
    microchipped: true,
    sterilized: true,
    weight: 6.8,
    rescueDate: '2025-02-20',
    adoptionDate: null,
    specialNeedsCa: 'Tractament dental en curs',
    specialNeedsEs: 'Tratamiento dental en curso',
    observationsCa: '',
    observationsEs: '',
    shortDescriptionCa: 'Un gat gran i tranquil.',
    shortDescriptionEs: 'Un gato grande y tranquilo.',
    descriptionCa: 'En Garfield...',
    descriptionEs: 'Garfield es...',
    seoTitleCa: 'Garfield',
    seoTitleEs: 'Garfield',
    seoDescriptionCa: 'Garfield...',
    seoDescriptionEs: 'Garfield...',
    featured: false,
    sortOrder: 3,
    published: true,
    ...overrides,
  };
}

beforeAll(async () => {
  ctx = await setupTestDb();
});

afterEach(async () => {
  await ctx.db.run(sql`DELETE FROM cat_images`);
  await ctx.db.run(sql`DELETE FROM cats`);
});

afterAll(async () => {
  await ctx.dispose();
});

describe('updateCat', () => {
  it('updates fields and bumps updatedAt/updatedBy', async () => {
    const created = await createCat(ctx.db, baseInput(), 'first@example.org');
    await new Promise((r) => setTimeout(r, 5));

    const updated = await updateCat(
      ctx.db,
      created.id,
      baseInput({ status: 'available', age: 6 }),
      'second@example.org'
    );

    expect(updated.status).toBe('available');
    expect(updated.age).toBe(6);
    expect(updated.updatedBy).toBe('second@example.org');
    expect(updated.updatedAt).not.toBe(created.updatedAt);
    expect(updated.createdAt).toBe(created.createdAt);
  });

  it('throws when updating a missing id', async () => {
    await expect(
      updateCat(ctx.db, 'missing-id', baseInput(), 'a@b.org')
    ).rejects.toThrow();
  });
});

describe('deleteCat', () => {
  it('deletes the cat and returns an empty r2Keys array when it has no images', async () => {
    const created = await createCat(ctx.db, baseInput(), 'a@b.org');
    const { r2Keys } = await deleteCat(ctx.db, created.id);
    expect(r2Keys).toEqual([]);
    expect(await getCatById(ctx.db, created.id)).toBeNull();
  });
});
