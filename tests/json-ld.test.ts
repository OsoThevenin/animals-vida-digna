import { describe, expect, it } from 'vitest';
import { buildOrganizationSchema, buildCatSchema } from '../src/lib/seo';

describe('buildOrganizationSchema', () => {
  it('returns valid JSON-LD Organization with @context and @type', () => {
    const schema = buildOrganizationSchema({
      name: 'Animals Vida Digna',
      url: 'https://animalsvidadigna.org',
      logo: 'https://animalsvidadigna.org/images/logo.webp',
    });
    expect(schema).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Animals Vida Digna',
      url: 'https://animalsvidadigna.org',
      logo: 'https://animalsvidadigna.org/images/logo.webp',
    });
  });

  it('includes contactPoint when email is provided', () => {
    const schema = buildOrganizationSchema({
      name: 'Animals Vida Digna',
      url: 'https://animalsvidadigna.org',
      logo: 'https://animalsvidadigna.org/images/logo.webp',
      email: 'info@animalsvidadigna.org',
    });
    expect(schema).toHaveProperty('contactPoint');
    expect((schema as Record<string, unknown>).contactPoint).toMatchObject({
      '@type': 'ContactPoint',
      email: 'info@animalsvidadigna.org',
    });
  });

  it('omits contactPoint when no email', () => {
    const schema = buildOrganizationSchema({
      name: 'Animals Vida Digna',
      url: 'https://animalsvidadigna.org',
      logo: 'https://animalsvidadigna.org/images/logo.webp',
    });
    expect(schema).not.toHaveProperty('contactPoint');
  });
});

describe('buildCatSchema', () => {
  it('returns valid JSON-LD Thing with all fields', () => {
    const schema = buildCatSchema({
      name: 'Misha',
      description: 'Una gata molt dolça',
      image: 'https://animalsvidadigna.org/images/misha.webp',
      url: 'https://animalsvidadigna.org/cat/misha',
      inLanguage: 'ca',
    });
    expect(schema).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Thing',
      name: 'Misha',
      description: 'Una gata molt dolça',
      image: 'https://animalsvidadigna.org/images/misha.webp',
      url: 'https://animalsvidadigna.org/cat/misha',
      inLanguage: 'ca',
    });
  });

  it('uses BCP 47 language code for ES', () => {
    const schema = buildCatSchema({
      name: 'Misha',
      description: 'Una gata muy dulce',
      image: 'https://animalsvidadigna.org/images/misha.webp',
      url: 'https://animalsvidadigna.org/es/cat/misha',
      inLanguage: 'es',
    });
    expect((schema as Record<string, unknown>).inLanguage).toBe('es');
  });
});
