import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CONFIG_PATH = resolve(import.meta.dirname, '../wrangler.test.toml');
const MIGRATIONS_DIR = resolve(import.meta.dirname, '../migrations');

let proxy: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;

beforeAll(async () => {
  proxy = await getPlatformProxy<{ DB: D1Database }>({
    configPath: CONFIG_PATH,
  });
  const migrationFiles = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();
  for (const file of migrationFiles) {
    const raw = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf-8');
    const statements = raw
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const statement of statements) {
      await proxy.env.DB.prepare(statement).run();
    }
  }
});

afterAll(async () => {
  await proxy.dispose();
});

describe('D1 migration', () => {
  it('creates the cats and cat_images tables', async () => {
    const result = await proxy.env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table'"
    ).all<{ name: string }>();
    const names = result.results.map((r) => r.name);
    expect(names).toContain('cats');
    expect(names).toContain('cat_images');
  });

  it('creates the unique indexes on slug_ca, slug_es and r2_key', async () => {
    const result = await proxy.env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'index'"
    ).all<{ name: string }>();
    const names = result.results.map((r) => r.name);
    expect(names).toContain('cats_slug_ca_idx');
    expect(names).toContain('cats_slug_es_idx');
    expect(names).toContain('cat_images_r2_key_idx');
    expect(names).toContain('cat_images_cat_id_idx');
  });
});
