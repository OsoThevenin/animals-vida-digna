import { describe, expect, it } from 'vitest';
import { createAuth } from '../src/lib/auth';
import {
  InvalidBetterAuthUrlError,
  MissingAuthEnvVarError,
} from '../src/lib/auth-env';

/**
 * Regression test for M1 (createAuth wiring): assertAuthEnv is a pure
 * function on its own (see tests/auth-env.test.ts), but the bug it fixes
 * only matters if `createAuth` actually calls it before doing anything
 * else. Confirms createAuth itself throws — not just the helper.
 */

function validEnv(): Env {
  return {
    DB: {} as unknown as D1Database,
    IMAGES_BUCKET: {} as unknown as R2Bucket,
    BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret',
    BETTER_AUTH_URL: 'http://localhost:4322',
    RESEND_API_KEY: 're_test',
    AUTH_EMAIL_FROM: 'Animals Vida Digna <no-reply@animalsvidadigna.org>',
    ADMIN_ALLOWED_EMAILS: 'ana@example.com',
    AUTH_INSECURE_COOKIES: '1',
  } as unknown as Env;
}

describe('createAuth env validation', () => {
  it('throws MissingAuthEnvVarError instead of a generic TypeError when BETTER_AUTH_SECRET is missing', () => {
    const env = { ...validEnv() };
    delete (env as unknown as Record<string, unknown>).BETTER_AUTH_SECRET;
    expect(() => createAuth(env)).toThrow(MissingAuthEnvVarError);
  });

  it('throws MissingAuthEnvVarError instead of a generic TypeError when ADMIN_ALLOWED_EMAILS is missing', () => {
    const env = { ...validEnv() };
    delete (env as unknown as Record<string, unknown>).ADMIN_ALLOWED_EMAILS;
    expect(() => createAuth(env)).toThrow(MissingAuthEnvVarError);
  });

  it('throws InvalidBetterAuthUrlError when BETTER_AUTH_URL has a trailing slash', () => {
    const env = { ...validEnv(), BETTER_AUTH_URL: 'http://localhost:4322/' };
    expect(() => createAuth(env)).toThrow(InvalidBetterAuthUrlError);
  });

  it('still builds a working auth instance for a fully valid env', () => {
    expect(() => createAuth(validEnv())).not.toThrow();
  });
});
