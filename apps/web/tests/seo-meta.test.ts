import { describe, expect, it } from 'vitest';
import { buildCanonicalUrl, buildHreflangLinks, buildOgMeta } from '../src/lib/seo';

describe('buildCanonicalUrl', () => {
  const site = 'https://animalsvidadigna.org';

  it('joins site and pathname into absolute URL', () => {
    expect(buildCanonicalUrl('/cats', site)).toBe('https://animalsvidadigna.org/cats');
  });

  it('handles root pathname', () => {
    expect(buildCanonicalUrl('/', site)).toBe('https://animalsvidadigna.org/');
  });

  it('handles nested paths', () => {
    expect(buildCanonicalUrl('/es/cats', site)).toBe('https://animalsvidadigna.org/es/cats');
  });

  it('handles trailing slash on site', () => {
    expect(buildCanonicalUrl('/cats', 'https://animalsvidadigna.org/')).toBe(
      'https://animalsvidadigna.org/cats',
    );
  });
});

describe('buildHreflangLinks', () => {
  const caUrl = 'https://animalsvidadigna.org/cats';
  const esUrl = 'https://animalsvidadigna.org/es/cats';

  it('returns exactly 3 entries', () => {
    const links = buildHreflangLinks(caUrl, esUrl, 'ca');
    expect(links).toHaveLength(3);
  });

  it('includes self-referencing hreflang for CA locale', () => {
    const links = buildHreflangLinks(caUrl, esUrl, 'ca');
    expect(links).toContainEqual({ hreflang: 'ca', href: caUrl });
  });

  it('includes alternate hreflang for CA locale', () => {
    const links = buildHreflangLinks(caUrl, esUrl, 'ca');
    expect(links).toContainEqual({ hreflang: 'es', href: esUrl });
  });

  it('x-default points to CA variant when locale is CA', () => {
    const links = buildHreflangLinks(caUrl, esUrl, 'ca');
    const xDefault = links.find((l) => l.hreflang === 'x-default');
    expect(xDefault?.href).toBe(caUrl);
  });

  it('x-default points to CA variant when locale is ES', () => {
    const links = buildHreflangLinks(esUrl, caUrl, 'es');
    const xDefault = links.find((l) => l.hreflang === 'x-default');
    expect(xDefault?.href).toBe(caUrl);
  });

  it('includes self-referencing hreflang for ES locale', () => {
    const links = buildHreflangLinks(esUrl, caUrl, 'es');
    expect(links).toContainEqual({ hreflang: 'es', href: esUrl });
  });

  it('includes alternate hreflang for ES locale', () => {
    const links = buildHreflangLinks(esUrl, caUrl, 'es');
    expect(links).toContainEqual({ hreflang: 'ca', href: caUrl });
  });
});

describe('buildOgMeta', () => {
  const baseOpts = {
    title: 'Gats en adopció',
    description: 'Troba el teu gat ideal',
    url: 'https://animalsvidadigna.org/cats',
    locale: 'ca' as const,
  };

  it('includes og:title', () => {
    const og = buildOgMeta(baseOpts);
    expect(og['og:title']).toBe('Gats en adopció');
  });

  it('includes og:description', () => {
    const og = buildOgMeta(baseOpts);
    expect(og['og:description']).toBe('Troba el teu gat ideal');
  });

  it('includes og:url', () => {
    const og = buildOgMeta(baseOpts);
    expect(og['og:url']).toBe('https://animalsvidadigna.org/cats');
  });

  it('includes og:type as website', () => {
    const og = buildOgMeta(baseOpts);
    expect(og['og:type']).toBe('website');
  });

  it('includes og:locale for CA', () => {
    const og = buildOgMeta(baseOpts);
    expect(og['og:locale']).toBe('ca');
  });

  it('includes og:locale:alternate for CA locale', () => {
    const og = buildOgMeta(baseOpts);
    expect(og['og:locale:alternate']).toBe('es');
  });

  it('includes og:locale:alternate for ES locale', () => {
    const og = buildOgMeta({ ...baseOpts, locale: 'es' });
    expect(og['og:locale:alternate']).toBe('ca');
  });

  it('includes og:site_name defaulting to Animals Vida Digna', () => {
    const og = buildOgMeta(baseOpts);
    expect(og['og:site_name']).toBe('Animals Vida Digna');
  });

  it('includes og:image when provided', () => {
    const og = buildOgMeta({ ...baseOpts, image: 'https://example.com/img.jpg' });
    expect(og['og:image']).toBe('https://example.com/img.jpg');
  });

  it('omits og:image when not provided', () => {
    const og = buildOgMeta(baseOpts);
    expect(og).not.toHaveProperty('og:image');
  });

  it('allows custom siteName', () => {
    const og = buildOgMeta({ ...baseOpts, siteName: 'Custom Name' });
    expect(og['og:site_name']).toBe('Custom Name');
  });
});
