import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');

function readFile(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf-8');
}

// smol-toml is not a direct project dependency, but it ships as a transitive
// dependency of wrangler (and miniflare). Resolve it relative to wrangler's
// own package.json so this test does not require adding a new dependency.
function loadTomlParser(): {
  parse: (input: string) => Record<string, unknown>;
} {
  const wranglerPkg = require.resolve('wrangler/package.json', {
    paths: [root],
  });
  const requireFromWrangler = createRequire(wranglerPkg);
  return requireFromWrangler('smol-toml');
}

function readAllSourceFiles(dir: string, acc: string[] = []): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      readAllSourceFiles(full, acc);
    } else if (/\.(ts|tsx|js|jsx|astro|mjs|cjs)$/.test(entry.name)) {
      acc.push(readFileSync(full, 'utf-8'));
    }
  }
  return acc;
}

describe('wrangler.toml', () => {
  const { parse } = loadTomlParser();
  const raw = readFile('wrangler.toml');
  const config = parse(raw) as {
    name?: string;
    main?: string;
    compatibility_date?: string;
    compatibility_flags?: string[];
    assets?: { binding?: string; directory?: string };
    observability?: { enabled?: boolean };
    ratelimits?: Array<{
      name?: string;
      namespace_id?: string;
      simple?: { limit?: number; period?: number };
    }>;
    unsafe?: unknown;
    r2_buckets?: unknown;
    d1_databases?: Array<{
      binding?: string;
      database_name?: string;
      database_id?: string;
      migrations_dir?: string;
    }>;
  };

  it('sets a worker entry point (main)', () => {
    expect(config.main).toBe('dist/_worker.js/index.js');
  });

  it('points main at a file that exists after a build', () => {
    expect(existsSync(resolve(root, config.main as string))).toBe(true);
  });

  it('declares the static assets binding pointing at ./dist', () => {
    expect(config.assets?.directory).toBe('./dist');
    expect(config.assets?.binding).toBe('ASSETS');
  });

  it('enables observability', () => {
    expect(config.observability?.enabled).toBe(true);
  });

  it('has no unsafe key anywhere', () => {
    expect(config.unsafe).toBeUndefined();
    expect(raw).not.toMatch(/\[\[?unsafe/);
  });

  it('has no r2_buckets entry', () => {
    expect(config.r2_buckets).toBeUndefined();
  });

  describe('D1 database binding', () => {
    it('declares the DB binding for avd-content with the shared migrations_dir', () => {
      const db = config.d1_databases?.find((d) => d.binding === 'DB');
      expect(db).toBeDefined();
      expect(db?.database_name).toBe('avd-content');
      expect(typeof db?.database_id).toBe('string');
      expect(db?.database_id?.length).toBeGreaterThan(0);
      expect(db?.migrations_dir).toBe('../../packages/content/migrations');
    });
  });

  it('declares FORM_RATE_LIMITER via [[ratelimits]] with valid shape', () => {
    expect(Array.isArray(config.ratelimits)).toBe(true);
    const limiter = config.ratelimits?.find(
      (r) => r.name === 'FORM_RATE_LIMITER'
    );
    expect(limiter).toBeDefined();
    expect(typeof limiter?.namespace_id).toBe('string');
    expect([10, 60]).toContain(limiter?.simple?.period);
    expect(limiter?.simple?.limit).toBeGreaterThan(0);
  });

  it('every binding declared in wrangler.toml is referenced somewhere under src/', () => {
    const sourceText = readAllSourceFiles(resolve(root, 'src')).join('\n');

    // assets binding
    if (config.assets?.binding) {
      // ASSETS is consumed by the Astro Cloudflare adapter itself, not
      // necessarily referenced directly in src/ — skip explicit binding-name
      // grep for it, but still assert every ratelimit binding is used.
    }

    const ratelimitNames = (config.ratelimits ?? [])
      .map((r) => r.name)
      .filter(Boolean) as string[];
    for (const name of ratelimitNames) {
      expect(sourceText.includes(name)).toBe(true);
    }

    const d1BindingNames = (config.d1_databases ?? [])
      .map((d) => d.binding)
      .filter(Boolean) as string[];
    for (const name of d1BindingNames) {
      expect(sourceText.includes(name)).toBe(true);
    }
  });

  it('the ratelimit binding name matches the shared rate-limit helper default, and both API routes use it', () => {
    // contact.ts and adopt.ts no longer read env.FORM_RATE_LIMITER
    // directly — the lookup is shared via src/lib/rate-limit.ts
    // (checkRateLimit), so assert the default binding name there matches
    // wrangler.toml, and that both routes call the shared helper.
    const rateLimitLib = readFile('src/lib/rate-limit.ts');
    const contact = readFile('src/pages/api/contact.ts');
    const adopt = readFile('src/pages/api/adopt.ts');
    const limiterName = config.ratelimits?.find((r) => r.name)?.name;

    expect(rateLimitLib).toContain(`bindingName = '${limiterName}'`);
    expect(contact).toContain('checkRateLimit(context)');
    expect(adopt).toContain('checkRateLimit(context)');
  });
});
