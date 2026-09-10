import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateSeedSql } from '../scripts/seed-from-yaml';

// Phase 3 (docs/superpowers/plans/2026-09-03-content-r2-pipeline/
// phase-3-web-on-d1.md, Task 8) deletes apps/web/src/content/cats now that
// the public site reads exclusively from D1. These tests exercise the pure
// generateSeedSql(catsDir) function against real fixture data, so the
// fixtures were copied here (packages/content/tests/fixtures/cats) rather
// than deleted along with the Keystatic-facing directory -- this package
// owns the seed script and its tests, not apps/web.
const CATS_DIR = resolve(import.meta.dirname, 'fixtures/cats');

// The full, fixed column-list header every generated cats INSERT starts
// with (see buildCatInsert's `columns` array). Matching this exact ~400
// char literal — rather than a bare line-start check for "INSERT INTO
// cats" — is what makes counting statements robust: a cat description is
// free text and can legitimately start a line with "INSERT INTO cats..."
// (it's just prose to the seed script), but it cannot plausibly reproduce
// this whole header verbatim.
const INSERT_HEADER =
  /INSERT OR IGNORE INTO cats \(id, slug_ca, slug_es, name_ca, name_es, race_ca, race_es, status, age, gender, size, personality, good_with, health_status, vaccinated, microchipped, sterilized, weight, rescue_date, adoption_date, special_needs_ca, special_needs_es, observations_ca, observations_es, short_description_ca, short_description_es, description_ca, description_es, seo_title_ca, seo_title_es, seo_description_ca, seo_description_es, featured, sort_order, published, created_at, updated_at, updated_by\) VALUES \(/g;

function countInsertStatements(sql: string): number {
  return sql.match(INSERT_HEADER)?.length ?? 0;
}

describe('generateSeedSql against the real fixture cats', () => {
  it('produces exactly 3 INSERT statements', () => {
    const sql = generateSeedSql(CATS_DIR);
    expect(countInsertStatements(sql)).toBe(3);
  });

  it('counts statements correctly even when a description embeds the string "INSERT INTO cats"', () => {
    // Regression for a fragile test that counted lines starting with
    // 'INSERT INTO cats': a multi-line description is embedded verbatim in
    // the SQL string literal, so a description whose first line happens to
    // start with that same text would silently inflate a naive count.
    const dir = mkdtempSync(join(tmpdir(), 'seed-from-yaml-test-'));
    try {
      writeFileSync(
        join(dir, 'testcat.yaml'),
        'slug_ca: testcat\nslug_es: testcat\nname_ca: Test\nname_es: Test\n'
      );
      mkdirSync(join(dir, 'testcat'));
      writeFileSync(
        join(dir, 'testcat', 'description_ca.mdoc'),
        // The line break before "INSERT INTO cats" matters: it puts that
        // text at the start of its own physical line in the generated SQL
        // (the description is embedded verbatim, newlines and all), which
        // is exactly what fooled the old `line.startsWith(...)` count.
        'A gentle rescue story.\nINSERT INTO cats and dogs alike, everyone is welcome.'
      );

      const sql = generateSeedSql(dir);
      expect(countInsertStatements(sql)).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('includes each fixture slug as slug_ca', () => {
    const sql = generateSeedSql(CATS_DIR);
    expect(sql).toContain("'garfield'");
    expect(sql).toContain("'lluna'");
    expect(sql).toContain("'misi'");
  });

  it('serializes personality as a JSON array literal', () => {
    const sql = generateSeedSql(CATS_DIR);
    expect(sql).toContain('\'["playful","curious","social"]\'');
  });

  it("writes SQL NULL (not the string 'null') for a null adoptionDate", () => {
    const sql = generateSeedSql(CATS_DIR);
    // every fixture has adoptionDate: null in its YAML; the insert's
    // adoption_date column value must be the bare SQL keyword NULL
    expect(sql).toMatch(/,\s*NULL,\s*''/); // adoption_date, then special_needs_ca
  });

  it('sets updated_by to seed for every row', () => {
    const sql = generateSeedSql(CATS_DIR);
    const occurrences = sql.match(/'seed'\);/g) ?? [];
    expect(occurrences).toHaveLength(3);
  });

  it('embeds the Markdoc description source read from the sibling directory', () => {
    const sql = generateSeedSql(CATS_DIR);
    expect(sql).toContain('En Garfield es un gat persa');
  });
});

describe('generateSeedSql image handling', () => {
  function withFixture(yaml: string, run: (dir: string) => void): void {
    const dir = mkdtempSync(join(tmpdir(), 'seed-from-yaml-images-'));
    try {
      writeFileSync(join(dir, 'imgcat.yaml'), yaml);
      run(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  const FIXTURE_YAML = `
slug_ca: imgcat
slug_es: imgcat
name_ca: Imgcat
name_es: Imgcat
coverImage:
  src: /images/cats/imgcat-cover.jpg
  alt_ca: Imgcat de tapa CA
  alt_es: Imgcat de tapa ES
gallery:
  - src: /images/cats/imgcat-1.jpg
    alt_ca: Foto u CA
    alt_es: Foto u ES
  - src: /images/cats/imgcat-2.jpg
    alt_ca: Foto dos CA
    alt_es: Foto dos ES
`;

  it('emits a cat_images row for the cover image with its alt text', () => {
    withFixture(FIXTURE_YAML, (dir) => {
      const sql = generateSeedSql(dir);
      expect(sql).toContain('imgcat-cover.jpg');
      expect(sql).toContain('Imgcat de tapa CA');
      expect(sql).toContain('Imgcat de tapa ES');
    });
  });

  it('emits a cat_images row for every gallery image with its alt text', () => {
    withFixture(FIXTURE_YAML, (dir) => {
      const sql = generateSeedSql(dir);
      expect(sql).toContain('imgcat-1.jpg');
      expect(sql).toContain('Foto u CA');
      expect(sql).toContain('Foto u ES');
      expect(sql).toContain('imgcat-2.jpg');
      expect(sql).toContain('Foto dos CA');
      expect(sql).toContain('Foto dos ES');

      const catImageInserts =
        sql.match(/INSERT OR IGNORE INTO cat_images/g) ?? [];
      expect(catImageInserts).toHaveLength(3); // cover + 2 gallery images
    });
  });

  it('wires cover_image_id to the cover image row by a stable lookup, not a fresh id', () => {
    withFixture(FIXTURE_YAML, (dir) => {
      const sql = generateSeedSql(dir);
      // Must key the UPDATE off durable natural keys (slug/r2Key), not the
      // ids generated on this run, or a rerun's UPDATE would silently
      // no-op against the row a previous run actually persisted.
      expect(sql).toMatch(
        /UPDATE cats SET cover_image_id = \(SELECT id FROM cat_images WHERE r2_key = '[^']*imgcat-cover\.jpg'\) WHERE slug_ca = 'imgcat';/
      );
    });
  });

  it('emits nothing for a null coverImage.src and an empty gallery (todays real fixtures)', () => {
    const yaml = `
slug_ca: nocat
slug_es: nocat
name_ca: Nocat
name_es: Nocat
coverImage:
  src: null
  alt_ca: alt ca
  alt_es: alt es
gallery: []
`;
    const dir = mkdtempSync(join(tmpdir(), 'seed-from-yaml-noimg-'));
    try {
      writeFileSync(join(dir, 'nocat.yaml'), yaml);
      const sql = generateSeedSql(dir);
      expect(sql).not.toContain('cat_images');
      expect(sql).not.toContain('cover_image_id =');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
