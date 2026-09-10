import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { createAuth } from '../src/lib/auth';

/**
 * Regression test for H2: the emailOTP plugin registers nine public
 * routes, but the `hooks.before` gate in src/lib/auth.ts used to match
 * only one of them (/email-otp/send-verification-otp). Two of the
 * others — /email-otp/request-password-reset and the deprecated
 * /forget-password/email-otp — call `resolveOTP` (which writes a row to
 * the `verification` table) *before* checking whether the user exists,
 * and if the user does exist, hand that row to `sendVerificationOTP`,
 * which used to ignore the `type` argument and email a genuine,
 * correctly-branded access code to anyone with a `user` row. An attacker
 * who knows an admin's address (the login placeholder advertises the
 * pattern) could script either route to flood that admin's inbox and
 * burn the Resend quota.
 *
 * The fix inverts the gate to a path allowlist (block every
 * /email-otp/* and /forget-password/* route except
 * send-verification-otp) and makes sendVerificationOTP itself reject any
 * `type !== 'sign-in'`. This uses the same live-local-D1 pattern as
 * tests/verification-row-allowlist.test.ts so the assertions are about
 * real rows and real fetch calls, not mocked plumbing.
 */

const root = resolve(import.meta.dirname, '..');
const ADMIN_EMAIL = 'ana@example.com';

function fakeEnv(db: D1Database, options?: { devLogOtp?: boolean }): Env {
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
    AUTH_DEV_LOG_OTP: options?.devLogOtp === false ? undefined : '1',
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

async function countUserRows(db: D1Database): Promise<number> {
  const result = await db
    .prepare('SELECT COUNT(*) as count FROM user')
    .first<{ count: number }>();
  return result?.count ?? 0;
}

/** Signs `email` in end to end via the real HTTP flow (send code, redeem
 * it), which is the app's only supported way to create a `user` row. */
async function createUserBySigningIn(env: Env, email: string): Promise<void> {
  const auth = createAuth(env);
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  await auth.handler(
    new Request(
      'http://localhost:4322/api/auth/email-otp/send-verification-otp',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, type: 'sign-in' }),
      }
    )
  );
  const logLine = logSpy.mock.calls
    .map((call) => call.join(' '))
    .find((line) => line.startsWith(`[auth] OTP for ${email}:`));
  logSpy.mockRestore();
  if (!logLine) {
    throw new Error(`AUTH_DEV_LOG_OTP did not log an OTP for ${email}`);
  }
  const otp = logLine.split(':').pop()?.trim() ?? '';

  const signInResponse = await auth.api.signInEmailOTP({
    body: { email, otp },
  });
  if (!signInResponse) {
    throw new Error('sign-in failed to create a user');
  }
}

async function postAuthPath(
  env: Env,
  path: string,
  body: Record<string, unknown>
): Promise<Response> {
  const auth = createAuth(env);
  return auth.handler(
    new Request(`http://localhost:4322/api/auth${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

describe('email-otp / forget-password path allowlist (real local D1)', () => {
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
    await createUserBySigningIn(env, ADMIN_EMAIL);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await dispose();
  });

  it.each([
    ['/email-otp/request-password-reset', { email: ADMIN_EMAIL }],
    ['/forget-password/email-otp', { email: ADMIN_EMAIL }],
  ])('blocks %s outright: no verification row written, no email sent', async (path, body) => {
    const before = await countVerificationRows(db);
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"id":"test"}'));

    const response = await postAuthPath(env, path, body);
    const responseBody = await response.clone().json();

    expect(await countVerificationRows(db)).toBe(before);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true });
    fetchSpy.mockRestore();
  });

  it('never emails a genuine code for a send-verification-otp request whose type is not sign-in', async () => {
    // AUTH_DEV_LOG_OTP short-circuits before Resend, which would mask a
    // missing `type` check (fetch would never be called either way), so
    // this uses a real-Resend-path env instead — the type guard is the
    // only thing standing between this request and a real email.
    const envWithoutDevLog = fakeEnv(db, { devLogOtp: false });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"id":"test"}'));

    const response = await postAuthPath(
      envWithoutDevLog,
      '/email-otp/send-verification-otp',
      { email: ADMIN_EMAIL, type: 'forget-password' }
    );

    expect(response.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('does email a genuine sign-in code once type is sign-in again (control for the previous test)', async () => {
    const envWithoutDevLog = fakeEnv(db, { devLogOtp: false });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"id":"test"}'));

    const response = await postAuthPath(
      envWithoutDevLog,
      '/email-otp/send-verification-otp',
      { email: ADMIN_EMAIL, type: 'sign-in' }
    );

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });

  it('still allows the real sign-in flow end to end (send-verification-otp + sign-in/email-otp)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const usersBefore = await countUserRows(db);

    const sendResponse = await postAuthPath(
      env,
      '/email-otp/send-verification-otp',
      { email: ADMIN_EMAIL, type: 'sign-in' }
    );
    expect(sendResponse.status).toBe(200);

    const logLine = logSpy.mock.calls
      .map((call) => call.join(' '))
      .find((line) => line.startsWith(`[auth] OTP for ${ADMIN_EMAIL}:`));
    logSpy.mockRestore();
    if (!logLine) {
      throw new Error('expected an OTP log line');
    }
    const otp = logLine.split(':').pop()?.trim() ?? '';

    const signInResponse = await postAuthPath(env, '/sign-in/email-otp', {
      email: ADMIN_EMAIL,
      otp,
    });

    expect(signInResponse.status).toBe(200);
    // Signing in again for an existing user must not create a second row.
    expect(await countUserRows(db)).toBe(usersBefore);
  });
});
