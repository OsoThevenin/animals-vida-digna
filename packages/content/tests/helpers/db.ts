import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getPlatformProxy } from 'wrangler';
import { createDb, type Db } from '../../src/cats';

const CONFIG_PATH = resolve(import.meta.dirname, '../../wrangler.test.toml');
const MIGRATIONS_DIR = resolve(import.meta.dirname, '../../migrations');

export interface TestDb {
  db: Db;
  dispose: () => Promise<void>;
}

/**
 * Boots a real local D1 database (via wrangler's Miniflare-backed
 * getPlatformProxy) and applies every migration file in `migrations/`, in
 * filename order: split each file on the `--> statement-breakpoint` marker
 * drizzle-kit emits (a convenient, unambiguous delimiter for this helper's
 * own simple parsing — not a claim about how `wrangler d1 migrations apply`
 * itself splits files; see Task 3 Step 2), run each resulting statement in
 * order via `.prepare().run()`. Foreign-key enforcement is off by default in
 * SQLite and is turned on explicitly so `ON DELETE CASCADE` / `ON DELETE SET
 * NULL` behave in tests the same way they must in production.
 */
export async function setupTestDb(): Promise<TestDb> {
  const proxy = await getPlatformProxy<{ DB: D1Database }>({
    configPath: CONFIG_PATH,
  });

  const migrationFiles = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const raw = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf-8');
    const statements = raw
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);
    for (const statement of statements) {
      await proxy.env.DB.prepare(statement).run();
    }
  }

  await proxy.env.DB.prepare('PRAGMA foreign_keys = ON').run();

  return { db: createDb(proxy.env.DB), dispose: proxy.dispose };
}
