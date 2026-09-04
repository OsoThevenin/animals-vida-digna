import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

describe('@avd/design-system workspace wiring', () => {
  it('resolves component exports through the pnpm workspace link', async () => {
    const mod = await import('@avd/design-system');
    expect(typeof mod.Button).toBe('function');
    expect(typeof mod.Badge).toBe('function');
    expect(typeof mod.Field).toBe('function');
    expect(typeof mod.Input).toBe('function');
    expect(typeof mod.Card).toBe('function');
    expect(typeof mod.Section).toBe('function');
  });

  it('resolves the ./styles.css export and it defines the shared tokens', () => {
    const require = createRequire(import.meta.url);
    const resolved = require.resolve('@avd/design-system/styles.css');
    expect(resolved).toMatch(/design-system\/src\/styles\.css$/);
    const css = readFileSync(resolved, 'utf-8');
    expect(css).toContain('--color-primary');
  });
});
