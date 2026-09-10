import { z } from 'zod';

export const CAT_STATUSES = [
  'available',
  'adopted',
  'treatment',
  'unavailable',
] as const;
export type CatStatus = (typeof CAT_STATUSES)[number];

export const CAT_GENDERS = ['male', 'female'] as const;
export type CatGender = (typeof CAT_GENDERS)[number];

export const CAT_SIZES = ['small', 'medium', 'large'] as const;
export type CatSize = (typeof CAT_SIZES)[number];

export const CAT_PERSONALITIES = [
  'playful',
  'calm',
  'shy',
  'affectionate',
  'independent',
  'social',
  'curious',
  'protective',
] as const;
export type CatPersonality = (typeof CAT_PERSONALITIES)[number];

export const CAT_GOOD_WITH = [
  'children',
  'other-cats',
  'dogs',
  'elderly',
] as const;
export type CatGoodWith = (typeof CAT_GOOD_WITH)[number];

export const CAT_HEALTH_STATUSES = [
  'healthy',
  'treatment',
  'special-needs',
] as const;
export type CatHealthStatus = (typeof CAT_HEALTH_STATUSES)[number];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Lowercase, ASCII, hyphen-separated slug shape: one or more groups of
 * `[a-z0-9]` joined by single hyphens, no leading/trailing/doubled hyphens.
 * `slugify()` below always produces a string matching this (or throws), so
 * this is also the contract the admin (Phase 5) and the seed script must
 * satisfy for a slug to produce a reachable `/cat/<slug>` URL.
 */
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_MESSAGE =
  'must be lowercase letters, numbers and single hyphens only (e.g. "lluna-blanca")';

function dedupe<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export const catInputSchema = z.object({
  slugCa: z.string().min(1, 'slugCa is required').regex(SLUG_RE, SLUG_MESSAGE),
  slugEs: z.string().min(1, 'slugEs is required').regex(SLUG_RE, SLUG_MESSAGE),
  nameCa: z.string().min(1, 'nameCa is required'),
  nameEs: z.string().min(1, 'nameEs is required'),
  raceCa: z.string().default(''),
  raceEs: z.string().default(''),
  status: z.enum(CAT_STATUSES).default('available'),
  age: z.number().int().min(0).nullable().default(null),
  gender: z.enum(CAT_GENDERS).default('male'),
  size: z.enum(CAT_SIZES).default('medium'),
  personality: z.array(z.enum(CAT_PERSONALITIES)).default([]).transform(dedupe),
  goodWith: z.array(z.enum(CAT_GOOD_WITH)).default([]).transform(dedupe),
  healthStatus: z.enum(CAT_HEALTH_STATUSES).default('healthy'),
  vaccinated: z.boolean().default(false),
  microchipped: z.boolean().default(false),
  sterilized: z.boolean().default(false),
  weight: z.number().min(0).nullable().default(null),
  rescueDate: z
    .string()
    .regex(DATE_RE, 'rescueDate must be YYYY-MM-DD')
    .nullable()
    .default(null),
  adoptionDate: z
    .string()
    .regex(DATE_RE, 'adoptionDate must be YYYY-MM-DD')
    .nullable()
    .default(null),
  specialNeedsCa: z.string().default(''),
  specialNeedsEs: z.string().default(''),
  observationsCa: z.string().default(''),
  observationsEs: z.string().default(''),
  shortDescriptionCa: z.string().default(''),
  shortDescriptionEs: z.string().default(''),
  descriptionCa: z.string().default(''),
  descriptionEs: z.string().default(''),
  seoTitleCa: z.string().default(''),
  seoTitleEs: z.string().default(''),
  seoDescriptionCa: z.string().default(''),
  seoDescriptionEs: z.string().default(''),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  published: z.boolean().default(true),
});

export type CatInput = z.infer<typeof catInputSchema>;

/**
 * Raised by `slugify()` when the input has no ASCII letters or digits to
 * build a slug from (e.g. only whitespace, or a script with no ASCII
 * transliteration such as CJK). Callers (the seed script, and Phase 5's
 * admin form) should catch this and surface `message` directly instead of
 * letting a blank string reach `catInputSchema` and fail as an opaque zod
 * regex error, or reach D1 and fail as a raw `D1_ERROR: UNIQUE constraint`.
 */
export class SlugifyError extends Error {
  readonly input: string;

  constructor(input: string) {
    super(
      `slugify: could not derive a slug from "${input}" — it has no letters or numbers to build a URL segment from`
    );
    this.name = 'SlugifyError';
    this.input = input;
  }
}

/**
 * Lowercase, ASCII, hyphen-separated slug. Strips diacritics. Throws
 * `SlugifyError` — rather than returning `''` — when nothing survives the
 * transliteration, so the caller gets a clear, typed error instead of an
 * opaque `catInputSchema` failure or a raw D1 unique-constraint error.
 *
 * Does not resolve collisions (e.g. "Blanca 2" and "Blanca-2" both produce
 * "blanca-2"): that is left to the D1 unique index plus Phase 5's admin UI,
 * which is expected to catch the resulting constraint violation and prompt
 * for a different slug.
 */
export function slugify(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug === '') throw new SlugifyError(value);
  return slug;
}
