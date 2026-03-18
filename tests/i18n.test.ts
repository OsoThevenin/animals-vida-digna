import { describe, expect, it } from 'vitest';
import { getLocaleFromUrl, getAlternateUrl, t } from '../src/i18n/index';
import { getLocalizedField } from '../src/i18n/content';
import fs from 'node:fs';

// ---------------------------------------------------------------------------
// I18N-01: Root paths resolve to Catalan
// ---------------------------------------------------------------------------
describe('I18N-01: Root paths resolve to Catalan', () => {
  it('/ returns ca', () => {
    expect(getLocaleFromUrl(new URL('https://x.com/'))).toBe('ca');
  });

  it('/cats returns ca', () => {
    expect(getLocaleFromUrl(new URL('https://x.com/cats'))).toBe('ca');
  });

  it('/about returns ca', () => {
    expect(getLocaleFromUrl(new URL('https://x.com/about'))).toBe('ca');
  });
});

// ---------------------------------------------------------------------------
// I18N-02: /es paths resolve to Spanish
// ---------------------------------------------------------------------------
describe('I18N-02: /es paths resolve to Spanish', () => {
  it('/es returns es', () => {
    expect(getLocaleFromUrl(new URL('https://x.com/es'))).toBe('es');
  });

  it('/es/cats returns es', () => {
    expect(getLocaleFromUrl(new URL('https://x.com/es/cats'))).toBe('es');
  });

  it('/es/about returns es', () => {
    expect(getLocaleFromUrl(new URL('https://x.com/es/about'))).toBe('es');
  });
});

// ---------------------------------------------------------------------------
// I18N-03: Alternate URL mapping
// ---------------------------------------------------------------------------
describe('I18N-03: Alternate URL mapping', () => {
  it('/ -> /es', () => {
    expect(getAlternateUrl(new URL('https://x.com/'), 'es')).toBe('/es');
  });

  it('/es -> /', () => {
    expect(getAlternateUrl(new URL('https://x.com/es'), 'ca')).toBe('/');
  });

  it('/cats/misi -> /es/cats/misi', () => {
    expect(getAlternateUrl(new URL('https://x.com/cats/misi'), 'es')).toBe('/es/cats/misi');
  });

  it('/es/cats/misi -> /cats/misi', () => {
    expect(getAlternateUrl(new URL('https://x.com/es/cats/misi'), 'ca')).toBe('/cats/misi');
  });

  it('same locale returns same path', () => {
    expect(getAlternateUrl(new URL('https://x.com/cats'), 'ca')).toBe('/cats');
  });
});

// ---------------------------------------------------------------------------
// I18N-04: Translation function returns correct strings
// ---------------------------------------------------------------------------
describe('I18N-04: Translation function', () => {
  it('t(ca, nav.home) returns Catalan string', () => {
    const result = t('ca', 'nav.home');
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it('t(es, nav.home) returns Spanish string', () => {
    const result = t('es', 'nav.home');
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it('CA and ES nav.home are different', () => {
    expect(t('ca', 'nav.home')).not.toBe(t('es', 'nav.home'));
  });

  it('CA and ES cta.adopt are different', () => {
    expect(t('ca', 'cta.adopt')).not.toBe(t('es', 'cta.adopt'));
  });
});

// ---------------------------------------------------------------------------
// I18N-05: No automatic locale redirect middleware
// ---------------------------------------------------------------------------
describe('I18N-05: No automatic locale redirect', () => {
  it('no src/middleware.ts with redirect logic', () => {
    const middlewarePath = 'src/middleware.ts';
    const exists = fs.existsSync(middlewarePath);
    if (exists) {
      const content = fs.readFileSync(middlewarePath, 'utf-8');
      expect(content).not.toMatch(/redirect/i);
      expect(content).not.toMatch(/locale.*redirect/i);
    }
    // If file doesn't exist, that's the expected state
    expect(true).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Content helpers
// ---------------------------------------------------------------------------
describe('Content helpers: getLocalizedField', () => {
  const entry = {
    name_ca: 'Misi',
    name_es: 'Misi',
    shortDescription_ca: 'Un gat molt dolc',
    shortDescription_es: 'Un gato muy dulce',
  };

  it('reads _ca field', () => {
    expect(getLocalizedField(entry, 'name', 'ca')).toBe('Misi');
  });

  it('reads _es field', () => {
    expect(getLocalizedField(entry, 'shortDescription', 'es')).toBe('Un gato muy dulce');
  });

  it('reads _ca description field', () => {
    expect(getLocalizedField(entry, 'shortDescription', 'ca')).toBe('Un gat molt dolc');
  });
});
