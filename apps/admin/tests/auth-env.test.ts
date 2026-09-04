import { describe, expect, it } from 'vitest';
import {
  assertAuthEnv,
  InvalidBetterAuthUrlError,
  MissingAuthEnvVarError,
} from '../src/lib/auth-env';

/**
 * Regression test for M1: `parseAllowedEmails(env.ADMIN_ALLOWED_EMAILS)`
 * throws a generic `TypeError` on `undefined`, and `createAuth` runs on
 * every request (via src/middleware.ts), so a forgotten secret used to
 * 500 the entire site with no indication of which binding was missing.
 * Worse, an omitted or blank `BETTER_AUTH_SECRET` let better-auth fall
 * back to its own published constant secret — inside a workerd bundle,
 * `process.env.NODE_ENV === 'production'` is not reliably set, so the
 * Worker would boot and sign forgeable session cookies. `assertAuthEnv`
 * must fail loudly and by name instead.
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
  } as unknown as Env;
}

const REQUIRED_VARS = [
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'RESEND_API_KEY',
  'AUTH_EMAIL_FROM',
  'ADMIN_ALLOWED_EMAILS',
] as const;

describe('assertAuthEnv', () => {
  it('does not throw for a fully configured env', () => {
    expect(() => assertAuthEnv(validEnv())).not.toThrow();
  });

  it.each(
    REQUIRED_VARS
  )('throws a named MissingAuthEnvVarError naming %s when it is missing', (name) => {
    const env = { ...validEnv() };
    delete (env as unknown as Record<string, unknown>)[name];
    expect(() => assertAuthEnv(env)).toThrow(MissingAuthEnvVarError);
    expect(() => assertAuthEnv(env)).toThrow(name);
  });

  it.each(
    REQUIRED_VARS
  )('throws a named MissingAuthEnvVarError naming %s when it is blank', (name) => {
    const env = { ...validEnv(), [name]: '   ' };
    expect(() => assertAuthEnv(env)).toThrow(MissingAuthEnvVarError);
    expect(() => assertAuthEnv(env)).toThrow(name);
  });

  it('throws InvalidBetterAuthUrlError for a trailing slash', () => {
    const env = { ...validEnv(), BETTER_AUTH_URL: 'http://localhost:4322/' };
    expect(() => assertAuthEnv(env)).toThrow(InvalidBetterAuthUrlError);
  });

  it('throws InvalidBetterAuthUrlError for a path', () => {
    const env = {
      ...validEnv(),
      BETTER_AUTH_URL: 'http://localhost:4322/login',
    };
    expect(() => assertAuthEnv(env)).toThrow(InvalidBetterAuthUrlError);
  });

  it('throws InvalidBetterAuthUrlError for an unparseable URL', () => {
    const env = { ...validEnv(), BETTER_AUTH_URL: 'not-a-url' };
    expect(() => assertAuthEnv(env)).toThrow(InvalidBetterAuthUrlError);
  });

  it('accepts a bare production origin with no trailing slash', () => {
    const env = {
      ...validEnv(),
      BETTER_AUTH_URL: 'https://admin.animalsvidadigna.org',
    };
    expect(() => assertAuthEnv(env)).not.toThrow();
  });
});
