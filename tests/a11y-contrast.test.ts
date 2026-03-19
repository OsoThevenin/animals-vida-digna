import { describe, it, expect } from 'vitest';

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
