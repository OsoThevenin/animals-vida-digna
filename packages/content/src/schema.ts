import { sql } from 'drizzle-orm';
import {
  type AnySQLiteColumn,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import type {
  CatGender,
  CatGoodWith,
  CatHealthStatus,
  CatPersonality,
  CatSize,
  CatStatus,
} from './validate';

export const cats = sqliteTable(
  'cats',
  {
    id: text('id').primaryKey(),
    slugCa: text('slug_ca').notNull(),
    slugEs: text('slug_es').notNull(),
    nameCa: text('name_ca').notNull(),
    nameEs: text('name_es').notNull(),
    raceCa: text('race_ca').notNull().default(''),
    raceEs: text('race_es').notNull().default(''),
    status: text('status').$type<CatStatus>().notNull().default('available'),
    age: integer('age'),
    gender: text('gender').$type<CatGender>().notNull().default('male'),
    size: text('size').$type<CatSize>().notNull().default('medium'),
    personality: text('personality', { mode: 'json' })
      .$type<CatPersonality[]>()
      .notNull()
      .default(sql`'[]'`),
    goodWith: text('good_with', { mode: 'json' })
      .$type<CatGoodWith[]>()
      .notNull()
      .default(sql`'[]'`),
    healthStatus: text('health_status')
      .$type<CatHealthStatus>()
      .notNull()
      .default('healthy'),
    vaccinated: integer('vaccinated', { mode: 'boolean' })
      .notNull()
      .default(false),
    microchipped: integer('microchipped', { mode: 'boolean' })
      .notNull()
      .default(false),
    sterilized: integer('sterilized', { mode: 'boolean' })
      .notNull()
      .default(false),
    weight: real('weight'),
    rescueDate: text('rescue_date'),
    adoptionDate: text('adoption_date'),
    specialNeedsCa: text('special_needs_ca').notNull().default(''),
    specialNeedsEs: text('special_needs_es').notNull().default(''),
    observationsCa: text('observations_ca').notNull().default(''),
    observationsEs: text('observations_es').notNull().default(''),
    shortDescriptionCa: text('short_description_ca').notNull().default(''),
    shortDescriptionEs: text('short_description_es').notNull().default(''),
    descriptionCa: text('description_ca').notNull().default(''),
    descriptionEs: text('description_es').notNull().default(''),
    seoTitleCa: text('seo_title_ca').notNull().default(''),
    seoTitleEs: text('seo_title_es').notNull().default(''),
    seoDescriptionCa: text('seo_description_ca').notNull().default(''),
    seoDescriptionEs: text('seo_description_es').notNull().default(''),
    featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    published: integer('published', { mode: 'boolean' })
      .notNull()
      .default(true),
    coverImageId: text('cover_image_id').references(
      (): AnySQLiteColumn => catImages.id,
      { onDelete: 'set null' }
    ),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    updatedBy: text('updated_by').notNull().default(''),
  },
  (table) => [
    uniqueIndex('cats_slug_ca_idx').on(table.slugCa),
    uniqueIndex('cats_slug_es_idx').on(table.slugEs),
  ]
);

export const catImages = sqliteTable(
  'cat_images',
  {
    id: text('id').primaryKey(),
    catId: text('cat_id')
      .notNull()
      .references((): AnySQLiteColumn => cats.id, { onDelete: 'cascade' }),
    r2Key: text('r2_key').notNull(),
    altCa: text('alt_ca').notNull().default(''),
    altEs: text('alt_es').notNull().default(''),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    position: integer('position').notNull().default(0),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('cat_images_r2_key_idx').on(table.r2Key),
    index('cat_images_cat_id_idx').on(table.catId),
  ]
);
