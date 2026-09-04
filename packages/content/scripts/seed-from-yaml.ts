#!/usr/bin/env -S npx tsx
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { nanoid } from 'nanoid';
import { parse as parseYaml } from 'yaml';
import { catInputSchema, type CatInput } from '../src/validate';

const DEFAULT_CATS_DIR = resolve(
  import.meta.dirname,
  '../../../apps/web/src/content/cats'
);
const OUT_FILE = resolve(import.meta.dirname, '../seed.sql');

function sqlString(value: string | null): string {
  if (value === null) return 'NULL';
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlNumber(value: number | null): string {
  return value === null ? 'NULL' : String(value);
}

function sqlBool(value: boolean): string {
  return value ? '1' : '0';
}

function sqlJsonArray(value: string[]): string {
  return sqlString(JSON.stringify(value));
}

function readDescription(
  catsDir: string,
  slug: string,
  locale: 'ca' | 'es'
): string {
  const path = resolve(catsDir, slug, `description_${locale}.mdoc`);
  return existsSync(path) ? readFileSync(path, 'utf-8').trimEnd() : '';
}

interface RawSeo {
  title_ca?: string;
  title_es?: string;
  description_ca?: string;
  description_es?: string;
}

export function buildCatInsert(
  raw: Record<string, unknown>,
  slug: string,
  catsDir: string
): { id: string; sql: string } {
  const seo = (raw.seo as RawSeo | undefined) ?? {};

  const input: CatInput = catInputSchema.parse({
    slugCa: raw.slug_ca ?? slug,
    slugEs: raw.slug_es ?? slug,
    nameCa: raw.name_ca,
    nameEs: raw.name_es,
    raceCa: raw.race_ca ?? '',
    raceEs: raw.race_es ?? '',
    status: raw.status,
    age: (raw.age as number | null | undefined) ?? null,
    gender: raw.gender,
    size: raw.size,
    personality: raw.personality ?? [],
    goodWith: raw.goodWith ?? [],
    healthStatus: raw.healthStatus,
    vaccinated: Boolean(raw.vaccinated),
    microchipped: Boolean(raw.microchipped),
    sterilized: Boolean(raw.sterilized),
    weight: (raw.weight as number | null | undefined) ?? null,
    rescueDate: (raw.rescueDate as string | null | undefined) ?? null,
    adoptionDate: (raw.adoptionDate as string | null | undefined) ?? null,
    specialNeedsCa: raw.specialNeeds_ca ?? '',
    specialNeedsEs: raw.specialNeeds_es ?? '',
    observationsCa: raw.observations_ca ?? '',
    observationsEs: raw.observations_es ?? '',
    shortDescriptionCa: raw.shortDescription_ca ?? '',
    shortDescriptionEs: raw.shortDescription_es ?? '',
    descriptionCa: readDescription(catsDir, slug, 'ca'),
    descriptionEs: readDescription(catsDir, slug, 'es'),
    seoTitleCa: seo.title_ca ?? '',
    seoTitleEs: seo.title_es ?? '',
    seoDescriptionCa: seo.description_ca ?? '',
    seoDescriptionEs: seo.description_es ?? '',
    featured: Boolean(raw.featured),
    sortOrder: (raw.order as number | undefined) ?? 0,
    published: true,
  });

  const id = nanoid();
  const timestamp = new Date().toISOString();

  const columns = [
    'id',
    'slug_ca',
    'slug_es',
    'name_ca',
    'name_es',
    'race_ca',
    'race_es',
    'status',
    'age',
    'gender',
    'size',
    'personality',
    'good_with',
    'health_status',
    'vaccinated',
    'microchipped',
    'sterilized',
    'weight',
    'rescue_date',
    'adoption_date',
    'special_needs_ca',
    'special_needs_es',
    'observations_ca',
    'observations_es',
    'short_description_ca',
    'short_description_es',
    'description_ca',
    'description_es',
    'seo_title_ca',
    'seo_title_es',
    'seo_description_ca',
    'seo_description_es',
    'featured',
    'sort_order',
    'published',
    'created_at',
    'updated_at',
    'updated_by',
  ];

  const values = [
    sqlString(id),
    sqlString(input.slugCa),
    sqlString(input.slugEs),
    sqlString(input.nameCa),
    sqlString(input.nameEs),
    sqlString(input.raceCa),
    sqlString(input.raceEs),
    sqlString(input.status),
    sqlNumber(input.age),
    sqlString(input.gender),
    sqlString(input.size),
    sqlJsonArray(input.personality),
    sqlJsonArray(input.goodWith),
    sqlString(input.healthStatus),
    sqlBool(input.vaccinated),
    sqlBool(input.microchipped),
    sqlBool(input.sterilized),
    sqlNumber(input.weight),
    sqlString(input.rescueDate),
    sqlString(input.adoptionDate),
    sqlString(input.specialNeedsCa),
    sqlString(input.specialNeedsEs),
    sqlString(input.observationsCa),
    sqlString(input.observationsEs),
    sqlString(input.shortDescriptionCa),
    sqlString(input.shortDescriptionEs),
    sqlString(input.descriptionCa),
    sqlString(input.descriptionEs),
    sqlString(input.seoTitleCa),
    sqlString(input.seoTitleEs),
    sqlString(input.seoDescriptionCa),
    sqlString(input.seoDescriptionEs),
    sqlBool(input.featured),
    sqlNumber(input.sortOrder),
    sqlBool(input.published),
    sqlString(timestamp),
    sqlString(timestamp),
    sqlString('seed'),
  ];

  const sql = `INSERT INTO cats (${columns.join(', ')}) VALUES (${values.join(', ')});`;
  return { id, sql };
}

export function generateSeedSql(catsDir: string = DEFAULT_CATS_DIR): string {
  const yamlFiles = readdirSync(catsDir)
    .filter((file) => file.endsWith('.yaml'))
    .sort();

  const statements = yamlFiles.map((file) => {
    const slug = basename(file, '.yaml');
    const raw = parseYaml(
      readFileSync(resolve(catsDir, file), 'utf-8')
    ) as Record<string, unknown>;
    return buildCatInsert(raw, slug, catsDir).sql;
  });

  return statements.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sql = generateSeedSql();
  writeFileSync(OUT_FILE, `${sql}\n`);
  console.log(`Wrote ${OUT_FILE}`);
}
