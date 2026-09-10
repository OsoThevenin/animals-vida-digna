import { describe, expect, it } from 'vitest';
import { buildOtpEmail } from '../src/lib/otp-email';

describe('buildOtpEmail', () => {
  it('includes the OTP in the subject-adjacent text body', () => {
    const email = buildOtpEmail('482913');
    expect(email.text).toContain('482913');
  });

  it('includes the OTP in the HTML body', () => {
    const email = buildOtpEmail('482913');
    expect(email.html).toContain('482913');
  });

  it('is bilingual: Catalan and Spanish both appear in the text body', () => {
    const email = buildOtpEmail('482913');
    expect(email.text).toContain('Català');
    expect(email.text).toContain('Español');
  });

  it('is bilingual: Catalan and Spanish both appear in the HTML body', () => {
    const email = buildOtpEmail('482913');
    expect(email.html).toContain('Català');
    expect(email.html).toContain('Español');
  });

  it('the HTML body is a well-formed document with a doctype', () => {
    const email = buildOtpEmail('482913');
    expect(email.html.trim().toLowerCase()).toMatch(/^<!doctype html>/);
  });

  it('the subject is non-empty and bilingual', () => {
    const email = buildOtpEmail('482913');
    expect(email.subject.length).toBeGreaterThan(0);
    expect(email.subject).toMatch(/\//); // "Català / Español" style pairing
  });
});
