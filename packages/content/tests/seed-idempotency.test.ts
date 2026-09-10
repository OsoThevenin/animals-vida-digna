import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { generateSeedSql } from '../scripts/seed-from-yaml';
import * as schema from '../src/schema';
import { setupTestDb, type TestDb } from './helpers/db';

// See tests/seed-from-yaml.test.ts for why this points at the fixtures
// copied into this package rather than the now-deleted
// apps/web/src/content/cats (Phase 3, Task 8).
const CATS_DIR = resolve(import.meta.dirname, 'fixtures/cats');

let ctx: TestDb;

beforeAll(async () => {
  ctx = await setupTestDb();
});

afterAll(async () => {
  await ctx.dispose();
});

/**
 * Splits generated seed SQL on the same `--> statement-breakpoint` marker
 * generateSeedSql joins statements with (see scripts/seed-from-yaml.ts),
 * mirroring how tests/helpers/db.ts applies migration files — an
 * unambiguous boundary, not a guess based on statement content (see F9's
 * fix for why guessing from content, e.g. line-prefix matching, is
 * fragile).
 */
async function applySeedSql(seedSql: string): Promise<void> {
  const statements = seedSql
    .split('--> statement-breakpoint')
    .map((statement) =>
      // Drop any leading `--` comment lines (e.g. the width/height
      // placeholder note buildImageInsert prepends) — they share a
      // statement-breakpoint chunk with the SQL that follows, and D1's
      // .prepare() expects exactly one statement per call.
      statement
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim()
    )
    .filter((statement) => statement.length > 0);
  for (const statement of statements) {
    await ctx.db.run(sql.raw(statement));
  }
}

describe('seed re-runnability (F2)', () => {
  it('leaves exactly one row per cat and per image after applying the generated seed twice', async () => {
    const seedSql = generateSeedSql(CATS_DIR);

    await applySeedSql(seedSql);
    const afterFirst = await ctx.db.select().from(schema.cats);
    expect(afterFirst).toHaveLength(3);

    // Re-running must not abort (a bare INSERT would violate
    // cats_slug_ca_idx here) and must not create duplicate rows.
    await applySeedSql(seedSql);
    const afterSecond = await ctx.db.select().from(schema.cats);
    expect(afterSecond).toHaveLength(3);

    const slugs = afterSecond.map((cat) => cat.slugCa).sort();
    expect(slugs).toEqual(['garfield', 'lluna', 'misi']);

    const images = await ctx.db.select().from(schema.catImages);
    // Today's real fixtures have no cover image / empty galleries, so no
    // cat_images rows are expected from either run.
    expect(images).toHaveLength(0);
  });

  it('leaves exactly one row per image, with the cover wired, after applying a seed with images twice', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'seed-idempotency-images-'));
    try {
      writeFileSync(
        join(dir, 'idemcat.yaml'),
        [
          'slug_ca: idemcat',
          'slug_es: idemcat',
          'name_ca: Idemcat',
          'name_es: Idemcat',
          'coverImage:',
          '  src: /images/cats/idemcat-cover.jpg',
          '  alt_ca: Tapa CA',
          '  alt_es: Tapa ES',
          'gallery:',
          '  - src: /images/cats/idemcat-1.jpg',
          '    alt_ca: Foto CA',
          '    alt_es: Foto ES',
          '',
        ].join('\n')
      );

      const seedSql = generateSeedSql(dir);
      await applySeedSql(seedSql);
      await applySeedSql(seedSql);

      const cats = await ctx.db
        .select()
        .from(schema.cats)
        .where(eq(schema.cats.slugCa, 'idemcat'));
      expect(cats).toHaveLength(1);

      const images = await ctx.db
        .select()
        .from(schema.catImages)
        .where(eq(schema.catImages.catId, cats[0].id));
      expect(images).toHaveLength(2); // cover + 1 gallery image

      expect(cats[0].coverImageId).not.toBeNull();
      expect(
        images.find((image) => image.id === cats[0].coverImageId)?.r2Key
      ).toBe('images/cats/idemcat-cover.jpg');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
