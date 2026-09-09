import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { onRequest } from '../src/middleware';

/**
 * Regression test for the finding fixed in the phase 5 final wave: the
 * middleware redirected every unauthenticated request with a 302,
 * including POSTs to `/_actions/*`. Astro's client action helper
 * (`node_modules/astro/dist/actions/runtime/virtual.js`) follows that
 * redirect, lands on the login page (a 200), and then `devalueParse`s the
 * login page's HTML as if it were a serialized action result — throwing
 * an unhandled, uncaught exception no call site expects. The volunteer's
 * "Desa" button then sits on "Desant…" forever with no error and no
 * redirect, and the edit is lost.
 *
 * The fix: for `/_actions/*` specifically, return a 401 with a JSON body
 * shaped exactly like `deserializeActionResult` (in that same Astro
 * runtime file) expects for its error branch — `{ type:
 * "AstroActionError", code: "UNAUTHORIZED", message }` — so
 * `rawResult.ok` is false, the helper deserializes it into a real
 * `ActionError`, and the app's existing `describeActionError` renders a
 * Catalan message instead of throwing.
 *
 * Page routes must keep getting their 302 to /login exactly as before —
 * asserted here too, so a regression on the page-route branch would fail
 * this same file.
 *
 * Uses `getPlatformProxy` for a real, ephemeral local D1 binding, the
 * same pattern as tests/middleware-allowlist-revocation.test.ts. No
 * cookie is sent, so `getSession` naturally resolves to no user —
 * exactly what an expired/revoked session that no longer sends a valid
 * cookie, or a request with a cookie for a session `getSession` has
 * already invalidated, looks like to the middleware.
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

async function callMiddleware(
  env: Env,
  pathname: string,
  init?: RequestInit
): Promise<Response> {
  const request = new Request(`http://localhost:4322${pathname}`, init);
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

describe('middleware /_actions/* unauthenticated handling', () => {
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

  it('returns a 401 with an ActionError-shaped JSON body, not a redirect', async () => {
    const env = fakeEnv(db);
    const response = await callMiddleware(env, '/_actions/cats.create', {
      method: 'POST',
    });

    expect(response.status).toBe(401);
    expect(response.headers.get('Location')).toBeNull();

    const contentType = response.headers.get('content-type') ?? '';
    expect(contentType).toContain('application/json');

    const body = await response.json();
    expect(body).toMatchObject({
      type: 'AstroActionError',
      code: 'UNAUTHORIZED',
    });
    expect(typeof body.message).toBe('string');
    expect(body.message.length).toBeGreaterThan(0);
  });

  it('still redirects an unauthenticated page route to /login with a 302', async () => {
    const env = fakeEnv(db);
    const response = await callMiddleware(env, '/cats');

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login');
  });
});
