import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const footerSource = readFileSync(
  join(process.cwd(), 'src/components/Footer.astro'),
  'utf-8'
);

// --- Helpers ---

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const toLinear = (c: number): number => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(fg: string, bg: string): number {
  const lum1 = relativeLuminance(fg);
  const lum2 = relativeLuminance(bg);
  const L1 = Math.max(lum1, lum2);
  const L2 = Math.min(lum1, lum2);
  return (L1 + 0.05) / (L2 + 0.05);
}

// --- Brand colors ---

const colors = {
  text: '#2D1B0E',
  'text-muted': '#6B5B4F',
  primary: '#8B5E3C',
  'primary-dark': '#6B4226',
  accent: '#E8A87C',
  surface: '#FFF8F0',
};

// --- Tests ---

describe('relativeLuminance', () => {
  it('computes luminance for surface (#FFF8F0)', () => {
    expect(relativeLuminance(colors.surface)).toBeCloseTo(0.947, 2);
  });

  it('computes luminance for accent (#E8A87C)', () => {
    expect(relativeLuminance(colors.accent)).toBeCloseTo(0.466, 2);
  });
});

describe('contrastRatio', () => {
  it('accent on surface is ~1.93 (FAIL AA)', () => {
    const ratio = contrastRatio(colors.accent, colors.surface);
    expect(ratio).toBeCloseTo(1.93, 1);
    expect(ratio).toBeLessThan(3);
  });

  it('text on surface is ~15.64 (PASS AA)', () => {
    const ratio = contrastRatio(colors.text, colors.surface);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('primary-dark on surface is ~8.20 (PASS AA)', () => {
    const ratio = contrastRatio(colors['primary-dark'], colors.surface);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Footer text-on-primary-dark contrast (M7 fix)', () => {
  // Footer.astro renders text at various `text-surface/<alpha>` opacities on
  // a solid `bg-primary-dark` background. Lighthouse flagged this as a
  // pre-existing color-contrast failure: the nav/social heading labels used
  // text-surface/50 (~3.35:1) and the copyright line used text-surface/40
  // (~2.70:1), both well under the 4.5:1 minimum for small text. The fix
  // (Footer.astro) raises both to text-surface/70, matching the value
  // already used (and already passing) elsewhere in the footer.
  function blend(fgHex: string, alpha: number, bgHex: string): [number, number, number] {
    const fg = hex(fgHex);
    const bg = hex(bgHex);
    return [
      fg[0] * alpha + bg[0] * (1 - alpha),
      fg[1] * alpha + bg[1] * (1 - alpha),
      fg[2] * alpha + bg[2] * (1 - alpha),
    ];
  }
  function hex(h: string): [number, number, number] {
    return [
      Number.parseInt(h.slice(1, 3), 16),
      Number.parseInt(h.slice(3, 5), 16),
      Number.parseInt(h.slice(5, 7), 16),
    ];
  }
  function luminanceRgb([r, g, b]: [number, number, number]): number {
    const toLinear = (c: number) => {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }

  const primaryDark = '#6B4226';
  const surface = '#FFF8F0';
  const bgLuminance = luminanceRgb(hex(primaryDark));

  function ratioAtAlpha(alpha: number): number {
    const textLuminance = luminanceRgb(blend(surface, alpha, primaryDark));
    const L1 = Math.max(textLuminance, bgLuminance);
    const L2 = Math.min(textLuminance, bgLuminance);
    return (L1 + 0.05) / (L2 + 0.05);
  }

  it('text-surface/40 (old copyright opacity) FAILS 4.5:1', () => {
    expect(ratioAtAlpha(0.4)).toBeLessThan(4.5);
  });

  it('text-surface/50 (old nav/social heading opacity) FAILS 4.5:1', () => {
    expect(ratioAtAlpha(0.5)).toBeLessThan(4.5);
  });

  it('text-surface/70 (the fixed opacity, used throughout Footer.astro) PASSES 4.5:1', () => {
    expect(ratioAtAlpha(0.7)).toBeGreaterThanOrEqual(4.5);
  });

  it('Footer.astro does not use the failing text-surface/40 or text-surface/50 opacities', () => {
    expect(footerSource).not.toMatch(/text-surface\/40\b/);
    expect(footerSource).not.toMatch(/text-surface\/50\b/);
  });
});

describe('logo image-redundant-alt fix (M7)', () => {
  const headerSource = readFileSync(
    join(process.cwd(), 'src/components/Header.astro'),
    'utf-8'
  );

  for (const [label, source] of [
    ['Header.astro', headerSource],
    ['Footer.astro', footerSource],
  ] as const) {
    it(`${label}'s logo <img> alt does not duplicate the adjacent visible "Animals Vida Digna" text`, () => {
      const imgMatch = source.match(/<img\s+src="\/images\/logo\.webp"[\s\S]*?\/>/);
      expect(imgMatch, `${label} must render the logo <img>`).not.toBeNull();
      expect(imgMatch?.[0]).toMatch(/alt=""/);
      expect(imgMatch?.[0]).not.toMatch(/alt="Animals Vida Digna"/);
      // The link must still have an accessible name (aria-label), since the
      // visible span may be hidden (Header, on small viewports) or made
      // aria-hidden to avoid announcing the brand name twice.
      expect(source).toMatch(/aria-label="Animals Vida Digna"/);
    });
  }
});

describe('WCAG AA compliance for brand color pairs', () => {
  const passingPairs: Array<{ name: string; fg: string; bg: string }> = [
    { name: 'text on surface', fg: colors.text, bg: colors.surface },
    { name: 'text-muted on surface', fg: colors['text-muted'], bg: colors.surface },
    { name: 'primary on surface', fg: colors.primary, bg: colors.surface },
    { name: 'primary-dark on surface', fg: colors['primary-dark'], bg: colors.surface },
    { name: 'text on accent (button text)', fg: colors.text, bg: colors.accent },
  ];

  for (const pair of passingPairs) {
    it(`${pair.name} passes 4.5:1 minimum`, () => {
      expect(contrastRatio(pair.fg, pair.bg)).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('accent on surface FAILS -- must not be used as text color on light bg', () => {
    expect(contrastRatio(colors.accent, colors.surface)).toBeLessThan(3);
  });
});

describe('AdoptionForm submit button contrast (WCAG AA fix)', () => {
  // AdoptionForm renders the primary conversion control on cat detail
  // pages. It used to render white text on `bg-accent`, measured at
  // ~2.03:1 -- well under the 4.5:1 AA minimum for normal text (the button
  // label is well under the 18.66px-bold / 24px large-text threshold, so
  // the 3:1 large-text exception doesn't apply either). The fix swaps the
  // text color to `text-text` (#2D1B0E), the same dark-brown-on-accent
  // pairing already used everywhere else bg-accent appears as a button
  // background (Header, Footer, DonateSticky, the landing CTAs) -- so this
  // also confirms the fix doesn't introduce a new, unrelated color.
  const adoptionFormSource = readFileSync(
    join(process.cwd(), 'src/components/forms/AdoptionForm.tsx'),
    'utf-8'
  );

  function extractSubmitButtonClass(source: string): string {
    const match = source.match(
      /<button\s+type="submit"[\s\S]*?class="([^"]+)"/
    );
    if (!match) {
      throw new Error('could not find the submit <button> in AdoptionForm.tsx');
    }
    return match[1];
  }

  it('white on accent (the pre-fix pairing) FAILS 4.5:1', () => {
    const ratio = contrastRatio('#FFFFFF', colors.accent);
    expect(ratio).toBeCloseTo(2.03, 1);
    expect(ratio).toBeLessThan(4.5);
  });

  it('text on accent (the fixed pairing) PASSES 4.5:1', () => {
    expect(contrastRatio(colors.text, colors.accent)).toBeGreaterThanOrEqual(
      4.5
    );
  });

  it("the submit button's class list does not use text-white on bg-accent", () => {
    const buttonClass = extractSubmitButtonClass(adoptionFormSource);
    expect(buttonClass).toMatch(/\bbg-accent\b/);
    expect(buttonClass).not.toMatch(/\btext-white\b/);
    expect(buttonClass).toMatch(/\btext-text\b/);
  });
});
