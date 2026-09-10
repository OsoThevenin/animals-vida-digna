import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * shadcn/ui ships a `neutral`-based token set. This admin re-points every
 * semantic token at the Animals Vida Digna warm-brown palette, so none of
 * shadcn's own contrast guarantees apply any more. `apps/web` learned this
 * the expensive way (a submit button shipped at 2.03:1), hence this test:
 * every foreground/background pair the admin actually renders is asserted
 * against WCAG AA here, read from the CSS itself so a future palette edit
 * fails the build rather than the audit.
 */

const css = readFileSync(join(__dirname, '../src/styles/admin.css'), 'utf-8');

function tokenHex(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (!match) {
    throw new Error(`token --${name} not found in admin.css`);
  }
  return match[1].toLowerCase();
}

function relativeLuminance(hex: string): number {
  const channel = (offset: number): number => {
    const s = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrastRatio(fg: string, bg: string): number {
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe('contrastRatio helper', () => {
  it('scores black on white at 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('scores the palette pair that failed on the site below AA', () => {
    // accent (#e8a87c) on surface — the 2.03:1 class of failure this
    // test exists to prevent. Proves the helper can report a FAIL.
    expect(contrastRatio('#e8a87c', '#fff8f0')).toBeLessThan(4.5);
  });
});

const AA = 4.5;
const NON_TEXT = 3;

describe('admin shadcn token pairs meet WCAG AA', () => {
  const pairs: Array<[string, string, string]> = [
    ['foreground on background', 'foreground', 'background'],
    // The image-manager save-status banner (Task 9) renders `text-
    // foreground` on `bg-muted` — an existing token pair not previously
    // asserted anywhere in this matrix.
    ['foreground on muted', 'foreground', 'muted'],
    ['card-foreground on card', 'card-foreground', 'card'],
    ['popover-foreground on popover', 'popover-foreground', 'popover'],
    ['primary-foreground on primary', 'primary-foreground', 'primary'],
    ['secondary-foreground on secondary', 'secondary-foreground', 'secondary'],
    ['muted-foreground on background', 'muted-foreground', 'background'],
    ['muted-foreground on muted', 'muted-foreground', 'muted'],
    ['accent-foreground on accent', 'accent-foreground', 'accent'],
    [
      'destructive-foreground on destructive',
      'destructive-foreground',
      'destructive',
    ],
    // `cat-form.tsx`'s Markdoc preview-toggle button (`text-primary` on
    // the page background) and its server-error banner / FormField error
    // slot (`text-destructive` on the page background) — pre-existing
    // pairings inherited from `cats-table.tsx`/`login-form.tsx`, not new
    // raw-palette classes, but not previously asserted here
    // (fix-round-1 MINOR 5).
    ['primary on background', 'primary', 'background'],
    ['destructive on background', 'destructive', 'background'],
  ];

  for (const [name, fg, bg] of pairs) {
    it(`${name} is at least ${AA}:1`, () => {
      expect(contrastRatio(tokenHex(fg), tokenHex(bg))).toBeGreaterThanOrEqual(
        AA
      );
    });
  }
});

describe('admin cat-status badge pairs meet WCAG AA', () => {
  for (const status of ['available', 'adopted', 'treatment', 'unavailable']) {
    it(`${status} badge text on its own background is at least ${AA}:1`, () => {
      expect(
        contrastRatio(
          tokenHex(`status-${status}-foreground`),
          tokenHex(`status-${status}`)
        )
      ).toBeGreaterThanOrEqual(AA);
    });
  }
});

describe('admin published/draft pill pairs meet WCAG AA', () => {
  for (const pill of ['published', 'draft']) {
    it(`${pill} pill text on its own background is at least ${AA}:1`, () => {
      expect(
        contrastRatio(
          tokenHex(`status-${pill}-foreground`),
          tokenHex(`status-${pill}`)
        )
      ).toBeGreaterThanOrEqual(AA);
    });
  }
});

describe('admin non-text tokens meet WCAG 1.4.11', () => {
  it(`the control border is at least ${NON_TEXT}:1 against the page`, () => {
    expect(
      contrastRatio(tokenHex('border'), tokenHex('background'))
    ).toBeGreaterThanOrEqual(NON_TEXT);
  });

  it(`the input border is at least ${NON_TEXT}:1 against the page`, () => {
    expect(
      contrastRatio(tokenHex('input'), tokenHex('background'))
    ).toBeGreaterThanOrEqual(NON_TEXT);
  });

  it(`the focus ring is at least ${NON_TEXT}:1 against the page`, () => {
    expect(
      contrastRatio(tokenHex('ring'), tokenHex('background'))
    ).toBeGreaterThanOrEqual(NON_TEXT);
  });
});
