import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { createAuth } from '../src/lib/auth';

/**
 * M2 (per-address OTP send throttle): better-auth 1.7.2's built-in
 * throttle on `/email-otp/send-verification-otp` (window: 60, max: 3 —
 * see tests/otp-send-ip-throttle.test.ts) is keyed by
 * `createRateLimitKey(ip, path)` — client IP and path only, never the
 * `email` in the request body (`resolveRateLimitConfig` in
 * `better-auth/dist/api/rate-limiter/index.mjs`). An attacker with many
 * IPs (or any botnet) can still drive an unbounded number of genuine OTP
 * emails at one known allowlisted volunteer, one throttle-window at a
 * time per IP. This test drives requests from *different* IPs at the
 * *same* address to prove the per-IP throttle alone cannot stop that,
 * then proves the new per-address counter added to `hooks.before` in
 * src/lib/auth.ts does — and that it never becomes an enumeration oracle.
 *
 * The limit under test — 5 sends per 5-minute address (see the comment
 * next to `EMAIL_SEND_THROTTLE_MAX` in src/lib/auth.ts for the
 * justification) — is asserted here as a literal so a change to that
 * constant fails this test loudly instead of silently.
 *
 * Uses the same live-local-D1 pattern as
 * tests/email-otp-path-allowlist.test.ts (`getPlatformProxy`) — the
 * counter this exercises is a real row in the real `rate_limit` table,
 * not a mock.
 */

const root = resolve(import.meta.dirname, '..');
const ADMIN_EMAIL = 'ana@example.com';
const OTHER_ADMIN_EMAIL = 'bea@example.com';
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
    ADMIN_ALLOWED_EMAILS: `${ADMIN_EMAIL},${OTHER_ADMIN_EMAIL}`,
    AUTH_INSECURE_COOKIES: '1',
    // Deliberately unset (unlike most other tests in this suite): the
    // AUTH_DEV_LOG_OTP escape hatch short-circuits before Resend, which
    // would mask whether a real send fired — these tests assert on
    // `fetch` call counts, so they need the real-Resend-path env.
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

/** Sends the OTP-send request from `ip`, a fresh IP per call in these
 * tests so better-auth's own per-IP throttle (3/60s) never triggers and
 * only the per-address counter under test can. */
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

describe('per-address OTP send throttle (real local D1)', () => {
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
    vi.restoreAllMocks();
    await dispose();
  });

  it('bounds sends to one address even when every request comes from a different IP', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"id":"test"}'));

    // ADDRESS_THROTTLE_MAX + 3 requests at the same allowlisted address,
    // each from its own IP — the per-IP throttle (max 3 per IP) never
    // engages, so without a per-address counter every one of these would
    // trigger a genuine send.
    const statuses: number[] = [];
    for (let i = 0; i < ADDRESS_THROTTLE_MAX + 3; i++) {
      const response = await sendOtpFrom(env, ADMIN_EMAIL, `198.51.100.${i}`);
      statuses.push(response.status);
    }

    // Every response must still look like a normal send (never an
    // oracle): 200 with the endpoint's own success shape, on every single
    // request, throttled or not.
    for (const status of statuses) {
      expect(status).toBe(200);
    }

    // But the underlying send must have been bounded to the limit, not
    // called once per request.
    expect(fetchSpy.mock.calls.length).toBe(ADDRESS_THROTTLE_MAX);
  });

  it('does not become an enumeration oracle: a throttled allowlisted address and a non-allowlisted address return byte-identical bodies', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"id":"test"}'));

    for (let i = 0; i < ADDRESS_THROTTLE_MAX; i++) {
      const response = await sendOtpFrom(env, ADMIN_EMAIL, `198.51.100.${i}`);
      expect(response.status).toBe(200);
    }
    expect(fetchSpy.mock.calls.length).toBe(ADDRESS_THROTTLE_MAX);

    // The next request for the same address is throttled — the send
    // itself must not fire again.
    const throttledResponse = await sendOtpFrom(
      env,
      ADMIN_EMAIL,
      '198.51.100.201'
    );
    expect(fetchSpy.mock.calls.length).toBe(ADDRESS_THROTTLE_MAX);
    const throttledBody = await throttledResponse.json();

    const nonAllowlistedResponse = await sendOtpFrom(
      env,
      'stranger@example.com',
      '203.0.113.99'
    );
    const nonAllowlistedBody = await nonAllowlistedResponse.json();

    expect(throttledResponse.status).toBe(nonAllowlistedResponse.status);
    expect(throttledBody).toEqual(nonAllowlistedBody);
    expect(throttledBody).toEqual({ success: true });
  });

  it('does not throttle a different address sharing no requests with the first', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"id":"test"}'));

    for (let i = 0; i < ADDRESS_THROTTLE_MAX + 3; i++) {
      await sendOtpFrom(env, ADMIN_EMAIL, `198.51.100.${i}`);
    }
    const callsAfterFirstAddress = fetchSpy.mock.calls.length;

    const response = await sendOtpFrom(
      env,
      OTHER_ADMIN_EMAIL,
      '198.51.100.201'
    );
    expect(response.status).toBe(200);
    expect(fetchSpy.mock.calls.length).toBe(callsAfterFirstAddress + 1);
  });
});
