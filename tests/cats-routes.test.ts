import { describe, expect, it } from 'vitest';
import {
  generateCatPathsCa,
  generateCatPathsEs,
  type CatRouteEntry,
} from '../src/lib/cat-routes';

const entries: CatRouteEntry[] = [
  { keystatic_slug: 'michi', slug_es: 'michi-es' },
  { keystatic_slug: 'luna', slug_es: 'luna-es' },
  { keystatic_slug: 'nala', slug_es: '' }, // empty slug_es
  { keystatic_slug: 'simba' }, // no slug_es at all
];

describe('generateCatPathsCa', () => {
  it('uses keystatic_slug for Catalan routes', () => {
    const paths = generateCatPathsCa(entries);
    expect(paths).toHaveLength(4);
    expect(paths[0].params.slug).toBe('michi');
    expect(paths[1].params.slug).toBe('luna');
    expect(paths[2].params.slug).toBe('nala');
    expect(paths[3].params.slug).toBe('simba');
  });

  it('passes keystatic_slug in props', () => {
    const paths = generateCatPathsCa(entries);
    expect(paths[0].props.keystatic_slug).toBe('michi');
  });
});

describe('generateCatPathsEs', () => {
  it('uses slug_es for Spanish routes when available', () => {
    const paths = generateCatPathsEs(entries);
    expect(paths[0].params.slug).toBe('michi-es');
    expect(paths[1].params.slug).toBe('luna-es');
  });

  it('falls back to keystatic_slug when slug_es is empty', () => {
    const paths = generateCatPathsEs(entries);
    expect(paths[2].params.slug).toBe('nala');
  });

  it('falls back to keystatic_slug when slug_es is undefined', () => {
    const paths = generateCatPathsEs(entries);
    expect(paths[3].params.slug).toBe('simba');
  });

  it('always passes keystatic_slug in props regardless of slug used', () => {
    const paths = generateCatPathsEs(entries);
    expect(paths[0].props.keystatic_slug).toBe('michi');
    expect(paths[2].props.keystatic_slug).toBe('nala');
  });
});
