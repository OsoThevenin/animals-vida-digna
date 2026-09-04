import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTACT_EMAIL,
  resolveContactEmail,
} from '../src/lib/settings-resolver';

/**
 * Unit tests for the pure settings-resolution logic used by both:
 *  - the build-time generator script (scripts/generate-settings.ts), which reads the
 *    Keystatic `settings` singleton via the filesystem reader (Node context only), and
 *  - the generated module itself (src/generated/settings.ts), which is a plain object
 *    with no Keystatic/node:fs dependency, safe to bundle into the Cloudflare Worker.
 */
describe('resolveContactEmail', () => {
  it('returns the contactEmail from settings when present', () => {
    expect(resolveContactEmail({ contactEmail: 'shelter@example.org' })).toBe(
      'shelter@example.org'
    );
  });

  it('falls back to the default email when contactEmail is missing', () => {
    expect(resolveContactEmail({})).toBe(DEFAULT_CONTACT_EMAIL);
  });

  it('falls back to the default email when contactEmail is an empty string', () => {
    expect(resolveContactEmail({ contactEmail: '' })).toBe(
      DEFAULT_CONTACT_EMAIL
    );
  });

  it('falls back to the default email when settings is null', () => {
    expect(resolveContactEmail(null)).toBe(DEFAULT_CONTACT_EMAIL);
  });

  it('falls back to the default email when settings is undefined', () => {
    expect(resolveContactEmail(undefined)).toBe(DEFAULT_CONTACT_EMAIL);
  });

  it('default fallback matches the shelter address', () => {
    expect(DEFAULT_CONTACT_EMAIL).toBe('info@animalsvidadigna.org');
  });
});
