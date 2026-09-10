import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Replaces the Phase 4 `design-system-import.test.ts`: the admin no longer
 * depends on @avd/design-system, so what needs guarding is the shadcn/ui
 * wiring instead — the `@/*` alias, the registry config and the fact that
 * only the components this app actually uses are vendored in.
 */

const root = join(__dirname, '..');

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(root, path), 'utf-8'));
}

describe('shadcn/ui wiring', () => {
  it('resolves the vendored primitives through the @/* alias', async () => {
    const button = await import('@/components/ui/button');
    const input = await import('@/components/ui/input');
    const label = await import('@/components/ui/label');
    expect(typeof button.Button).toBe('function');
    expect(typeof input.Input).toBe('function');
    expect(typeof label.Label).toBe('function');
  });

  // shadcn 4 ships its own compiled clsx+tailwind-merge replacement (the
  // `cn` package, github.com/shadcn-ui/cn) and the registry imports it
  // directly, so this app has no hand-written src/lib/utils.ts to guard.
  it('resolves the cn() class merger the registry imports', async () => {
    const { cn } = await import('cn');
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('points components.json at the admin stylesheet and @/ aliases', () => {
    const config = readJson('components.json') as {
      tailwind: { css: string; cssVariables: boolean; config: string };
      aliases: Record<string, string>;
    };
    // Tailwind 4 is CSS-first: there is no tailwind.config.js to point at.
    expect(config.tailwind.config).toBe('');
    expect(config.tailwind.css).toBe('src/styles/admin.css');
    expect(config.tailwind.cssVariables).toBe(true);
    expect(config.aliases.ui).toBe('@/components/ui');
    // The registry template does `import { cn } from "${aliases.utils}"`
    // verbatim, so this must match how every vendored src/components/ui/*
    // file already imports it — the `cn` npm package, not a local
    // src/lib/utils.ts (which this app has never had; see the test below).
    expect(config.aliases.utils).toBe('cn');
  });

  it('declares the @/* path alias TypeScript and Astro both read', () => {
    const tsconfig = readJson('tsconfig.json') as {
      compilerOptions: { paths: Record<string, string[]> };
    };
    expect(tsconfig.compilerOptions.paths['@/*']).toEqual(['src/*']);
  });

  it('no longer depends on @avd/design-system', () => {
    const pkg = readJson('package.json') as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies['@avd/design-system']).toBeUndefined();
    expect(pkg.dependencies['radix-ui']).toBeDefined();
    expect(pkg.dependencies['class-variance-authority']).toBeDefined();
  });

  it('points the CSS token file at the AVD palette, not shadcn neutral defaults', () => {
    const css = readFileSync(join(root, 'src/styles/admin.css'), 'utf-8');
    // The site's palette drives shadcn's tokens; nothing neutral survives.
    expect(css).toContain('--primary: #6b4226');
    expect(css).not.toContain('oklch');
  });
});
