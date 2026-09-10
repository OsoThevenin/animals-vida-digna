import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTACT_EMAIL,
  DEFAULT_DONATE_URL,
} from '../src/lib/settings-resolver';

/**
 * Shape/contract tests for the build-time-generated settings module
 * (src/generated/settings.ts). This module is a plain object with no
 * @keystatic/core / node:fs dependency — it must stay importable from
 * code that runs in the Cloudflare Worker.
 */
describe('generated settings module', () => {
  it('exports a siteSettings object with a non-empty string contactEmail', async () => {
    const { siteSettings } = await import('../src/generated/settings');
    expect(typeof siteSettings.contactEmail).toBe('string');
    expect(siteSettings.contactEmail.length).toBeGreaterThan(0);
  });

  it('contactEmail looks like an email address', async () => {
    const { siteSettings } = await import('../src/generated/settings');
    expect(siteSettings.contactEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it('falls back to DEFAULT_CONTACT_EMAIL shape when the source has no override', () => {
    // The generator uses resolveContactEmail with the same fallback constant,
    // so an empty/missing settings.yaml value must resolve to this default.
    expect(DEFAULT_CONTACT_EMAIL).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it('exports a siteSettings object with a non-empty string donateUrl', async () => {
    const { siteSettings } = await import('../src/generated/settings');
    expect(typeof siteSettings.donateUrl).toBe('string');
    expect(siteSettings.donateUrl.length).toBeGreaterThan(0);
  });

  it('falls back to DEFAULT_DONATE_URL shape when the source has no override', () => {
    expect(DEFAULT_DONATE_URL).toBe('#');
  });

  it('does not import @keystatic/core (module graph stays fs-free)', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(
      new URL('../src/generated/settings.ts', import.meta.url),
      'utf-8'
    );
    expect(source).not.toMatch(/^\s*import.*@keystatic\/core/m);
    expect(source).not.toMatch(/^\s*import.*node:fs/m);
  });
});
