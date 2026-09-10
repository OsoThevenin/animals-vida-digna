import { describe, expect, it } from 'vitest';
import { createAuth } from '../src/lib/auth';
import { buildRequestWithTrustedIp } from '../src/pages/api/auth/[...all]';

/**
 * Regression test for the mismatch confirmed by live experiment: the route
 * used to set `x-forwarded-for` while `auth.ts`'s rate limiter only trusts
 * `cf-connecting-ip` (`ipAddressHeaders: ['cf-connecting-ip']`), so the
 * forwarded header was silently ignored and the limiter fell back to the
 * socket address locally (observed key `127.0.0.1|/sign-in/email-otp`).
 * Varying `X-Forwarded-For` across requests did not change the rate-limit
 * key, confirming it is not trusted today.
 */

function fakeEnv(): Env {
  return {
    DB: {} as unknown as D1Database,
    IMAGES_BUCKET: {} as unknown as R2Bucket,
    ASSETS: {} as unknown as Fetcher,
    BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret',
    BETTER_AUTH_URL: 'http://localhost:4322',
    RESEND_API_KEY: 're_test',
    AUTH_EMAIL_FROM: 'Animals Vida Digna <no-reply@animalsvidadigna.org>',
    ADMIN_ALLOWED_EMAILS: 'ana@example.com',
    AUTH_INSECURE_COOKIES: '1',
  } as unknown as Env;
}

describe('cf-connecting-ip forwarding', () => {
  it('fills in cf-connecting-ip from clientAddress when absent (local dev)', () => {
    const original = new Request('http://localhost:4322/api/auth/session', {
      headers: { 'x-forwarded-for': '9.9.9.9' },
    });

    const forwarded = buildRequestWithTrustedIp(original, '127.0.0.1');

    expect(forwarded.headers.get('cf-connecting-ip')).toBe('127.0.0.1');
  });

  it('never overwrites a real Cloudflare-supplied cf-connecting-ip', () => {
    const original = new Request('http://localhost:4322/api/auth/session', {
      headers: { 'cf-connecting-ip': '1.1.1.1' },
    });

    const forwarded = buildRequestWithTrustedIp(original, '127.0.0.1');

    expect(forwarded.headers.get('cf-connecting-ip')).toBe('1.1.1.1');
  });

  it('does not trust x-forwarded-for for rate limiting', () => {
    const auth = createAuth(fakeEnv());
    const ipAddressHeaders = (
      auth.options.advanced as
        | { ipAddress?: { ipAddressHeaders?: string[] } }
        | undefined
    )?.ipAddress?.ipAddressHeaders;

    expect(ipAddressHeaders).toContain('cf-connecting-ip');
    expect(ipAddressHeaders).not.toContain('x-forwarded-for');
  });
});
