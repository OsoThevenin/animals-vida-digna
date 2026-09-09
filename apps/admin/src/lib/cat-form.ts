import type { CatWithImages } from '@avd/content/cats';
import { slugify } from '@avd/content/validate';

export interface CatFormState {
  slugCa: string;
  slugEs: string;
  nameCa: string;
  nameEs: string;
  raceCa: string;
  raceEs: string;
  status: string;
  age: string;
  gender: string;
  size: string;
  personality: string[];
  goodWith: string[];
  healthStatus: string;
  vaccinated: boolean;
  microchipped: boolean;
  sterilized: boolean;
  weight: string;
  rescueDate: string;
  adoptionDate: string;
  specialNeedsCa: string;
  specialNeedsEs: string;
  observationsCa: string;
  observationsEs: string;
  shortDescriptionCa: string;
  shortDescriptionEs: string;
  descriptionCa: string;
  descriptionEs: string;
  seoTitleCa: string;
  seoTitleEs: string;
  seoDescriptionCa: string;
  seoDescriptionEs: string;
  featured: boolean;
  sortOrder: string;
  published: boolean;
  /** Client-only: true once the volunteer has hand-edited a slug field. */
  slugsEditedManually: boolean;
}

export function emptyCatInput(): CatFormState {
  return {
    slugCa: '',
    slugEs: '',
    nameCa: '',
    nameEs: '',
    raceCa: '',
    raceEs: '',
    status: 'available',
    age: '',
    gender: 'male',
    size: 'medium',
    personality: [],
    goodWith: [],
    healthStatus: 'healthy',
    vaccinated: false,
    microchipped: false,
    sterilized: false,
    weight: '',
    rescueDate: '',
    adoptionDate: '',
    specialNeedsCa: '',
    specialNeedsEs: '',
    observationsCa: '',
    observationsEs: '',
    shortDescriptionCa: '',
    shortDescriptionEs: '',
    descriptionCa: '',
    descriptionEs: '',
    seoTitleCa: '',
    seoTitleEs: '',
    seoDescriptionCa: '',
    seoDescriptionEs: '',
    featured: false,
    sortOrder: '0',
    published: true,
    slugsEditedManually: false,
  };
}

function numberToString(value: number | null): string {
  return value === null || value === undefined ? '' : String(value);
}

export function catToInput(cat: CatWithImages): CatFormState {
  return {
    slugCa: cat.slugCa,
    slugEs: cat.slugEs,
    nameCa: cat.nameCa,
    nameEs: cat.nameEs,
    raceCa: cat.raceCa,
    raceEs: cat.raceEs,
    status: cat.status,
    age: numberToString(cat.age),
    gender: cat.gender,
    size: cat.size,
    personality: [...cat.personality],
    goodWith: [...cat.goodWith],
    healthStatus: cat.healthStatus,
    vaccinated: cat.vaccinated,
    microchipped: cat.microchipped,
    sterilized: cat.sterilized,
    weight: numberToString(cat.weight),
    rescueDate: cat.rescueDate ?? '',
    adoptionDate: cat.adoptionDate ?? '',
    specialNeedsCa: cat.specialNeedsCa,
    specialNeedsEs: cat.specialNeedsEs,
    observationsCa: cat.observationsCa,
    observationsEs: cat.observationsEs,
    shortDescriptionCa: cat.shortDescriptionCa,
    shortDescriptionEs: cat.shortDescriptionEs,
    descriptionCa: cat.descriptionCa,
    descriptionEs: cat.descriptionEs,
    seoTitleCa: cat.seoTitleCa,
    seoTitleEs: cat.seoTitleEs,
    seoDescriptionCa: cat.seoDescriptionCa,
    seoDescriptionEs: cat.seoDescriptionEs,
    featured: cat.featured,
    sortOrder: numberToString(cat.sortOrder),
    published: cat.published,
    // An existing cat already has slugs on record; do not silently
    // overwrite them if the volunteer edits the name.
    slugsEditedManually: true,
  };
}

function emptyStringToNull(value: string): string | null {
  return value.trim() === '' ? null : value;
}

function numericStringToNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

export function formStateToInput(state: CatFormState): unknown {
  const { slugsEditedManually, ...rest } = state;
  return {
    ...rest,
    age: numericStringToNumberOrNull(state.age),
    weight: numericStringToNumberOrNull(state.weight),
    sortOrder: numericStringToNumberOrNull(state.sortOrder) ?? 0,
    rescueDate: emptyStringToNull(state.rescueDate),
    adoptionDate: emptyStringToNull(state.adoptionDate),
  };
}

export function deriveSlugs(
  nameCa: string,
  nameEs: string,
  current: { slugCa: string; slugEs: string; slugsEditedManually: boolean }
): { slugCa: string; slugEs: string } {
  if (current.slugsEditedManually) {
    return { slugCa: current.slugCa, slugEs: current.slugEs };
  }
  return { slugCa: slugify(nameCa), slugEs: slugify(nameEs) };
}

/**
 * Maps an Astro Action's isInputError().fields to a flat
 * { fieldName: message } object cat-form.tsx can index into. In edit mode
 * the action's input is `{ id, data: catInputSchema }`, so Zod reports
 * field paths as `data.nameCa`; this strips that prefix so the same
 * <Field error={fieldErrors.nameCa}> lookup works in both create and edit
 * mode. Only the first message per field is kept (Field only renders one).
 */
export function inputErrorsToFieldErrors(
  fields: Record<string, string[] | undefined>,
  mode: 'create' | 'edit'
): Record<string, string> {
  const prefix = mode === 'edit' ? 'data.' : '';
  const errors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(fields)) {
    if (!messages || messages.length === 0) continue;
    const key =
      prefix && field.startsWith(prefix) ? field.slice(prefix.length) : field;
    errors[key] = messages[0];
  }
  return errors;
}
