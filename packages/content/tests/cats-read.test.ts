import { sql } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  createCat,
  getCatById,
  getCatBySlug,
  listAllCats,
  listFeaturedCats,
  listPublishedCats,
} from '../src/cats';
import type { CatInput } from '../src/validate';
import { setupTestDb, type TestDb } from './helpers/db';

let ctx: TestDb;

function baseInput(overrides: Partial<CatInput> = {}): CatInput {
  return {
    slugCa: 'misi',
    slugEs: 'misi',
    nameCa: 'Misi',
    nameEs: 'Misi',
    raceCa: 'Europeu',
    raceEs: 'Europeo',
    status: 'available',
    age: 3,
    gender: 'female',
    size: 'medium',
    personality: ['affectionate', 'calm'],
    goodWith: ['children', 'other-cats'],
    healthStatus: 'healthy',
    vaccinated: true,
    microchipped: true,
    sterilized: true,
    weight: 4.2,
    rescueDate: '2024-06-15',
    adoptionDate: null,
    specialNeedsCa: '',
    specialNeedsEs: '',
    observationsCa: '',
    observationsEs: '',
    shortDescriptionCa: 'Una gata dolca.',
    shortDescriptionEs: 'Una gata dulce.',
    descriptionCa: 'Misi es...',
    descriptionEs: 'Misi es...',
    seoTitleCa: 'Adopta la Misi',
    seoTitleEs: 'Adopta a Misi',
    seoDescriptionCa: 'Misi...',
    seoDescriptionEs: 'Misi...',
    featured: false,
    sortOrder: 1,
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

describe('createCat + getCatById', () => {
  it('creates a cat and reads it back with empty images', async () => {
    const created = await createCat(
      ctx.db,
      baseInput(),
      'volunteer@example.org'
    );
    expect(created.id).toHaveLength(21);
    expect(created.nameCa).toBe('Misi');
    expect(created.images).toEqual([]);
    expect(created.coverImage).toBeNull();
    expect(created.updatedBy).toBe('volunteer@example.org');
    expect(created.createdAt).toBe(created.updatedAt);

    const fetched = await getCatById(ctx.db, created.id);
    expect(fetched?.nameCa).toBe('Misi');

    // Type-level assertion: schema.ts's `.$type<CatStatus>()` on the
    // `status` column narrows Cat['status'] (and CatWithImages['status'])
    // from `string` to the literal union below — this line only compiles
    // if that narrowing is in effect.
    const status: 'available' | 'adopted' | 'treatment' | 'unavailable' =
      created.status;
    expect(status).toBe('available');
  });

  it('returns null for a missing id', async () => {
    const fetched = await getCatById(ctx.db, 'does-not-exist');
    expect(fetched).toBeNull();
  });
});

describe('getCatBySlug', () => {
  it('finds a published cat by its ca slug', async () => {
    await createCat(
      ctx.db,
      baseInput({ slugCa: 'misi', slugEs: 'misi-es' }),
      'a@b.org'
    );
    const found = await getCatBySlug(ctx.db, 'ca', 'misi');
    expect(found?.slugCa).toBe('misi');
  });

  it('finds a published cat by its es slug', async () => {
    await createCat(
      ctx.db,
      baseInput({ slugCa: 'misi', slugEs: 'misi-es' }),
      'a@b.org'
    );
    const found = await getCatBySlug(ctx.db, 'es', 'misi-es');
    expect(found?.slugEs).toBe('misi-es');
  });

  it('hides an unpublished cat from getCatBySlug', async () => {
    await createCat(ctx.db, baseInput({ published: false }), 'a@b.org');
    const found = await getCatBySlug(ctx.db, 'ca', 'misi');
    expect(found).toBeNull();
  });

  it('returns null for a slug that does not exist', async () => {
    const found = await getCatBySlug(ctx.db, 'ca', 'nope');
    expect(found).toBeNull();
  });
});

describe('listPublishedCats', () => {
  it('excludes unpublished cats and orders by sortOrder then nameCa', async () => {
    await createCat(
      ctx.db,
      baseInput({
        slugCa: 'zorro',
        slugEs: 'zorro',
        nameCa: 'Zorro',
        sortOrder: 0,
      }),
      'a@b.org'
    );
    await createCat(
      ctx.db,
      baseInput({
        slugCa: 'anna',
        slugEs: 'anna',
        nameCa: 'Anna',
        sortOrder: 0,
      }),
      'a@b.org'
    );
    await createCat(
      ctx.db,
      baseInput({
        slugCa: 'hidden',
        slugEs: 'hidden',
        nameCa: 'Hidden',
        published: false,
      }),
      'a@b.org'
    );

    const cats = await listPublishedCats(ctx.db);
    expect(cats.map((c) => c.nameCa)).toEqual(['Anna', 'Zorro']);
  });
});

describe('listFeaturedCats', () => {
  it('returns only published and featured cats, respecting limit', async () => {
    await createCat(
      ctx.db,
      baseInput({ slugCa: 'f1', slugEs: 'f1', nameCa: 'F1', featured: true }),
      'a@b.org'
    );
    await createCat(
      ctx.db,
      baseInput({ slugCa: 'f2', slugEs: 'f2', nameCa: 'F2', featured: true }),
      'a@b.org'
    );
    await createCat(
      ctx.db,
      baseInput({ slugCa: 'nf', slugEs: 'nf', nameCa: 'NF', featured: false }),
      'a@b.org'
    );
    await createCat(
      ctx.db,
      baseInput({
        slugCa: 'hiddenf',
        slugEs: 'hiddenf',
        nameCa: 'HiddenF',
        featured: true,
        published: false,
      }),
      'a@b.org'
    );

    const featured = await listFeaturedCats(ctx.db);
    expect(featured.map((c) => c.nameCa).sort()).toEqual(['F1', 'F2']);

    const limited = await listFeaturedCats(ctx.db, 1);
    expect(limited).toHaveLength(1);
  });
});

describe('listAllCats', () => {
  it('includes unpublished cats', async () => {
    await createCat(ctx.db, baseInput({ published: true }), 'a@b.org');
    await createCat(
      ctx.db,
      baseInput({ slugCa: 'draft', slugEs: 'draft', published: false }),
      'a@b.org'
    );
    const all = await listAllCats(ctx.db);
    expect(all).toHaveLength(2);
  });
});
