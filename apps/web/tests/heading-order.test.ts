import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * M7 (heading-order) regression: Lighthouse flagged /cats, /es/cats and the
 * cat detail pages for skipping straight from <h1> to a deeper-nested
 * heading (<h3> from CatCard.astro's cat name, <h4> from CatTraits.astro's
 * personality/good-with subheadings) with no intervening level. The fix
 * inserts a visually-hidden <h2> (Tailwind's sr-only) right after each
 * page's <h1>, and CatTraits.astro's subheadings move from <h4> to <h3> so
 * they nest correctly under that new <h2>.
 */

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf-8');
}

describe('cats listing pages insert a heading between h1 and CatCard/CatFilters h3', () => {
  for (const page of ['src/pages/cats/index.astro', 'src/pages/es/cats/index.astro']) {
    it(`${page} has an <h2> after the <h1> and before the filter island`, () => {
      const source = read(page);
      const h1Index = source.indexOf('<h1');
      const h2Index = source.indexOf('<h2', h1Index);
      const catFiltersIndex = source.indexOf('<CatFilters');
      expect(h1Index).toBeGreaterThanOrEqual(0);
      expect(h2Index).toBeGreaterThan(h1Index);
      expect(h2Index).toBeLessThan(catFiltersIndex);
    });
  }
});

describe('cat detail pages insert a heading between h1 and CatTraits h3s', () => {
  for (const page of ['src/pages/cat/[slug].astro', 'src/pages/es/cat/[slug].astro']) {
    it(`${page} has an <h2> after the <h1> and before <CatTraits`, () => {
      const source = read(page);
      const h1Index = source.indexOf('<h1');
      const h2Index = source.indexOf('<h2', h1Index);
      const catTraitsIndex = source.indexOf('<CatTraits');
      expect(h1Index).toBeGreaterThanOrEqual(0);
      expect(h2Index).toBeGreaterThan(h1Index);
      expect(h2Index).toBeLessThan(catTraitsIndex);
    });
  }
});

describe('CatTraits.astro subheadings are h3 (not h4)', () => {
  it('uses <h3> for the personality and good-with subheadings', () => {
    const source = read('src/components/cats/CatTraits.astro');
    expect(source).not.toMatch(/<h4/);
    expect((source.match(/<h3/g) ?? []).length).toBe(2);
  });
});
