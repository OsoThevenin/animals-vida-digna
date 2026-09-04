import type { CatStatus } from '@avd/content/validate';

/**
 * The admin list is Catalan-only (volunteers editing content are Catalan
 * speakers; the bilingual public site does its own per-locale labelling in
 * apps/web/src/i18n). Keys match packages/content's CAT_STATUSES values.
 *
 * CatStatus comes from @avd/content/validate, not @avd/design-system:
 * Phase 2 types the schema's `cats.status` column as
 * `.$type<CatStatus>()` with `CatStatus` exported from
 * packages/content/src/validate.ts, so `cat.status` (read from
 * `listAllCats`) is already that literal union, not `string` — this import
 * is what makes `Record<CatStatus, string>` below (and `<Badge
 * status={cat.status} />` in src/pages/cats/index.astro) type-check
 * without a cast. @avd/design-system's own `CatStatus` (used by `Badge`'s
 * `status` prop) is the identical union, so the two are structurally
 * interchangeable — this file just imports the one that is the source of
 * truth for the D1 column.
 */
export const CAT_STATUS_LABELS_CA: Record<CatStatus, string> = {
  available: 'Disponible',
  adopted: 'Adoptat',
  treatment: 'En tractament',
  unavailable: 'No disponible',
};
