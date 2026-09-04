import { describe, expect, it } from 'vitest';
import { isAllowedEmail, parseAllowedEmails } from '../src/lib/allowlist';

describe('parseAllowedEmails', () => {
  it('splits a comma-separated list into a lowercase Set', () => {
    const result = parseAllowedEmails('Ana@example.com,bob@example.com');
    expect(result).toEqual(new Set(['ana@example.com', 'bob@example.com']));
  });

  it('trims whitespace around each address', () => {
    const result = parseAllowedEmails(' ana@example.com , bob@example.com ');
    expect(result).toEqual(new Set(['ana@example.com', 'bob@example.com']));
  });

  it('drops empty entries from trailing commas or blank input', () => {
    expect(parseAllowedEmails('ana@example.com,,')).toEqual(
      new Set(['ana@example.com'])
    );
    expect(parseAllowedEmails('')).toEqual(new Set());
  });
});

describe('isAllowedEmail', () => {
  const allowed = parseAllowedEmails('ana@example.com,bob@example.com');

  it('returns true for an exact allowlisted address', () => {
    expect(isAllowedEmail(allowed, 'ana@example.com')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isAllowedEmail(allowed, 'ANA@EXAMPLE.COM')).toBe(true);
  });

  it('ignores surrounding whitespace', () => {
    expect(isAllowedEmail(allowed, '  bob@example.com  ')).toBe(true);
  });

  it('returns false for an address not on the list', () => {
    expect(isAllowedEmail(allowed, 'stranger@example.com')).toBe(false);
  });
});
