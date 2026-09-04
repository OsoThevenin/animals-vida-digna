import { describe, expect, it } from 'vitest';
import { buildCatsSitemap } from '../src/lib/sitemap-cats';

const site = 'https://animalsvidadigna.org';

describe('buildCatsSitemap', () => {
  it('returns a valid XML document with the sitemap and xhtml namespaces', () => {
    const xml = buildCatsSitemap([], site);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(xml).toContain('<urlset');
    expect(xml).toContain('</urlset>');
  });

  it('emits one <url> per locale per cat', () => {
    const xml = buildCatsSitemap(
      [{ slugCa: 'lluna', slugEs: 'luna', updatedAt: '2026-01-01T00:00:00.000Z' }],
      site,
    );
    expect((xml.match(/<url>/g) ?? []).length).toBe(2);
    expect(xml).toContain('<loc>https://animalsvidadigna.org/cat/lluna</loc>');
    expect(xml).toContain('<loc>https://animalsvidadigna.org/es/cat/luna</loc>');
  });

  it('includes lastmod from updatedAt', () => {
    const xml = buildCatsSitemap(
      [{ slugCa: 'lluna', slugEs: 'luna', updatedAt: '2026-01-01T00:00:00.000Z' }],
      site,
    );
    expect(xml).toContain('<lastmod>2026-01-01T00:00:00.000Z</lastmod>');
  });

  it('includes ca/es/x-default xhtml alternate links, x-default pointing to the CA url', () => {
    const xml = buildCatsSitemap(
      [{ slugCa: 'lluna', slugEs: 'luna', updatedAt: '2026-01-01T00:00:00.000Z' }],
      site,
    );
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="ca" href="https://animalsvidadigna.org/cat/lluna" />');
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="es" href="https://animalsvidadigna.org/es/cat/luna" />');
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="x-default" href="https://animalsvidadigna.org/cat/lluna" />');
  });

  it('handles multiple cats', () => {
    const xml = buildCatsSitemap(
      [
        { slugCa: 'lluna', slugEs: 'luna', updatedAt: '2026-01-01T00:00:00.000Z' },
        { slugCa: 'michi', slugEs: 'michi-es', updatedAt: '2026-02-01T00:00:00.000Z' },
      ],
      site,
    );
    expect((xml.match(/<url>/g) ?? []).length).toBe(4);
    expect(xml).toContain('/cat/michi');
    expect(xml).toContain('/es/cat/michi-es');
  });
});
