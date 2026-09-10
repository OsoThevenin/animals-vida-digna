/**
 * sweep-orphan-images.ts
 *
 * Finds R2 objects under cats/ with no matching cat_images.r2_key row in
 * D1, and (with --delete) removes them. Dry run by default.
 *
 * Listing uses the R2 S3-compatible API (ListObjectsV2) signed with
 * aws4fetch, because `wrangler r2 object` has no `list` subcommand
 * (confirmed against wrangler 4.75.0 --help; only get/put/delete exist).
 * Deletion uses `wrangler r2 object delete`, which does exist.
 *
 * `parseObjectKeys` (the XML scrape at the heart of the R2 listing step)
 * lives in `../src/orphans.ts`, not here, so it can be unit-tested without
 * executing this script's `main()`. See that file's docstring for a
 * documented limitation around XML entity escaping in keys.
 *
 * Required env vars:
 *   CLOUDFLARE_ACCOUNT_ID   Cloudflare account ID
 *   R2_ACCESS_KEY_ID        R2 API token Access Key ID (S3 credentials,
 *                            NOT a general Cloudflare API token — see
 *                            https://developers.cloudflare.com/r2/api/tokens/)
 *   R2_SECRET_ACCESS_KEY    R2 API token Secret Access Key
 *
 * Usage:
 *   npx tsx scripts/sweep-orphan-images.ts             # dry run
 *   npx tsx scripts/sweep-orphan-images.ts --delete     # delete orphans
 */

import { execSync } from 'node:child_process';
import { AwsClient } from 'aws4fetch';
import { findOrphans, parseObjectKeys } from '../src/orphans';

const BUCKET_NAME = 'animals-vida-digna-images';
const D1_DATABASE = 'avd-content';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Lists every object under the `cats/` prefix, following pagination. */
async function listCatImageKeysInR2(): Promise<string[]> {
  const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
  const client = new AwsClient({
    accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
  });
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const url = new URL(`${endpoint}/${BUCKET_NAME}`);
    url.searchParams.set('list-type', '2');
    url.searchParams.set('prefix', 'cats/');
    if (continuationToken) {
      url.searchParams.set('continuation-token', continuationToken);
    }

    const response = await client.fetch(url);
    if (!response.ok) {
      throw new Error(
        `R2 list failed: ${response.status} ${await response.text()}`
      );
    }

    const xml = await response.text();
    keys.push(...parseObjectKeys(xml));

    const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
    const tokenMatch = xml.match(/<NextContinuationToken>([^<]+)</);
    continuationToken = truncated ? tokenMatch?.[1] : undefined;
  } while (continuationToken);

  return keys;
}

/** Reads every `cat_images.r2_key` from D1 via `wrangler d1 execute --json`. */
function listCatImageKeysInD1(): string[] {
  const output = execSync(
    `npx wrangler d1 execute ${D1_DATABASE} --remote --json ` +
      `--command "select r2_key from cat_images"`,
    { encoding: 'utf-8' }
  );
  const parsed = JSON.parse(output) as Array<{
    results: Array<{ r2_key: string }>;
  }>;
  return parsed[0]?.results.map((row) => row.r2_key) ?? [];
}

function deleteFromR2(key: string): void {
  execSync(`npx wrangler r2 object delete "${BUCKET_NAME}/${key}"`, {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

async function main() {
  const shouldDelete = process.argv.includes('--delete');

  console.log('Listing R2 objects under cats/...');
  const r2Keys = await listCatImageKeysInR2();
  console.log(`Found ${r2Keys.length} object(s) in R2.`);

  console.log('Listing cat_images.r2_key from D1...');
  const dbKeys = listCatImageKeysInD1();
  console.log(`Found ${dbKeys.length} row(s) in D1.`);

  const orphans = findOrphans(r2Keys, dbKeys);

  if (orphans.length === 0) {
    console.log('No orphan images found.');
    return;
  }

  console.log(`\n${orphans.length} orphan image(s):`);
  for (const key of orphans) {
    console.log(`  - ${key}`);
  }

  if (!shouldDelete) {
    console.log(
      '\nDry run — nothing deleted. Re-run with --delete to remove them.'
    );
    return;
  }

  console.log('\nDeleting...');
  for (const key of orphans) {
    process.stdout.write(`  Deleting ${key}... `);
    try {
      deleteFromR2(key);
      console.log('done');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`FAILED: ${message}`);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
