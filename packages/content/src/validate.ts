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

function dedupe<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export const catInputSchema = z.object({
  slugCa: z.string().min(1, 'slugCa is required'),
  slugEs: z.string().min(1, 'slugEs is required'),
  nameCa: z.string().min(1, 'nameCa is required'),
  nameEs: z.string().min(1, 'nameEs is required'),
  raceCa: z.string().default(''),
  raceEs: z.string().default(''),
  status: z.enum(CAT_STATUSES).default('available'),
  age: z.number().int().min(0).nullable().default(null),
  gender: z.enum(CAT_GENDERS).default('male'),
  size: z.enum(CAT_SIZES).default('medium'),
  personality: z
    .array(z.enum(CAT_PERSONALITIES))
    .default([])
    .transform(dedupe),
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

/** Lowercase, ASCII, hyphen-separated slug. Strips diacritics. */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
