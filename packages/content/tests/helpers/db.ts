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
 * order via `.prepare().run()`. Local D1 (Miniflare-backed) already
 * enforces foreign keys by default — `PRAGMA foreign_keys` reads `1` with
 * no extra statement needed — matching real D1, which enforces them
 * unconditionally and does not allow disabling them. So `ON DELETE CASCADE`
 * / `ON DELETE SET NULL` behave in tests the same way they do in
 * production without any setup here.
 */
export async function setupTestDb(): Promise<TestDb> {
  const proxy = await getPlatformProxy<{ DB: D1Database }>({
    configPath: CONFIG_PATH,
    // Ephemeral, in-memory bindings scoped to this call only. Several test
    // files run in the same vitest process (in parallel, by default) and
    // each calls setupTestDb() independently; the default behaviour
    // persists D1 state to `.wrangler/state/v3` on disk, shared across every
    // proxy pointed at the same wrangler.test.toml, which causes
    // "table already exists" collisions between files. persist: false gives
    // every setupTestDb() call its own isolated database.
    persist: false,
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

  return { db: createDb(proxy.env.DB), dispose: proxy.dispose };
}
