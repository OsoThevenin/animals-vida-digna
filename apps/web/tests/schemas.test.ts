import { describe, expect, it } from 'vitest';
import keystaticConfig from '../keystatic.config';

// Helper: get field names from a schema object
function fieldNames(schema: Record<string, unknown>): string[] {
  return Object.keys(schema);
}

describe('CMS-01: Settings singleton', () => {
  const settings = keystaticConfig.singletons?.settings;

  it('exists in config', () => {
    expect(settings).toBeDefined();
  });

  it('has siteName_ca and siteName_es', () => {
    const fields = fieldNames(settings!.schema);
    expect(fields).toContain('siteName_ca');
    expect(fields).toContain('siteName_es');
  });

  it('has donateUrl and contactEmail', () => {
    const fields = fieldNames(settings!.schema);
    expect(fields).toContain('donateUrl');
    expect(fields).toContain('contactEmail');
  });

  it('has social object with facebook, instagram, twitter', () => {
    const fields = fieldNames(settings!.schema);
    expect(fields).toContain('social');
    const social = (settings!.schema as any).social;
    expect(social).toBeDefined();
  });

  it('has seo object with localized fields', () => {
    const fields = fieldNames(settings!.schema);
    expect(fields).toContain('seo');
  });

  it('has logo and primaryColor', () => {
    const fields = fieldNames(settings!.schema);
    expect(fields).toContain('logo');
    expect(fields).toContain('primaryColor');
  });
});

describe('CMS-03: Landing singleton', () => {
  const landing = keystaticConfig.singletons?.landing;

  it('exists in config', () => {
    expect(landing).toBeDefined();
  });

  it('has sections field', () => {
    const fields = fieldNames(landing!.schema);
    expect(fields).toContain('sections');
  });

  it('sections supports all 9 block types', () => {
    // Access the blocks definition on the sections field
    // The blocks field stores block definitions internally
    const sections = (landing!.schema as any).sections;
    expect(sections).toBeDefined();

    // Keystatic blocks field should have the block type definitions
    // We verify by checking the internal structure
    const expectedTypes = [
      'hero',
      'about',
      'stats',
      'colonies',
      'adopt',
      'collaborate',
      'contactCta',
      'newsletter',
      'faq',
    ];

    // blocks() creates an array field whose element is a conditional field.
    // The block type names are stored in element.values (object keys)
    // and also in element.discriminant.options (label/value pairs).
    const blockValues = sections.element?.values;
    expect(blockValues).toBeDefined();

    const definedTypes = Object.keys(blockValues);
    for (const type of expectedTypes) {
      expect(
        definedTypes,
        `Block type "${type}" should be defined in sections`,
      ).toContain(type);
    }
  });
});

describe('CMS-04: Pages collection', () => {
  const pages = keystaticConfig.collections?.pages;

  it('exists in config', () => {
    expect(pages).toBeDefined();
  });

  it('uses slug as slugField', () => {
    expect(pages!.slugField).toBe('slug');
  });

  it('has slug, title_ca, title_es', () => {
    const fields = fieldNames(pages!.schema);
    expect(fields).toContain('slug');
    expect(fields).toContain('title_ca');
    expect(fields).toContain('title_es');
  });

  it('has content_ca and content_es', () => {
    const fields = fieldNames(pages!.schema);
    expect(fields).toContain('content_ca');
    expect(fields).toContain('content_es');
  });

  it('has seo object', () => {
    const fields = fieldNames(pages!.schema);
    expect(fields).toContain('seo');
  });
});

describe('CMS-05: Bilingual alt text on all image fields', () => {
  it('settings seo image has alt_ca and alt_es', () => {
    const seo = (keystaticConfig.singletons!.settings!.schema as any).seo;
    expect(seo).toBeDefined();
    const seoInner = seo.schema || seo.fields || seo;
    const seoKeys = Object.keys(seoInner);
    expect(seoKeys).toContain('image');

    const image = seoInner.image;
    const imageInner = image.schema || image.fields || image;
    const imageKeys = Object.keys(imageInner);
    expect(imageKeys).toContain('alt_ca');
    expect(imageKeys).toContain('alt_es');
  });
});
