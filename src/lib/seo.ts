import type { Locale } from '../i18n/index';

/**
 * Build an absolute canonical URL from a pathname and site origin.
 */
export function buildCanonicalUrl(pathname: string, site: string): string {
  return new URL(pathname, site).href;
}

/**
 * Build hreflang link entries for a page.
 * Returns self-reference, alternate locale, and x-default (always CA).
 */
export function buildHreflangLinks(
  canonicalUrl: string,
  alternateUrl: string,
  locale: Locale,
): ReadonlyArray<{ readonly hreflang: string; readonly href: string }> {
  const otherLocale: Locale = locale === 'ca' ? 'es' : 'ca';
  const xDefaultHref = locale === 'ca' ? canonicalUrl : alternateUrl;

  return [
    { hreflang: locale, href: canonicalUrl },
    { hreflang: otherLocale, href: alternateUrl },
    { hreflang: 'x-default', href: xDefaultHref },
  ];
}

interface OgMetaOptions {
  readonly title: string;
  readonly description: string;
  readonly url: string;
  readonly locale: Locale;
  readonly image?: string;
  readonly siteName?: string;
}

/**
 * Build Open Graph meta tag key-value pairs.
 */
export function buildOgMeta(opts: OgMetaOptions): Record<string, string> {
  const alternateLocale: Locale = opts.locale === 'ca' ? 'es' : 'ca';

  const meta: Record<string, string> = {
    'og:title': opts.title,
    'og:description': opts.description,
    'og:url': opts.url,
    'og:type': 'website',
    'og:locale': opts.locale,
    'og:locale:alternate': alternateLocale,
    'og:site_name': opts.siteName ?? 'Animals Vida Digna',
  };

  if (opts.image) {
    meta['og:image'] = opts.image;
  }

  return meta;
}

interface OrganizationSchemaOptions {
  readonly name: string;
  readonly url: string;
  readonly logo: string;
  readonly email?: string;
}

/**
 * Build JSON-LD Organization structured data.
 */
export function buildOrganizationSchema(opts: OrganizationSchemaOptions): object {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: opts.name,
    url: opts.url,
    logo: opts.logo,
  };

  if (opts.email) {
    schema.contactPoint = {
      '@type': 'ContactPoint',
      email: opts.email,
    };
  }

  return schema;
}

interface CatSchemaOptions {
  readonly name: string;
  readonly description: string;
  readonly image: string;
  readonly url: string;
  readonly inLanguage: string;
}

/**
 * Build JSON-LD Thing structured data for a cat.
 */
export function buildCatSchema(opts: CatSchemaOptions): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Thing',
    name: opts.name,
    description: opts.description,
    image: opts.image,
    url: opts.url,
    inLanguage: opts.inLanguage,
  };
}
