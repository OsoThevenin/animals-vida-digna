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
 * Every wrangler subcommand this script shells out to (D1 and R2 alike)
 * passes `--remote` EXPLICITLY. This is deliberate, not decorative:
 * `wrangler r2 object delete` defaults to `--local` when neither flag is
 * given (verified against wrangler 4.75.0's bundled `cli.js`:
 * `isLocal(args, defaultValue = true)`), which would silently delete from
 * the Miniflare store under `.wrangler/state` instead of production R2 —
 * that directory already exists on any machine that has run this
 * package's test suite, so the call would not even error. If you add a
 * new wrangler call to this file, it MUST include `--remote` or it will
 * quietly do nothing to production.
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

import { execFileSync, execSync } from 'node:child_process';
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

/**
 * Builds the argv (not a shell string) for the `wrangler r2 object delete`
 * call that removes one orphan from PRODUCTION R2.
 *
 * `--remote` is required: `wrangler r2 object delete` defaults to
 * `--local` when neither `--local` nor `--remote` is passed (verified
 * against wrangler 4.75.0's bundled `cli.js`), which would delete from
 * the local Miniflare store instead of production and print success while
 * doing nothing. See `tests/sweep-orphan-images.test.ts` for the
 * regression guard on this exact defect.
 *
 * Exported (and returning argv, not an interpolated string) so it is
 * testable without shelling out, and so the key — which comes from R2
 * listing output, not a fixed literal — is never interpolated into a
 * shell command string. `isCatImageKey`'s pattern permits characters like
 * `"`, `$`, and backticks that would be meaningful to a shell; passing
 * argv directly to `execFileSync` (no shell) removes that injection class
 * entirely rather than relying on quoting.
 */
export function buildDeleteArgs(key: string): string[] {
  return [
    'wrangler',
    'r2',
    'object',
    'delete',
    `${BUCKET_NAME}/${key}`,
    '--remote',
  ];
}

function deleteFromR2(key: string): void {
  execFileSync('npx', buildDeleteArgs(key), {
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

// Only run when executed directly (`npx tsx scripts/sweep-orphan-images.ts`),
// not when imported — `buildDeleteArgs` is imported by
// `tests/sweep-orphan-images.test.ts` to test command construction without
// touching any real R2/D1 state, and importing this module must never have
// the side effect of shelling out to wrangler.
const isMainModule =
  process.argv[1] !== undefined &&
  import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
