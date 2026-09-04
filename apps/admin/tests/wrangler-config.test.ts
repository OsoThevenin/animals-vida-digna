import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');

function readFile(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf-8');
}

// smol-toml ships as a transitive dependency of wrangler; resolve it
// relative to wrangler's own package.json so this test needs no new
// dependency (same technique as apps/web/tests/wrangler-config.test.ts).
function loadTomlParser(): {
  parse: (input: string) => Record<string, unknown>;
} {
  const require = createRequire(import.meta.url);
  const wranglerPkg = require.resolve('wrangler/package.json', {
    paths: [root],
  });
  const requireFromWrangler = createRequire(wranglerPkg);
  return requireFromWrangler('smol-toml');
}

describe('apps/admin wrangler.toml', () => {
  const { parse } = loadTomlParser();
  const raw = readFile('wrangler.toml');
  const config = parse(raw) as {
    name?: string;
    main?: string;
    compatibility_date?: string;
    compatibility_flags?: string[];
    workers_dev?: boolean;
    preview_urls?: boolean;
    assets?: { binding?: string; directory?: string };
    observability?: { enabled?: boolean };
    routes?: Array<{ pattern?: string; custom_domain?: boolean }>;
    d1_databases?: Array<{
      binding?: string;
      database_name?: string;
      database_id?: string;
      migrations_dir?: string;
    }>;
    r2_buckets?: Array<{ binding?: string; bucket_name?: string }>;
    unsafe?: unknown;
  };

  it('names the worker animals-vida-digna-admin', () => {
    expect(config.name).toBe('animals-vida-digna-admin');
  });

  it('sets a worker entry point (main)', () => {
    expect(config.main).toBe('dist/_worker.js/index.js');
  });

  it('matches the web worker compatibility settings', () => {
    expect(config.compatibility_date).toBe('2025-08-15');
    expect(config.compatibility_flags).toEqual(['nodejs_compat']);
  });

  it('disables workers.dev and preview URLs (cookies/baseURL are host-bound)', () => {
    expect(config.workers_dev).toBe(false);
    expect(config.preview_urls).toBe(false);
  });

  it('declares the static assets binding pointing at ./dist', () => {
    expect(config.assets?.directory).toBe('./dist');
    expect(config.assets?.binding).toBe('ASSETS');
  });

  it('enables observability', () => {
    expect(config.observability?.enabled).toBe(true);
  });

  it('routes the admin custom domain to this worker', () => {
    const route = config.routes?.[0];
    expect(route?.pattern).toBe('admin.animalsvidadigna.org');
    expect(route?.custom_domain).toBe(true);
  });

  it('binds the shared avd-content D1 database as DB', () => {
    const db = config.d1_databases?.[0];
    expect(db?.binding).toBe('DB');
    expect(db?.database_name).toBe('avd-content');
    expect(typeof db?.database_id).toBe('string');
    expect(db?.database_id?.length).toBeGreaterThan(0);
    expect(db?.migrations_dir).toBe('../../packages/content/migrations');
  });

  it('binds the shared images bucket as IMAGES_BUCKET', () => {
    const bucket = config.r2_buckets?.[0];
    expect(bucket?.binding).toBe('IMAGES_BUCKET');
    expect(bucket?.bucket_name).toBe('animals-vida-digna-images');
  });

  it('has no unsafe key', () => {
    expect(config.unsafe).toBeUndefined();
    expect(raw).not.toMatch(/\[\[?unsafe/);
  });
});
