import type { CatStatus } from '@avd/content/validate';
import { CAT_STATUS_LABELS_CA } from '@/lib/cat-status-labels';

/**
 * Parses the `?status=` query param on the cats list into a `CatStatus` the
 * list can filter by, or `null` for "all statuses" (both the empty string
 * from the "Tots" option and an absent/unknown/forged param resolve to
 * `null` rather than throwing — the list is a GET form with no validation
 * layer in front of it).
 */
export function parseStatusFilter(value: string | null): CatStatus | null {
  const validStatuses = Object.keys(CAT_STATUS_LABELS_CA) as CatStatus[];
  return validStatuses.includes(value as CatStatus)
    ? (value as CatStatus)
    : null;
}
