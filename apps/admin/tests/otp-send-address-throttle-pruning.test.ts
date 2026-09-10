import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { createAuth } from '../src/lib/auth';

/**
 * Fix-round-1 regression test (code review finding, Important): the
 * per-address throttle added for M2 stores its counter in better-auth's
 * own `rate_limit` table, which better-auth prunes itself —
 * `deleteExpiredRows` in `createDatabaseStorageWrapper`
 * (better-auth/dist/api/rate-limiter/index.mjs, ~line 171) runs
 * `deleteMany({ model: 'rateLimit', where: [{ field: 'lastRequest',
 * operator: 'lt', value: now - longestObservedWindow * 1000 }] })` — a
 * DELETE with **no key filter**, so it sweeps every row in the table,
 * including the address-keyed rows this app writes, not just
 * better-auth's own IP-keyed ones.
 *
 * `longestObservedWindow` (`getConfiguredRateLimitWindows`, same file,
 * ~line 184) is the max of `ctx.rateLimit.window`, the two built-in
 * special-rule windows (10, 60), any plugin windows, and any *object-form*
 * `customRules` window. Before this fix, nothing registered a 300s
 * window anywhere in that list, so `longestObservedWindow` resolved to
 * 60 — meaning any row (including this app's address counter, whose
 * *logical* window is 300s) got deleted by better-auth's own pruning
 * after just over 60s of inactivity, long before the address throttle's
 * own 300s window should have reset it. An attacker pacing requests
 * ~65-70s apart could ride this to bypass the per-address cap entirely.
 *
 * This test proves the interaction with a real local D1 (no mocks of the
 * rate limiter): it exhausts the per-address limit from 6 distinct IPs
 * (so the per-IP throttle never interferes), advances virtual time past
 * the *default* 60s window (well short of the address throttle's stated
 * 300s), and issues one more request from an IP whose own bucket is old
 * enough to trigger better-auth's prune-on-reset path. Before the fix,
 * that 7th request is wrongly allowed through (the address's row got
 * swept). After the fix (registering a 300s `customRules` window for
 * this path, which raises `longestObservedWindow` to 300), it is
 * correctly still throttled.
 */

const root = resolve(import.meta.dirname, '..');
const ADMIN_EMAIL = 'ana@example.com';
const ADDRESS_THROTTLE_MAX = 5;

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
    // Deliberately unset — see otp-send-address-throttle.test.ts for why
    // these tests need the real-Resend `fetch` path rather than the
    // AUTH_DEV_LOG_OTP short-circuit.
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

async function sendOtpFrom(
  env: Env,
  email: string,
  ip: string
): Promise<Response> {
  const auth = createAuth(env);
  return auth.handler(
    new Request(
      'http://localhost:4322/api/auth/email-otp/send-verification-otp',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'cf-connecting-ip': ip,
        },
        body: JSON.stringify({ email, type: 'sign-in' }),
      }
    )
  );
}

describe('per-address OTP send throttle survives better-auth row pruning (real local D1)', () => {
  let dispose: () => Promise<void>;
  let db: D1Database;
  let env: Env;
  let now: number;

  beforeEach(async () => {
    const proxy = await getPlatformProxy<{ DB: D1Database }>({
      configPath: resolve(root, 'wrangler.toml'),
      persist: false,
    });
    dispose = proxy.dispose;
    db = proxy.env.DB;
    await applyMigrations(db);
    env = fakeEnv(db);
    now = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await dispose();
  });

  it('does not let a >60s, <300s gap reset the address counter via better-auth pruning a row it also owns', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"id":"test"}'));

    // Exhaust the address limit from 5 distinct IPs, 1 second apart, so
    // the per-IP throttle (which allows several per IP) never engages.
    // IP #1's bucket (created at t=0) is the one whose own reset we will
    // trigger later.
    for (let i = 0; i < ADDRESS_THROTTLE_MAX; i++) {
      now = i * 1000;
      const response = await sendOtpFrom(env, ADMIN_EMAIL, `198.51.100.${i}`);
      expect(response.status).toBe(200);
    }
    expect(fetchSpy.mock.calls.length).toBe(ADDRESS_THROTTLE_MAX);

    // Confirm the address is throttled right after exhaustion — sanity
    // check that the base throttle still works before we touch pruning.
    now = ADDRESS_THROTTLE_MAX * 1000;
    const throttledSoonAfter = await sendOtpFrom(
      env,
      ADMIN_EMAIL,
      '198.51.100.90'
    );
    expect(throttledSoonAfter.status).toBe(200);
    expect(fetchSpy.mock.calls.length).toBe(ADDRESS_THROTTLE_MAX);

    // Advance to 65s after IP #1's very first request (198.51.100.0, made
    // at t=0). That is comfortably past the *default* 60s special-rule
    // window better-auth ships for this path, but nowhere near the
    // address throttle's stated 300s window. Re-sending from IP #1 makes
    // better-auth reset IP #1's own bucket, which (pre-fix) triggers
    // deleteExpiredRows with a 60s cutoff and sweeps the address row too.
    now = 65_000;
    const afterSixtyFiveSeconds = await sendOtpFrom(
      env,
      ADMIN_EMAIL,
      '198.51.100.0'
    );
    expect(afterSixtyFiveSeconds.status).toBe(200);

    // The address is still nominally inside its 300s window (only 65s -
    // 4s = well under 300s has elapsed since the last allowed send at
    // t=4000), so this request must still be throttled — no new fetch
    // call — regardless of what better-auth's own per-IP/path bucket for
    // 198.51.100.0 decided.
    expect(fetchSpy.mock.calls.length).toBe(ADDRESS_THROTTLE_MAX);
  });
});
