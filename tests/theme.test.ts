import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');

function readFile(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf-8');
}

describe('Tailwind v4 theme', () => {
  const css = readFile('src/styles/global.css');

  it('FOUND-02: imports tailwindcss', () => {
    expect(css).toContain('@import "tailwindcss"');
  });

  it('FOUND-02: has @theme block', () => {
    expect(css).toContain('@theme');
  });

  it('FOUND-02: defines --color-primary custom property', () => {
    expect(css).toMatch(/--color-primary\s*:/);
  });

  it('FOUND-02: defines --color-accent custom property', () => {
    expect(css).toMatch(/--color-accent\s*:/);
  });

  it('FOUND-02: defines --color-surface custom property', () => {
    expect(css).toMatch(/--color-surface\s*:/);
  });

  it('FOUND-02: defines --color-text custom property', () => {
    expect(css).toMatch(/--color-text\s*:/);
  });

  it('FOUND-02: defines font-family tokens', () => {
    expect(css).toMatch(/--font-family-sans\s*:/);
    expect(css).toMatch(/--font-family-display\s*:/);
  });

  it('FOUND-02: defines border-radius tokens', () => {
    expect(css).toMatch(/--radius-/);
  });
});
