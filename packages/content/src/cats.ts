import type { D1Database } from '@cloudflare/workers-types';
import { and, eq, inArray } from 'drizzle-orm';
import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import { nanoid } from 'nanoid';
import * as schema from './schema';
import type { CatInput } from './validate';

export type Db = DrizzleD1Database<typeof schema>;

export function createDb(d1: D1Database): Db {
  return drizzle(d1, { schema });
}

export type Cat = typeof schema.cats.$inferSelect;
export type CatImage = typeof schema.catImages.$inferSelect;
export type CatWithImages = Cat & {
  images: CatImage[];
  coverImage: CatImage | null;
};

function nowIso(): string {
  return new Date().toISOString();
}

async function attachImages(
  db: Db,
  catRows: Cat[]
): Promise<CatWithImages[]> {
  if (catRows.length === 0) return [];

  const catIds = catRows.map((cat) => cat.id);
  const imageRows = await db
    .select()
    .from(schema.catImages)
    .where(inArray(schema.catImages.catId, catIds))
    .orderBy(schema.catImages.position);

  const imagesByCat = new Map<string, CatImage[]>();
  for (const image of imageRows) {
    const list = imagesByCat.get(image.catId) ?? [];
    list.push(image);
    imagesByCat.set(image.catId, list);
  }

  return catRows.map((cat) => {
    const images = imagesByCat.get(cat.id) ?? [];
    const coverImage = cat.coverImageId
      ? (images.find((image) => image.id === cat.coverImageId) ?? null)
      : null;
    return { ...cat, images, coverImage };
  });
}

export async function listPublishedCats(db: Db): Promise<CatWithImages[]> {
  const rows = await db
    .select()
    .from(schema.cats)
    .where(eq(schema.cats.published, true))
    .orderBy(schema.cats.sortOrder, schema.cats.nameCa);
  return attachImages(db, rows);
}

export async function listFeaturedCats(
  db: Db,
  limit = 3
): Promise<CatWithImages[]> {
  const rows = await db
    .select()
    .from(schema.cats)
    .where(
      and(eq(schema.cats.published, true), eq(schema.cats.featured, true))
    )
    .orderBy(schema.cats.sortOrder, schema.cats.nameCa)
    .limit(limit);
  return attachImages(db, rows);
}

export async function getCatBySlug(
  db: Db,
  locale: 'ca' | 'es',
  slug: string
): Promise<CatWithImages | null> {
  const column = locale === 'ca' ? schema.cats.slugCa : schema.cats.slugEs;
  const rows = await db
    .select()
    .from(schema.cats)
    .where(and(eq(column, slug), eq(schema.cats.published, true)))
    .limit(1);
  if (rows.length === 0) return null;
  const [withImages] = await attachImages(db, rows);
  return withImages;
}

export async function listAllCats(db: Db): Promise<CatWithImages[]> {
  const rows = await db
    .select()
    .from(schema.cats)
    .orderBy(schema.cats.sortOrder, schema.cats.nameCa);
  return attachImages(db, rows);
}

export async function getCatById(
  db: Db,
  id: string
): Promise<CatWithImages | null> {
  const rows = await db
    .select()
    .from(schema.cats)
    .where(eq(schema.cats.id, id))
    .limit(1);
  if (rows.length === 0) return null;
  const [withImages] = await attachImages(db, rows);
  return withImages;
}

export async function createCat(
  db: Db,
  input: CatInput,
  actor: string
): Promise<CatWithImages> {
  const id = nanoid();
  const timestamp = nowIso();
  await db.insert(schema.cats).values({
    id,
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp,
    updatedBy: actor,
  });
  const cat = await getCatById(db, id);
  if (!cat) throw new Error('createCat: cat not found after insert');
  return cat;
}

export async function updateCat(
  db: Db,
  id: string,
  input: CatInput,
  actor: string
): Promise<CatWithImages> {
  await db
    .update(schema.cats)
    .set({ ...input, updatedAt: nowIso(), updatedBy: actor })
    .where(eq(schema.cats.id, id));
  const cat = await getCatById(db, id);
  if (!cat) throw new Error(`updateCat: cat ${id} not found`);
  return cat;
}

export async function deleteCat(
  db: Db,
  id: string
): Promise<{ r2Keys: string[] }> {
  const images = await db
    .select({ r2Key: schema.catImages.r2Key })
    .from(schema.catImages)
    .where(eq(schema.catImages.catId, id));
  await db.delete(schema.cats).where(eq(schema.cats.id, id));
  return { r2Keys: images.map((image) => image.r2Key) };
}

export async function addCatImage(
  db: Db,
  catId: string,
  image: {
    r2Key: string;
    width: number;
    height: number;
    altCa?: string;
    altEs?: string;
  }
): Promise<CatImage> {
  const id = nanoid();
  const existing = await db
    .select({ id: schema.catImages.id })
    .from(schema.catImages)
    .where(eq(schema.catImages.catId, catId));
  const position = existing.length;

  await db.insert(schema.catImages).values({
    id,
    catId,
    r2Key: image.r2Key,
    altCa: image.altCa ?? '',
    altEs: image.altEs ?? '',
    width: image.width,
    height: image.height,
    position,
    createdAt: nowIso(),
  });

  const [row] = await db
    .select()
    .from(schema.catImages)
    .where(eq(schema.catImages.id, id));
  return row;
}

export async function updateCatImages(
  db: Db,
  catId: string,
  images: Array<{ id: string; altCa: string; altEs: string; position: number }>
): Promise<void> {
  for (const image of images) {
    await db
      .update(schema.catImages)
      .set({
        altCa: image.altCa,
        altEs: image.altEs,
        position: image.position,
      })
      .where(
        and(
          eq(schema.catImages.id, image.id),
          eq(schema.catImages.catId, catId)
        )
      );
  }
}

export async function removeCatImage(
  db: Db,
  imageId: string
): Promise<{ r2Key: string } | null> {
  const [row] = await db
    .select({ r2Key: schema.catImages.r2Key })
    .from(schema.catImages)
    .where(eq(schema.catImages.id, imageId));
  if (!row) return null;

  // cats.cover_image_id has ON DELETE SET NULL, so the FK clears it; this
  // delete is the only statement needed as long as foreign_keys is ON
  // (tests/helpers/db.ts sets it; production D1 must too — see Task 8).
  await db.delete(schema.catImages).where(eq(schema.catImages.id, imageId));
  return { r2Key: row.r2Key };
}

export async function setCoverImage(
  db: Db,
  catId: string,
  imageId: string | null
): Promise<void> {
  if (imageId !== null) {
    const [row] = await db
      .select({ id: schema.catImages.id })
      .from(schema.catImages)
      .where(
        and(
          eq(schema.catImages.id, imageId),
          eq(schema.catImages.catId, catId)
        )
      );
    if (!row) throw new Error('image not in cat');
  }
  await db
    .update(schema.cats)
    .set({ coverImageId: imageId })
    .where(eq(schema.cats.id, catId));
}
