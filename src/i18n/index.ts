import ca from './ca';
import type { TranslationKey } from './ca';
import es from './es';

export type Locale = 'ca' | 'es';

export const locales: Locale[] = ['ca', 'es'];
export const defaultLocale: Locale = 'ca';

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { ca, es };

/**
 * Look up a UI string by key for the given locale.
 * Falls back to Catalan, then to the key itself.
 */
export function t(locale: Locale, key: TranslationKey): string {
  return dictionaries[locale]?.[key] ?? dictionaries.ca[key] ?? key;
}

/**
 * Derive the current locale from a URL.
 * Paths starting with /es are Spanish; everything else is Catalan (default).
 */
export function getLocaleFromUrl(url: URL): Locale {
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments[0] === 'es') return 'es';
  return 'ca';
}

/**
 * Convert a URL to its alternate-locale equivalent.
 * CA (root) paths get /es prefix; ES paths have /es stripped.
 */
export function getAlternateUrl(url: URL, targetLocale: Locale): string {
  const currentLocale = getLocaleFromUrl(url);

  if (currentLocale === targetLocale) {
    return url.pathname;
  }

  if (targetLocale === 'es') {
    // CA -> ES: add /es prefix
    const path = url.pathname === '/' ? '' : url.pathname;
    return `/es${path}`;
  }

  // ES -> CA: strip /es prefix
  const withoutEs = url.pathname.replace(/^\/es\/?/, '/');
  return withoutEs || '/';
}

export type { TranslationKey };
