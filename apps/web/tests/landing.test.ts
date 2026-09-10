import { describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// LAND-01: Section map -- discriminant -> component mapping
// ---------------------------------------------------------------------------

/** Maps block discriminant values to their component names */
const SECTION_MAP: Record<string, string> = {
  hero: 'HeroSection',
  about: 'AboutSection',
  stats: 'StatsSection',
  colonies: 'ColoniesSection',
  adopt: 'AdoptSection',
  collaborate: 'CollaborateSection',
  contactCta: 'ContactCtaSection',
  newsletter: 'NewsletterPlaceholder',
  faq: 'FaqPlaceholder',
};

describe('LAND-01: Section rendering map', () => {
  it('maps all 9 block types to component names', () => {
    expect(Object.keys(SECTION_MAP)).toHaveLength(9);
  });

  it('maps hero to HeroSection', () => {
    expect(SECTION_MAP.hero).toBe('HeroSection');
  });

  it('maps about to AboutSection', () => {
    expect(SECTION_MAP.about).toBe('AboutSection');
  });

  it('maps stats to StatsSection', () => {
    expect(SECTION_MAP.stats).toBe('StatsSection');
  });

  it('maps colonies to ColoniesSection', () => {
    expect(SECTION_MAP.colonies).toBe('ColoniesSection');
  });

  it('maps adopt to AdoptSection', () => {
    expect(SECTION_MAP.adopt).toBe('AdoptSection');
  });

  it('maps collaborate to CollaborateSection', () => {
    expect(SECTION_MAP.collaborate).toBe('CollaborateSection');
  });

  it('maps contactCta to ContactCtaSection', () => {
    expect(SECTION_MAP.contactCta).toBe('ContactCtaSection');
  });

  it('maps newsletter to NewsletterPlaceholder', () => {
    expect(SECTION_MAP.newsletter).toBe('NewsletterPlaceholder');
  });

  it('maps faq to FaqPlaceholder', () => {
    expect(SECTION_MAP.faq).toBe('FaqPlaceholder');
  });

  it('returns undefined for unknown discriminant', () => {
    expect(SECTION_MAP['unknown']).toBeUndefined();
  });
});
