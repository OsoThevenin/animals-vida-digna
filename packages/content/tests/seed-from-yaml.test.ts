import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateSeedSql } from '../scripts/seed-from-yaml';

const CATS_DIR = resolve(
  import.meta.dirname,
  '../../../apps/web/src/content/cats'
);

describe('generateSeedSql against the real fixture cats', () => {
  it('produces exactly 3 INSERT statements', () => {
    const sql = generateSeedSql(CATS_DIR);
    const inserts = sql
      .trim()
      .split('\n')
      .filter((line) => line.startsWith('INSERT INTO cats'));
    expect(inserts).toHaveLength(3);
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

  it('writes SQL NULL (not the string \'null\') for a null adoptionDate', () => {
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
