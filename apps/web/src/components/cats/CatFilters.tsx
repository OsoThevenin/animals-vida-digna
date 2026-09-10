import {
  DEFAULT_IMAGES_ORIGIN,
  DEFAULT_SIZES,
  DEFAULT_WIDTHS,
  imageSrcset,
  imageUrl,
} from '@avd/content/image-url';
import { useState } from 'preact/hooks';
import { type CatFilterData, filterCats } from '../../lib/cat-filters';

interface Translations {
  filterStatus: string;
  filterGender: string;
  filterPersonality: string;
  filterAll: string;
  showing: string;
  noResults: string;
  statusAvailable: string;
  statusAdopted: string;
  statusTreatment: string;
  statusUnavailable: string;
  genderMale: string;
  genderFemale: string;
  personalityPlayful: string;
  personalityCalm: string;
  personalityShy: string;
  personalityAffectionate: string;
  personalityIndependent: string;
  personalitySocial: string;
  personalityCurious: string;
  personalityProtective: string;
  catsLabel: string;
}

interface Props {
  cats: CatFilterData[];
  locale: 'ca' | 'es';
  translations: Translations;
}

const statusColors: Record<string, string> = {
  available: 'bg-green-100 text-green-800',
  adopted: 'bg-blue-100 text-blue-800',
  treatment: 'bg-amber-100 text-amber-800',
  unavailable: 'bg-gray-100 text-gray-600',
};

const IMAGES_ORIGIN =
  import.meta.env.PUBLIC_IMAGES_ORIGIN ?? DEFAULT_IMAGES_ORIGIN;

export default function CatFilters({ cats, locale, translations: t }: Props) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [personalityFilter, setPersonalityFilter] = useState('all');

  const filtered = filterCats(cats, {
    status: statusFilter,
    gender: genderFilter,
    personality: personalityFilter,
  });

  const detailBase = locale === 'ca' ? '/cat/' : '/es/cat/';

  return (
    <div>
      {/* Filter controls */}
      <div class="mb-8 flex flex-wrap gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-muted" htmlFor="status-filter">
            {t.filterStatus}
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target as HTMLSelectElement).value)}
            class="rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          >
            <option value="all">{t.filterAll}</option>
            <option value="available">{t.statusAvailable}</option>
            <option value="adopted">{t.statusAdopted}</option>
            <option value="treatment">{t.statusTreatment}</option>
            <option value="unavailable">{t.statusUnavailable}</option>
          </select>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-muted" htmlFor="gender-filter">
            {t.filterGender}
          </label>
          <select
            id="gender-filter"
            value={genderFilter}
            onChange={(e) => setGenderFilter((e.target as HTMLSelectElement).value)}
            class="rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          >
            <option value="all">{t.filterAll}</option>
            <option value="male">{t.genderMale}</option>
            <option value="female">{t.genderFemale}</option>
          </select>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text-muted" htmlFor="personality-filter">
            {t.filterPersonality}
          </label>
          <select
            id="personality-filter"
            value={personalityFilter}
            onChange={(e) => setPersonalityFilter((e.target as HTMLSelectElement).value)}
            class="rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          >
            <option value="all">{t.filterAll}</option>
            <option value="playful">{t.personalityPlayful}</option>
            <option value="calm">{t.personalityCalm}</option>
            <option value="shy">{t.personalityShy}</option>
            <option value="affectionate">{t.personalityAffectionate}</option>
            <option value="independent">{t.personalityIndependent}</option>
            <option value="social">{t.personalitySocial}</option>
            <option value="curious">{t.personalityCurious}</option>
            <option value="protective">{t.personalityProtective}</option>
          </select>
        </div>
      </div>

      {/* Result count */}
      <p class="mb-4 text-sm text-text-muted">
        {t.showing} {filtered.length} {t.catsLabel}
      </p>

      {/* Filtered cat grid */}
      {filtered.length === 0 ? (
        <p class="py-12 text-center text-text-muted">{t.noResults}</p>
      ) : (
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cat) => (
            <a
              key={cat.id}
              href={`${detailBase}${cat.slug}`}
              class="group block overflow-hidden rounded-xl bg-surface shadow-sm transition-shadow hover:shadow-md"
            >
              {cat.coverImage ? (
                <div class="aspect-[4/3] overflow-hidden">
                  <img
                    src={imageUrl(
                      cat.coverImage.key,
                      DEFAULT_WIDTHS[DEFAULT_WIDTHS.length - 1],
                      IMAGES_ORIGIN,
                    )}
                    srcset={imageSrcset(cat.coverImage.key, DEFAULT_WIDTHS, IMAGES_ORIGIN)}
                    sizes={DEFAULT_SIZES}
                    alt={cat.coverImage.alt || cat.name}
                    class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                    width={cat.coverImage.width}
                    height={cat.coverImage.height}
                  />
                </div>
              ) : (
                <div class="flex aspect-[4/3] items-center justify-center bg-primary/5">
                  <svg class="h-16 w-16 text-primary/20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
              )}
              <div class="p-4">
                <div class="mb-2 flex items-center justify-between gap-2">
                  <h3 class="font-display text-lg font-bold text-primary">
                    {cat.name}
                  </h3>
                  <span
                    class={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[cat.status] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {cat.status === 'available'
                      ? t.statusAvailable
                      : cat.status === 'adopted'
                        ? t.statusAdopted
                        : cat.status === 'treatment'
                          ? t.statusTreatment
                          : t.statusUnavailable}
                  </span>
                </div>
                {cat.shortDescription && (
                  <p class="line-clamp-2 text-sm text-text-muted">
                    {cat.shortDescription}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
