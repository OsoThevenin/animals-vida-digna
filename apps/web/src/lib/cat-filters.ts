/**
 * Pure filter logic for cat listings.
 * Extracted for testability -- used by CatFilters Preact island.
 */

export interface CatFilterData {
  id: string;
  name: string;
  slug: string;
  status: string;
  age: number | null;
  gender: string;
  personality: string[];
  coverImage: {
    key: string;
    alt: string;
    width: number;
    height: number;
  } | null;
  shortDescription: string;
  featured: boolean;
}

export interface CatFilterState {
  status: string;
  gender: string;
  personality: string;
}

/**
 * Filter cats based on current filter selections.
 * Each filter set to 'all' is ignored.
 * Multiple active filters use AND logic.
 */
export function filterCats(
  cats: CatFilterData[],
  filters: CatFilterState
): CatFilterData[] {
  return cats.filter((cat) => {
    if (filters.status !== 'all' && cat.status !== filters.status)
      return false;
    if (filters.gender !== 'all' && cat.gender !== filters.gender)
      return false;
    if (
      filters.personality !== 'all' &&
      !cat.personality.includes(filters.personality)
    )
      return false;
    return true;
  });
}
