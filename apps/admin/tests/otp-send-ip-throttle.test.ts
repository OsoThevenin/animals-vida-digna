import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { createAuth } from '../src/lib/auth';

/**
 * Regression guard for the per-IP throttle on
 * `/email-otp/send-verification-otp`.
 *
 * UPDATED in fix round 1: the window is no longer better-auth's *default*
 * 60s (`getDefaultSpecialRules()` in
 * `better-auth/dist/api/rate-limiter/index.mjs`). `src/lib/auth.ts`
 * registers an explicit `rateLimit.customRules` entry for this exact
 * path, as a side effect of fixing an unrelated bug: better-auth's own
 * row-pruning (`deleteExpiredRows`) has no key filter and was deleting
 * this app's *address*-keyed throttle counter (a different,
 * new-in-this-phase protection — see
 * tests/otp-send-address-throttle-pruning.test.ts) out from under it
 * after just over 60s, because nothing registered a wider window with
 * `getConfiguredRateLimitWindows`. Registering the address counter's
 * real 300s window via an object-form `customRules` entry fixes that,
 * but `customRules` entries are keyed by path only in better-auth
 * 1.7.2 — there is no way to influence pruning without also replacing
 * the rule for this path, so the per-IP rule became "N per 300s"
 * instead of "3 per 60s" as an unavoidable side effect.
 *
 * UPDATED AGAIN in fix round 2 (whole-branch review Important-4): `max`
 * went from 3 to 15. 3-per-60s and 15-per-300s are the same steady-state
 * rate, so a single hostile IP gains nothing, but 3-per-300s (fix round
 * 1's value) meant a handful of volunteers sharing one shelter-office IP
 * could lock the whole office out of sign-in for up to 5 minutes; 15
 * gives that shared IP realistic headroom. See the `customRules` comment
 * in `src/lib/auth.ts` for the full rationale, including why this does
 * not weaken protection against a targeted attacker (the independent
 * per-address throttle caps that regardless of the per-IP max).
 *
 * This test's own assertions did not need to change in kind: it fires
 * `max + 1` requests back-to-back with no simulated time passing, so
 * whatever `max` is configured to is the only thing under test here
 * regardless of `window`. Only the request count changed, from 4 to 16.
 *
 * This is NOT a mock of the rate limiter: it drives `createAuth` against a
 * real local D1 via `getPlatformProxy` (the same pattern as
 * tests/email-otp-path-allowlist.test.ts), since `rateLimit.storage` is
 * `'database'` and the counter lives in the real `rate_limit` table.
 *
 * The 4th request in the window must be rejected with better-auth's own
 * rate-limit response — HTTP 429, `X-Retry-After` header, and the fixed
 * body `{"message":"Too many requests. Please try again later."}` — which
 * is a different shape and status than anything this app's own code
 * returns from this endpoint (always 200), so a regression that make the
 * endpoint merely error out some other way (e.g. a 500) cannot masquerade
 * as this test passing.
 */

const root = resolve(import.meta.dirname, '..');
const ADMIN_EMAIL = 'ana@example.com';
const CLIENT_IP = '203.0.113.7';

function fakeEnv(db: D1Database): Env {
  return {
    DB: db,
    IMAGES_BUCKET: {} as unknown as R2Bucket,
    ASSETS: {} as unknown as Fetcher,
    BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret',
    BETTER_AUTH_URL: 'http://localhost:4322',
    RESEND_API_KEY: 're_test',
    AUTH_EMAIL_FROM: 'Animals Vida Digna <no-reply@animalsvidadigna.org>',
    ADMIN_ALLOWED_EMAILS: ADMIN_EMAIL,
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

/** Sends the OTP-send request from a single fixed client IP, mirroring
 * what src/pages/api/auth/[...all].ts's `buildRequestWithTrustedIp` does
 * in production by setting `cf-connecting-ip` directly (the only header
 * `advanced.ipAddress.ipAddressHeaders` trusts). */
async function sendOtpFrom(env: Env, email: string): Promise<Response> {
  const auth = createAuth(env);
  return auth.handler(
    new Request(
      'http://localhost:4322/api/auth/email-otp/send-verification-otp',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'cf-connecting-ip': CLIENT_IP,
        },
        body: JSON.stringify({ email, type: 'sign-in' }),
      }
    )
  );
}

describe('better-auth built-in per-IP throttle on send-verification-otp (real local D1)', () => {
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

  it('allows 15 requests from one IP within the window, rejects the 16th with 429', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 15; i++) {
      const response = await sendOtpFrom(env, ADMIN_EMAIL);
      statuses.push(response.status);
    }
    expect(statuses).toEqual(Array(15).fill(200));

    const sixteenth = await sendOtpFrom(env, ADMIN_EMAIL);
    expect(sixteenth.status).toBe(429);
    expect(sixteenth.headers.get('x-retry-after')).not.toBeNull();
    const body = await sixteenth.json();
    expect(body).toEqual({
      message: 'Too many requests. Please try again later.',
    });
  });
});
