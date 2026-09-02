import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');

function readFile(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf-8');
}

describe('Astro config', () => {
  const config = readFile('astro.config.mjs');

  it('FOUND-01: imports cloudflare adapter', () => {
    expect(config).toContain("import cloudflare from '@astrojs/cloudflare'");
  });

  it('FOUND-01: uses cloudflare adapter', () => {
    expect(config).toContain('adapter: cloudflare()');
  });

  it('FOUND-01: does not use output hybrid (removed in Astro 5)', () => {
    expect(config).not.toContain("output: 'hybrid'");
    expect(config).not.toContain('output: "hybrid"');
  });

  it('FOUND-01: configures i18n with Catalan default', () => {
    expect(config).toContain("defaultLocale: 'ca'");
    expect(config).toContain("'ca', 'es'");
  });

  it('FOUND-01: uses @tailwindcss/vite plugin', () => {
    expect(config).toContain('@tailwindcss/vite');
    expect(config).toContain('tailwindcss()');
  });

  it('loads Keystatic in every build, production included', () => {
    // The admin UI at /keystatic is how volunteers edit content, so it must
    // exist on the deployed Worker. Gating it on NODE_ENV is what previously
    // forced storage into 'local' mode, which cannot work on Cloudflare.
    expect(config).toContain('@keystatic/astro');
    expect(config).toContain(
      'integrations.push(react(), markdoc(), keystatic())'
    );
    expect(config).not.toContain("process.env.NODE_ENV !== 'production'");
  });
});

describe('Wrangler config', () => {
  const wrangler = readFile('wrangler.toml');

  it('FOUND-04: does not declare an R2 bucket binding (no matching bucket on the account)', () => {
    expect(wrangler).not.toContain('r2_buckets');
    expect(wrangler).not.toContain('IMAGES_BUCKET');
  });

  it('FOUND-04: has nodejs_compat flag', () => {
    expect(wrangler).toContain('nodejs_compat');
  });

  it('FOUND-04: has compatibility_date', () => {
    expect(wrangler).toMatch(/compatibility_date\s*=\s*"/);
  });
});
