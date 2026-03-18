/**
 * sync-images.ts
 *
 * Uploads local public/images/ files to Cloudflare R2 bucket using wrangler CLI.
 * Usage: npx tsx scripts/sync-images.ts [--dry-run]
 */

import { execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const BUCKET_NAME = 'animals-vida-digna-images';
const SOURCE_DIR = join(process.cwd(), 'public', 'images');
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
};

const IMAGE_EXTENSIONS = new Set(Object.keys(MIME_TYPES));

const isDryRun = process.argv.includes('--dry-run');

/** Recursively collect all image files under a directory */
function collectImages(dir: string): string[] {
  const files: string[] = [];
  let entries: ReturnType<typeof readdirSync>;

  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...collectImages(fullPath));
    } else if (IMAGE_EXTENSIONS.has(extname(entry).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

function getContentType(filePath: string): string {
  return MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function main() {
  console.log(`Scanning ${SOURCE_DIR} for images...`);

  const files = collectImages(SOURCE_DIR);

  if (files.length === 0) {
    console.log('No images found in public/images/');
    return;
  }

  console.log(`Found ${files.length} image(s)\n`);

  const failures: string[] = [];
  let uploaded = 0;

  for (const filePath of files) {
    // R2 key: strip "public/" prefix -> "images/cats/foo.jpg"
    const r2Key = relative(join(process.cwd(), 'public'), filePath);
    const contentType = getContentType(filePath);

    if (isDryRun) {
      console.log(`[dry-run] Would upload ${r2Key} (${contentType})`);
      uploaded++;
      continue;
    }

    process.stdout.write(`Uploading ${r2Key}... `);

    try {
      execSync(
        `npx wrangler r2 object put "${BUCKET_NAME}/${r2Key}" ` +
        `--file "${filePath}" ` +
        `--content-type "${contentType}" ` +
        `--cache-control "${CACHE_CONTROL}"`,
        { stdio: ['pipe', 'pipe', 'pipe'] },
      );
      console.log('done');
      uploaded++;
    } catch (err) {
      console.log('FAILED');
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  Error: ${message}`);
      failures.push(r2Key);
    }
  }

  console.log(`\nSynced ${uploaded} image(s) to R2`);

  if (failures.length > 0) {
    console.error(`\n${failures.length} upload(s) failed:`);
    for (const f of failures) {
      console.error(`  - ${f}`);
    }
    process.exit(1);
  }
}

main();
