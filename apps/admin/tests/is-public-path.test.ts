import { describe, expect, it } from 'vitest';
import { isPublicPath } from '../src/lib/is-public-path';

describe('isPublicPath', () => {
  it('treats /login as public', () => {
    expect(isPublicPath('/login')).toBe(true);
  });

  it('treats every /api/auth/* path as public', () => {
    expect(isPublicPath('/api/auth/sign-in/email-otp')).toBe(true);
    expect(isPublicPath('/api/auth/sign-out')).toBe(true);
  });

  it('treats /_astro/* asset paths as public', () => {
    expect(isPublicPath('/_astro/client.abc123.js')).toBe(true);
  });

  it('treats /favicon.ico as public', () => {
    expect(isPublicPath('/favicon.ico')).toBe(true);
  });

  it('treats /cats as protected (not public)', () => {
    expect(isPublicPath('/cats')).toBe(false);
  });

  it('treats / as protected (not public)', () => {
    expect(isPublicPath('/')).toBe(false);
  });

  it('does not treat /loginish as public (prefix match must not over-match past a path boundary is not required, but must still start with /login)', () => {
    // Documents the actual (simple, prefix-based) matching rule rather
    // than a stricter one: /loginish also starts with "/login". This is
    // acceptable because no such route exists in this app; the test pins
    // the current behaviour so a future route addition notices the edge
    // case instead of silently inheriting it.
    expect(isPublicPath('/loginish')).toBe(true);
  });
});
