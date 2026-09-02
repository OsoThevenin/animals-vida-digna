import { describe, expect, it } from 'vitest';
import {
  KEYSTATIC_GITHUB_BRANCH_PREFIX,
  KEYSTATIC_GITHUB_REPO,
  resolveKeystaticStorage,
} from '../src/lib/keystatic-storage';

describe('resolveKeystaticStorage', () => {
  it('returns local storage in development', () => {
    const decision = resolveKeystaticStorage({ PROD: false });

    expect(decision).toEqual({ kind: 'local' });
  });

  it('returns local storage when PROD is entirely absent', () => {
    const decision = resolveKeystaticStorage({});

    expect(decision).toEqual({ kind: 'local' });
  });

  it('returns github storage in production', () => {
    const decision = resolveKeystaticStorage({ PROD: true });

    expect(decision).toEqual({
      kind: 'github',
      repo: KEYSTATIC_GITHUB_REPO,
      branchPrefix: KEYSTATIC_GITHUB_BRANCH_PREFIX,
    });
  });

  it('returns github storage in production even when no GitHub credentials are present in env at all', () => {
    // Credentials are resolved at request time from the Cloudflare runtime
    // env (and process.env as a fallback) by Keystatic's own API handler,
    // never checked here — see the module doc comment.
    const decision = resolveKeystaticStorage({ PROD: true });

    expect(decision).toEqual({
      kind: 'github',
      repo: KEYSTATIC_GITHUB_REPO,
      branchPrefix: KEYSTATIC_GITHUB_BRANCH_PREFIX,
    });
  });

  it('never throws for any credential-shaped input, since credentials are not its concern', () => {
    expect(() =>
      resolveKeystaticStorage({
        PROD: true,
        KEYSTATIC_GITHUB_CLIENT_ID: '',
        KEYSTATIC_GITHUB_CLIENT_SECRET: null,
        KEYSTATIC_SECRET: 12345,
      })
    ).not.toThrow();
  });

  it('exposes the expected repo and branch prefix constants', () => {
    expect(KEYSTATIC_GITHUB_REPO).toBe('OsoThevenin/animals-vida-digna');
    expect(KEYSTATIC_GITHUB_BRANCH_PREFIX).toBe('content/');
  });

  it('never mutates the input env object', () => {
    const frozen = Object.freeze({ PROD: true });

    expect(() => resolveKeystaticStorage(frozen)).not.toThrow();
  });

  it('returns local storage without throwing when env is undefined (e.g. imported under plain Node/tsx)', () => {
    expect(() => resolveKeystaticStorage(undefined)).not.toThrow();
    expect(resolveKeystaticStorage(undefined)).toEqual({ kind: 'local' });
  });

  it('returns local storage without throwing when env is null', () => {
    expect(() => resolveKeystaticStorage(null)).not.toThrow();
    expect(resolveKeystaticStorage(null)).toEqual({ kind: 'local' });
  });

  it('returns local storage without throwing when env is a non-object string primitive', () => {
    expect(() => resolveKeystaticStorage('not-an-env-object')).not.toThrow();
    expect(resolveKeystaticStorage('not-an-env-object')).toEqual({
      kind: 'local',
    });
  });

  it('returns local storage without throwing when env is a non-object number primitive', () => {
    expect(() => resolveKeystaticStorage(42)).not.toThrow();
    expect(resolveKeystaticStorage(42)).toEqual({ kind: 'local' });
  });
});
