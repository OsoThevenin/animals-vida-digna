import { sql } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  addCatImage,
  createCat,
  deleteCat,
  getCatById,
  removeCatImage,
  setCoverImage,
  updateCatImages,
} from '../src/cats';
import * as schema from '../src/schema';
import type { CatInput } from '../src/validate';
import { setupTestDb, type TestDb } from './helpers/db';

let ctx: TestDb;

function baseInput(overrides: Partial<CatInput> = {}): CatInput {
  return {
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
    personality: ['playful'],
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
    observationsCa: '',
    observationsEs: '',
    shortDescriptionCa: '',
    shortDescriptionEs: '',
    descriptionCa: '',
    descriptionEs: '',
    seoTitleCa: '',
    seoTitleEs: '',
    seoDescriptionCa: '',
    seoDescriptionEs: '',
    featured: false,
    sortOrder: 0,
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

describe('addCatImage', () => {
  it('appends images in position order', async () => {
    const cat = await createCat(ctx.db, baseInput(), 'a@b.org');
    const img1 = await addCatImage(ctx.db, cat.id, {
      r2Key: `cats/${cat.id}/1.webp`,
      width: 800,
      height: 600,
      altCa: 'Lluna al sofa',
    });
    const img2 = await addCatImage(ctx.db, cat.id, {
      r2Key: `cats/${cat.id}/2.webp`,
      width: 800,
      height: 600,
    });

    expect(img1.position).toBe(0);
    expect(img2.position).toBe(1);
    expect(img2.altCa).toBe('');

    const withImages = await getCatById(ctx.db, cat.id);
    expect(withImages?.images.map((i) => i.id)).toEqual([img1.id, img2.id]);
  });

  it('does not collide positions after removing a middle image', async () => {
    const cat = await createCat(ctx.db, baseInput(), 'a@b.org');
    const img1 = await addCatImage(ctx.db, cat.id, {
      r2Key: `cats/${cat.id}/1.webp`,
      width: 800,
      height: 600,
    });
    const img2 = await addCatImage(ctx.db, cat.id, {
      r2Key: `cats/${cat.id}/2.webp`,
      width: 800,
      height: 600,
    });
    const img3 = await addCatImage(ctx.db, cat.id, {
      r2Key: `cats/${cat.id}/3.webp`,
      width: 800,
      height: 600,
    });
    expect([img1.position, img2.position, img3.position]).toEqual([0, 1, 2]);

    await removeCatImage(ctx.db, img2.id);

    // removeCatImage renumbers the remaining images to a contiguous
    // 0..n-1 sequence, so img3 (previously at position 2) is now at 1.
    const afterRemove = await getCatById(ctx.db, cat.id);
    expect(
      afterRemove?.images.map((i) => ({ id: i.id, position: i.position }))
    ).toEqual([
      { id: img1.id, position: 0 },
      { id: img3.id, position: 1 },
    ]);

    const img4 = await addCatImage(ctx.db, cat.id, {
      r2Key: `cats/${cat.id}/4.webp`,
      width: 800,
      height: 600,
    });

    // Before the fix, addCatImage used count(existing) for the new
    // position: after removing the middle image, count() was 2 — the same
    // position img3 already occupies — producing a collision. With
    // max(position)+1 on the renumbered set, img4 must land at 2, not 3
    // and not collide with img3.
    expect(img4.position).toBe(2);

    const positions = (await getCatById(ctx.db, cat.id))?.images.map(
      (i) => i.position
    );
    expect(new Set(positions).size).toBe(positions?.length);
    expect(positions).toEqual([0, 1, 2]);
  });
});

describe('updateCatImages', () => {
  it('updates alt text and reorders images', async () => {
    const cat = await createCat(ctx.db, baseInput(), 'a@b.org');
    const img1 = await addCatImage(ctx.db, cat.id, {
      r2Key: `cats/${cat.id}/1.webp`,
      width: 800,
      height: 600,
    });
    const img2 = await addCatImage(ctx.db, cat.id, {
      r2Key: `cats/${cat.id}/2.webp`,
      width: 800,
      height: 600,
    });

    await updateCatImages(ctx.db, cat.id, [
      { id: img1.id, altCa: 'Primera', altEs: 'Primera', position: 1 },
      { id: img2.id, altCa: 'Segona', altEs: 'Segunda', position: 0 },
    ]);

    const withImages = await getCatById(ctx.db, cat.id);
    expect(withImages?.images.map((i) => i.id)).toEqual([img2.id, img1.id]);
    expect(withImages?.images[0].altCa).toBe('Segona');
  });
});

describe('updateCatImages atomicity', () => {
  it('leaves all rows unchanged when one image update in the batch fails', async () => {
    const cat = await createCat(ctx.db, baseInput(), 'a@b.org');
    const img1 = await addCatImage(ctx.db, cat.id, {
      r2Key: `cats/${cat.id}/1.webp`,
      width: 800,
      height: 600,
      altCa: 'Original 1',
      altEs: 'Original 1 es',
    });
    const img2 = await addCatImage(ctx.db, cat.id, {
      r2Key: `cats/${cat.id}/2.webp`,
      width: 800,
      height: 600,
      altCa: 'Original 2',
      altEs: 'Original 2 es',
    });
    const img3 = await addCatImage(ctx.db, cat.id, {
      r2Key: `cats/${cat.id}/3.webp`,
      width: 800,
      height: 600,
      altCa: 'Original 3',
      altEs: 'Original 3 es',
    });

    // img1 and img2 are valid updates that would succeed on their own; img3
    // carries a null altCa, which violates the cat_images.alt_ca NOT NULL
    // constraint and makes that single statement fail. If the three
    // UPDATEs are issued one by one (today's behaviour), img1 and img2's
    // new values are already committed by the time img3's statement
    // throws, leaving the gallery in a mixed state that is neither the old
    // order nor the new one.
    await expect(
      updateCatImages(ctx.db, cat.id, [
        {
          id: img1.id,
          altCa: 'Reordered 1',
          altEs: 'Reordered 1 es',
          position: 2,
        },
        {
          id: img2.id,
          altCa: 'Reordered 2',
          altEs: 'Reordered 2 es',
          position: 0,
        },
        {
          id: img3.id,
          altCa: null as unknown as string,
          altEs: 'Reordered 3 es',
          position: 1,
        },
      ])
    ).rejects.toThrow();

    const withImages = await getCatById(ctx.db, cat.id);
    const byId = new Map(withImages?.images.map((i) => [i.id, i]));

    // Every row must still hold its pre-batch value: no partial apply.
    expect(byId.get(img1.id)?.altCa).toBe('Original 1');
    expect(byId.get(img1.id)?.position).toBe(0);
    expect(byId.get(img2.id)?.altCa).toBe('Original 2');
    expect(byId.get(img2.id)?.position).toBe(1);
    expect(byId.get(img3.id)?.altCa).toBe('Original 3');
    expect(byId.get(img3.id)?.position).toBe(2);
  });
});

describe('setCoverImage', () => {
  it('sets the cover image when it belongs to the cat', async () => {
    const cat = await createCat(ctx.db, baseInput(), 'a@b.org');
    const img = await addCatImage(ctx.db, cat.id, {
      r2Key: `cats/${cat.id}/1.webp`,
      width: 800,
      height: 600,
    });

    await setCoverImage(ctx.db, cat.id, img.id);

    const withCover = await getCatById(ctx.db, cat.id);
    expect(withCover?.coverImage?.id).toBe(img.id);
  });

  it('clears the cover image when passed null', async () => {
    const cat = await createCat(ctx.db, baseInput(), 'a@b.org');
    const img = await addCatImage(ctx.db, cat.id, {
      r2Key: `cats/${cat.id}/1.webp`,
      width: 800,
      height: 600,
    });
    await setCoverImage(ctx.db, cat.id, img.id);

    await setCoverImage(ctx.db, cat.id, null);

    const cleared = await getCatById(ctx.db, cat.id);
    expect(cleared?.coverImage).toBeNull();
  });

  it('throws "image not in cat" for an image belonging to another cat', async () => {
    const catA = await createCat(ctx.db, baseInput(), 'a@b.org');
    const catB = await createCat(
      ctx.db,
      baseInput({ slugCa: 'other', slugEs: 'other' }),
      'a@b.org'
    );
    const imgOfB = await addCatImage(ctx.db, catB.id, {
      r2Key: `cats/${catB.id}/1.webp`,
      width: 800,
      height: 600,
    });

    await expect(setCoverImage(ctx.db, catA.id, imgOfB.id)).rejects.toThrow(
      'image not in cat'
    );
  });
});

describe('removeCatImage', () => {
  it('deletes the image, returns its r2Key, and clears it as cover via ON DELETE SET NULL', async () => {
    const cat = await createCat(ctx.db, baseInput(), 'a@b.org');
    const img = await addCatImage(ctx.db, cat.id, {
      r2Key: `cats/${cat.id}/1.webp`,
      width: 800,
      height: 600,
    });
    await setCoverImage(ctx.db, cat.id, img.id);

    const removed = await removeCatImage(ctx.db, img.id);
    expect(removed).toEqual({ r2Key: `cats/${cat.id}/1.webp` });

    const after = await getCatById(ctx.db, cat.id);
    expect(after?.coverImage).toBeNull();
    expect(after?.images).toEqual([]);
  });

  it('returns null for a missing image id', async () => {
    const removed = await removeCatImage(ctx.db, 'missing');
    expect(removed).toBeNull();
  });
});

describe('deleteCat cascades to images', () => {
  it('deletes cat_images rows and returns their r2Keys', async () => {
    const cat = await createCat(ctx.db, baseInput(), 'a@b.org');
    const img1 = await addCatImage(ctx.db, cat.id, {
      r2Key: `cats/${cat.id}/1.webp`,
      width: 800,
      height: 600,
    });
    const img2 = await addCatImage(ctx.db, cat.id, {
      r2Key: `cats/${cat.id}/2.webp`,
      width: 800,
      height: 600,
    });

    const { r2Keys } = await deleteCat(ctx.db, cat.id);
    expect(r2Keys.sort()).toEqual([img1.r2Key, img2.r2Key].sort());

    const remaining = await ctx.db.select().from(schema.catImages);
    expect(remaining).toEqual([]);
  });
});
