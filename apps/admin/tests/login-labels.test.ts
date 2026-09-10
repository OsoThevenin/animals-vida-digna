import { describe, expect, it } from 'vitest';
import { LOGIN_LABELS } from '../src/components/login-form';

describe('LOGIN_LABELS', () => {
  it('every label pairs Catalan and Spanish text separated by " / "', () => {
    const bilingualKeys = [
      'emailLabel',
      'sendCode',
      'codeLabel',
      'signIn',
      'back',
      'genericError',
      'tooManyAttempts',
      'invalidCode',
      'notAllowed',
    ] as const;
    for (const key of bilingualKeys) {
      expect(LOGIN_LABELS[key]).toContain(' / ');
    }
  });
});
