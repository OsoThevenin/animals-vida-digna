import type { Locale } from './index';

/**
 * Read a locale-suffixed field from a content entry.
 * e.g. getLocalizedField(entry, 'name', 'ca') reads entry.name_ca
 */
export function getLocalizedField<T>(
  entry: Record<string, T>,
  fieldName: string,
  locale: Locale
): T {
  return entry[`${fieldName}_${locale}`];
}
