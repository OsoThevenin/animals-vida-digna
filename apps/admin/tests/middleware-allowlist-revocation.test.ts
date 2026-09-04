import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { createAuth } from '../src/lib/auth';
import { onRequest } from '../src/middleware';

/**
 * Regression test for the finding (H1): the middleware only ever checked
 * `context.locals.user` for *authentication* (a valid, unexpired session),
 * never re-checking the allowlist for *authorization*. Because sessions are
 * rolling (better-auth bumps `expiresAt` on every request older than
 * `updateAge`), a volunteer's 7-day cookie never naturally expired — so
 * removing their address from `ADMIN_ALLOWED_EMAILS` and redeploying had no
 * effect on an already-signed-in session. This proves the opposite: signing
 * in while allowlisted, then simulating the maintainer's redeploy (a fresh
 * `createAuth` call built from an env with that address removed), must lock
 * the existing session out on its very next request.
 *
 * Uses `getPlatformProxy` for a real, ephemeral local D1 binding — the same
 * pattern as tests/verification-row-allowlist.test.ts — and exercises the
 * real sign-in HTTP flow (send-verification-otp, then sign-in/email-otp)
 * rather than hand-inserting session rows, so the extracted session cookie
 * is byte-identical to what a real browser would hold.
 */

const root = resolve(import.meta.dirname, '..');

function fakeEnv(db: D1Database, allowedEmails: string): Env {
  return {
    DB: db,
    IMAGES_BUCKET: {} as unknown as R2Bucket,
    ASSETS: {} as unknown as Fetcher,
    BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret',
    BETTER_AUTH_URL: 'http://localhost:4322',
    RESEND_API_KEY: 're_test',
    AUTH_EMAIL_FROM: 'Animals Vida Digna <no-reply@animalsvidadigna.org>',
    ADMIN_ALLOWED_EMAILS: allowedEmails,
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

/** Signs in `email` against `env` via the real HTTP flow and returns a
 * `Cookie` header value holding the resulting session cookie(s). */
async function signInAndGetCookie(env: Env, email: string): Promise<string> {
  const auth = createAuth(env);
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  const sendResponse = await auth.handler(
    new Request(
      'http://localhost:4322/api/auth/email-otp/send-verification-otp',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, type: 'sign-in' }),
      }
    )
  );
  expect(sendResponse.status).toBe(200);

  const logLine = logSpy.mock.calls
    .map((call) => call.join(' '))
    .find((line) => line.startsWith(`[auth] OTP for ${email}:`));
  logSpy.mockRestore();
  if (!logLine) {
    throw new Error(`AUTH_DEV_LOG_OTP did not log an OTP for ${email}`);
  }
  const otp = logLine.split(':').pop()?.trim();

  const signInResponse = await auth.api.signInEmailOTP({
    body: { email, otp: otp ?? '' },
    asResponse: true,
  });
  expect(signInResponse.status).toBeLessThan(400);

  const cookies = signInResponse.headers.getSetCookie();
  if (cookies.length === 0) {
    throw new Error('sign-in response set no cookies');
  }
  return cookies.map((cookie) => cookie.split(';')[0]).join('; ');
}

async function callMiddleware(
  env: Env,
  cookie: string,
  pathname: string
): Promise<Response> {
  const request = new Request(`http://localhost:4322${pathname}`, {
    headers: { cookie },
  });
  const locals = { runtime: { env } } as unknown as App.Locals;
  const context = {
    locals,
    request,
    url: new URL(request.url),
    redirect: (path: string, status?: number) =>
      new Response(null, {
        status: status ?? 302,
        headers: { Location: path },
      }),
  } as unknown as Parameters<typeof onRequest>[0];
  const result = await onRequest(context, async () => new Response('ok'));
  if (!result) {
    throw new Error('middleware onRequest returned no Response');
  }
  return result;
}

describe('middleware allowlist revocation (real local D1)', () => {
  let dispose: () => Promise<void>;
  let db: D1Database;

  beforeEach(async () => {
    const proxy = await getPlatformProxy<{ DB: D1Database }>({
      configPath: resolve(root, 'wrangler.toml'),
      persist: false,
    });
    dispose = proxy.dispose;
    db = proxy.env.DB;
    await applyMigrations(db);
  });

  afterEach(async () => {
    await dispose();
  });

  it('locks out a session on its next request once the address is removed from the allowlist', async () => {
    const email = 'ana@example.com';
    const envWhileAllowed = fakeEnv(db, email);
    const cookie = await signInAndGetCookie(envWhileAllowed, email);

    // Sanity check: the session still authenticates while allowlisted.
    const stillAllowedResponse = await callMiddleware(
      envWhileAllowed,
      cookie,
      '/cats'
    );
    expect(stillAllowedResponse.status).toBe(200);

    // Simulate the maintainer removing the address and redeploying: a
    // fresh createAuth() call (as middleware.ts makes on every request)
    // built from an env that no longer allows this email, but backed by
    // the exact same D1 database — the session row still exists.
    const envAfterRemoval = fakeEnv(db, 'someone-else@example.com');
    const revokedResponse = await callMiddleware(
      envAfterRemoval,
      cookie,
      '/cats'
    );

    expect(revokedResponse.status).toBe(302);
    expect(revokedResponse.headers.get('Location')).toBe('/login');
  });
});
