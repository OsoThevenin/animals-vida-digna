CREATE TABLE `cat_images` (
	`id` text PRIMARY KEY NOT NULL,
	`cat_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`alt_ca` text DEFAULT '' NOT NULL,
	`alt_es` text DEFAULT '' NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`cat_id`) REFERENCES `cats`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cat_images_r2_key_idx` ON `cat_images` (`r2_key`);--> statement-breakpoint
CREATE INDEX `cat_images_cat_id_idx` ON `cat_images` (`cat_id`);--> statement-breakpoint
CREATE TABLE `cats` (
	`id` text PRIMARY KEY NOT NULL,
	`slug_ca` text NOT NULL,
	`slug_es` text NOT NULL,
	`name_ca` text NOT NULL,
	`name_es` text NOT NULL,
	`race_ca` text DEFAULT '' NOT NULL,
	`race_es` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`age` integer,
	`gender` text DEFAULT 'male' NOT NULL,
	`size` text DEFAULT 'medium' NOT NULL,
	`personality` text DEFAULT '[]' NOT NULL,
	`good_with` text DEFAULT '[]' NOT NULL,
	`health_status` text DEFAULT 'healthy' NOT NULL,
	`vaccinated` integer DEFAULT false NOT NULL,
	`microchipped` integer DEFAULT false NOT NULL,
	`sterilized` integer DEFAULT false NOT NULL,
	`weight` real,
	`rescue_date` text,
	`adoption_date` text,
	`special_needs_ca` text DEFAULT '' NOT NULL,
	`special_needs_es` text DEFAULT '' NOT NULL,
	`observations_ca` text DEFAULT '' NOT NULL,
	`observations_es` text DEFAULT '' NOT NULL,
	`short_description_ca` text DEFAULT '' NOT NULL,
	`short_description_es` text DEFAULT '' NOT NULL,
	`description_ca` text DEFAULT '' NOT NULL,
	`description_es` text DEFAULT '' NOT NULL,
	`seo_title_ca` text DEFAULT '' NOT NULL,
	`seo_title_es` text DEFAULT '' NOT NULL,
	`seo_description_ca` text DEFAULT '' NOT NULL,
	`seo_description_es` text DEFAULT '' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`published` integer DEFAULT true NOT NULL,
	`cover_image_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`cover_image_id`) REFERENCES `cat_images`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cats_slug_ca_idx` ON `cats` (`slug_ca`);--> statement-breakpoint
CREATE UNIQUE INDEX `cats_slug_es_idx` ON `cats` (`slug_es`);