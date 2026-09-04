import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { createAuth } from '../src/lib/auth';

/**
 * Live-D1 regression test for the defect confirmed by manual experiment
 * against `wrangler dev --local`: POSTing `/email-otp/send-verification-otp`
 * with a non-allowlisted email returns `200 {"success":true}` (correctly,
 * for enumeration resistance) but also writes a row to the `verification`
 * table, because better-auth's own endpoint calls `resolveOTP` (which
 * creates the row) before it ever asks `sendVerificationOTP` whether the
 * address is allowed. `auth-factory.test.ts` only proves `sendVerificationOTP`
 * itself never calls `fetch`; it calls that function directly and so never
 * exercises `resolveOTP` at all, which is why it passed while this defect
 * was present.
 *
 * This uses `getPlatformProxy` (from `wrangler`, already a devDependency)
 * to get a real, ephemeral local D1 binding — the same engine `wrangler dev`
 * uses — rather than a mock, so the assertion is about actual rows in an
 * actual `verification` table.
 */

const root = resolve(import.meta.dirname, '..');

function fakeEnv(db: D1Database): Env {
  return {
    DB: db,
    IMAGES_BUCKET: {} as unknown as R2Bucket,
    ASSETS: {} as unknown as Fetcher,
    BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret',
    BETTER_AUTH_URL: 'http://localhost:4322',
    RESEND_API_KEY: 're_test',
    AUTH_EMAIL_FROM: 'Animals Vida Digna <no-reply@animalsvidadigna.org>',
    ADMIN_ALLOWED_EMAILS: 'ana@example.com',
    AUTH_INSECURE_COOKIES: '1',
    AUTH_DEV_LOG_OTP: '1',
  } as unknown as Env;
}

async function applyMigrations(db: D1Database): Promise<void> {
  const migrationsDir = resolve(root, '../../packages/content/migrations');
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const sql = readFileSync(resolve(migrationsDir, file), 'utf-8');
    const statements = sql
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);
    for (const statement of statements) {
      await db.prepare(statement).run();
    }
  }
}

async function countVerificationRows(db: D1Database): Promise<number> {
  const result = await db
    .prepare('SELECT COUNT(*) as count FROM verification')
    .first<{ count: number }>();
  return result?.count ?? 0;
}

async function sendVerificationOtp(env: Env, email: string): Promise<Response> {
  const auth = createAuth(env);
  const request = new Request(
    'http://localhost:4322/api/auth/email-otp/send-verification-otp',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, type: 'sign-in' }),
    }
  );
  return auth.handler(request);
}

describe('POST /email-otp/send-verification-otp against local D1', () => {
  let dispose: () => Promise<void>;
  let db: D1Database;
  let env: Env;

  beforeEach(async () => {
    const proxy = await getPlatformProxy<{ DB: D1Database }>({
      configPath: resolve(root, 'wrangler.toml'),
      persist: false,
    });
    dispose = proxy.dispose;
    db = proxy.env.DB;
    await applyMigrations(db);
    env = fakeEnv(db);
  });

  afterEach(async () => {
    await dispose();
  });

  it('never writes a verification row for a non-allowlisted address, and still does for an allowlisted one', async () => {
    expect(await countVerificationRows(db)).toBe(0);

    const strangerResponse = await sendVerificationOtp(
      env,
      'stranger@example.com'
    );
    const strangerBody = await strangerResponse.clone().json();
    expect(await countVerificationRows(db)).toBe(0);

    const allowedResponse = await sendVerificationOtp(env, 'ana@example.com');
    const allowedBody = await allowedResponse.clone().json();
    expect(await countVerificationRows(db)).toBe(1);

    // Enumeration resistance: the two responses must be indistinguishable.
    expect(strangerResponse.status).toBe(allowedResponse.status);
    expect(strangerBody).toEqual(allowedBody);
    expect(strangerResponse.headers.get('content-type')).toBe(
      allowedResponse.headers.get('content-type')
    );
  });
});
