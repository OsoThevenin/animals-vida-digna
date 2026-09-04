#!/usr/bin/env -S npx tsx
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { nanoid } from 'nanoid';
import { parse as parseYaml } from 'yaml';
import { type CatInput, catInputSchema } from '../src/validate';

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

interface RawImage {
  src?: string | null;
  alt_ca?: string;
  alt_es?: string;
}

/** Statements are joined with this marker — the same delimiter drizzle-kit
 * emits between migration statements — so tooling that applies the seed
 * against a real SQLite connection (tests/helpers/db.ts, and any future
 * test harness) can split on an unambiguous boundary instead of guessing
 * from statement content. It's a SQL comment, so `wrangler d1 execute
 * --file` (which understands the SQL grammar, not naive line-splitting)
 * ignores it and applies the statements normally. */
const STATEMENT_BREAKPOINT = '--> statement-breakpoint';

/**
 * Turns a Keystatic `coverImage`/`gallery` image reference into a
 * `cat_images` INSERT, or `null` if the image has no `src` (today's real
 * fixtures all have `src: null` — no photo has been uploaded through
 * Keystatic yet).
 *
 * `r2Key` is the local public path Keystatic recorded (e.g.
 * `/images/cats/garfield.jpg`), stripped of its leading slash — not a real
 * R2 key yet. Phase 3's image migration is what actually uploads these
 * files to R2 and rewrites `r2_key` to the `cats/<catId>/<imageId>.webp`
 * shape `image-url.ts` expects; until then, preserving the reference losslessly here (instead of silently dropping it) is what
 * matters, and it also lets the seed be reapplied without losing which
 * image is the cover.
 *
 * `width`/`height` are `0` placeholders: Keystatic's image field records
 * only a file path, never pixel dimensions, so there is no real value to
 * seed here. Phase 3 must backfill the true dimensions when it processes
 * each image (see `MAX_UPLOAD_EDGE` / the upload flow in image-url.ts's
 * contract). This is called out via `IMAGE_DIMENSIONS_TODO` below rather
 * than left implicit, so it can't be mistaken for real image data.
 */
const IMAGE_DIMENSIONS_TODO =
  '-- width/height are 0 placeholders: Keystatic records no pixel dimensions; Phase 3 image migration must backfill real values.';

function buildImageInsert(
  catId: string,
  image: RawImage,
  position: number
): { id: string; r2Key: string; sql: string } | null {
  if (!image.src) return null;

  const id = nanoid();
  const r2Key = image.src.replace(/^\/+/, '');
  const timestamp = new Date().toISOString();

  const columns = [
    'id',
    'cat_id',
    'r2_key',
    'alt_ca',
    'alt_es',
    'width',
    'height',
    'position',
    'created_at',
  ];
  const values = [
    sqlString(id),
    sqlString(catId),
    sqlString(r2Key),
    sqlString(image.alt_ca ?? ''),
    sqlString(image.alt_es ?? ''),
    sqlNumber(0),
    sqlNumber(0),
    sqlNumber(position),
    sqlString(timestamp),
  ];

  const sql = [
    IMAGE_DIMENSIONS_TODO,
    `INSERT OR IGNORE INTO cat_images (${columns.join(', ')}) VALUES (${values.join(', ')});`,
  ].join('\n');

  return { id, r2Key, sql };
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

  // INSERT OR IGNORE (not a bare INSERT) makes reapplying seed.sql safe:
  // slug_ca is unique-indexed, so a rerun's fresh nanoid() would otherwise
  // abort on the second application — a real risk since
  // `wrangler d1 execute --file` runs statements without a transaction
  // wrapper, so a partial application on the very first rerun attempt
  // could leave the database in a mixed state. Cats already present (by
  // slug_ca) are left untouched; new cats are inserted.
  const catSql = `INSERT OR IGNORE INTO cats (${columns.join(', ')}) VALUES (${values.join(', ')});`;

  const coverImage = raw.coverImage as RawImage | undefined;
  const gallery = (raw.gallery as RawImage[] | undefined) ?? [];

  // Cover image goes first (position 0) so it also sorts first in the
  // gallery cat.ts/localize.ts derive from cat_images, matching today's
  // "cover shown first, then gallery" behaviour.
  const orderedImages = coverImage ? [coverImage, ...gallery] : gallery;
  const imageInserts = orderedImages
    .map((image, index) => buildImageInsert(id, image, index))
    .filter((built): built is NonNullable<typeof built> => built !== null);

  const coverInsert = coverImage?.src ? imageInserts[0] : undefined;
  // Keyed by slug_ca/r2_key (stable, natural keys), not the ids generated
  // on *this* run: on a rerun the cats/cat_images INSERTs above are
  // IGNOREd and the previously-persisted rows (with their original ids)
  // are what's actually in the table, so an UPDATE keyed on a freshly
  // generated id would silently match nothing.
  const coverUpdateSql = coverInsert
    ? `UPDATE cats SET cover_image_id = (SELECT id FROM cat_images WHERE r2_key = ${sqlString(coverInsert.r2Key)}) WHERE slug_ca = ${sqlString(input.slugCa)};`
    : undefined;

  const sql = [
    catSql,
    ...imageInserts.map((built) => built.sql),
    coverUpdateSql,
  ]
    .filter((statement): statement is string => Boolean(statement))
    .join(`\n${STATEMENT_BREAKPOINT}\n`);

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

  return statements.join(`\n${STATEMENT_BREAKPOINT}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sql = generateSeedSql();
  writeFileSync(OUT_FILE, `${sql}\n`);
  console.log(`Wrote ${OUT_FILE}`);
}
