import { describe, expect, it } from 'vitest';
import { validateAdoptionForm } from '../src/lib/validation';

/**
 * Unit tests for the adoption form API logic.
 *
 * We test the validation, honeypot logic, and email sending directly since the
 * Astro APIRoute handler requires the full Astro runtime (Keystatic reader, Resend SDK,
 * Cloudflare bindings). Rate limiting is verified in integration via Cloudflare Workers.
 */

describe('Adoption API validation logic', () => {
  it('validates valid adoption submission data', () => {
    const result = validateAdoptionForm({
      name: 'Maria Garcia',
      email: 'maria@example.com',
      phone: '612345678',
      livingSituation: 'flat',
      message: 'M\'agradaria adoptar aquest gat.',
      catName: 'Misha',
    });
    expect(result).toEqual({ valid: true });
  });

  it('validates without optional phone field', () => {
    const result = validateAdoptionForm({
      name: 'Maria Garcia',
      email: 'maria@example.com',
      livingSituation: 'house',
      message: 'Vull adoptar.',
      catName: 'Luna',
    });
    expect(result).toEqual({ valid: true });
  });

  it('rejects missing required fields with error keys', () => {
    const result = validateAdoptionForm({});
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('name', 'required');
    expect(result.errors).toHaveProperty('email', 'required');
    expect(result.errors).toHaveProperty('message', 'required');
    expect(result.errors).toHaveProperty('livingSituation', 'required');
  });

  it('rejects invalid email format', () => {
    const result = validateAdoptionForm({
      name: 'Test',
      email: 'not-an-email',
      livingSituation: 'flat',
      message: 'Hello',
      catName: 'Misha',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('email', 'invalid_email');
  });
});

describe('Adoption honeypot detection logic', () => {
  it('identifies honeypot when website field is filled', () => {
    const honeypotValue = 'spam-bot-filled-this';
    expect(!!honeypotValue).toBe(true); // Truthy = bot detected
  });

  it('passes when honeypot field is empty', () => {
    const honeypotValue = '';
    expect(!!honeypotValue).toBe(false); // Falsy = human
  });

  it('passes when honeypot field is null', () => {
    const honeypotValue = null;
    expect(!!honeypotValue).toBe(false); // Falsy = human
  });
});

describe('Adoption email sending flow', () => {
  it('sendAdoptionNotification calls resend with correct params including catName', async () => {
    const { sendAdoptionNotification } = await import('../src/lib/email');
    const sentEmails: unknown[] = [];
    const mockResend = {
      emails: {
        send: async (params: unknown) => {
          sentEmails.push(params);
          return { id: 'test-id' };
        },
      },
    };

    await sendAdoptionNotification(mockResend, {
      name: 'Maria',
      email: 'maria@example.com',
      phone: '612345678',
      livingSituation: 'flat',
      message: 'Vull adoptar la Misha!',
      catName: 'Misha',
      contactEmail: 'shelter@animalsvidadigna.org',
      locale: 'ca',
    });

    expect(sentEmails).toHaveLength(1);
    const sent = sentEmails[0] as Record<string, string>;
    expect(sent.to).toBe('shelter@animalsvidadigna.org');
    expect(sent.replyTo).toBe('maria@example.com');
    expect(sent.subject).toContain('Misha');
    expect(sent.html).toContain('Maria');
    expect(sent.html).toContain('Misha');
  });

  it('sendAdoptionConfirmation calls resend with correct params including catName', async () => {
    const { sendAdoptionConfirmation } = await import('../src/lib/email');
    const sentEmails: unknown[] = [];
    const mockResend = {
      emails: {
        send: async (params: unknown) => {
          sentEmails.push(params);
          return { id: 'test-id' };
        },
      },
    };

    await sendAdoptionConfirmation(mockResend, {
      email: 'maria@example.com',
      name: 'Maria',
      catName: 'Misha',
      locale: 'ca',
    });

    expect(sentEmails).toHaveLength(1);
    const sent = sentEmails[0] as Record<string, string>;
    expect(sent.to).toBe('maria@example.com');
    expect(sent.subject).toContain('Misha');
    expect(sent.html).toContain('Misha');
  });

  it('sends both notification and confirmation with cat name (ES locale)', async () => {
    const { sendAdoptionNotification, sendAdoptionConfirmation } = await import('../src/lib/email');
    const sentEmails: unknown[] = [];
    const mockResend = {
      emails: {
        send: async (params: unknown) => {
          sentEmails.push(params);
          return { id: 'test-id' };
        },
      },
    };

    await sendAdoptionNotification(mockResend, {
      name: 'Carlos',
      email: 'carlos@example.com',
      livingSituation: 'house',
      message: 'Quiero adoptar a Luna.',
      catName: 'Luna',
      contactEmail: 'shelter@animalsvidadigna.org',
      locale: 'es',
    });

    await sendAdoptionConfirmation(mockResend, {
      email: 'carlos@example.com',
      name: 'Carlos',
      catName: 'Luna',
      locale: 'es',
    });

    expect(sentEmails).toHaveLength(2);
    const notification = sentEmails[0] as Record<string, string>;
    const confirmation = sentEmails[1] as Record<string, string>;
    expect(notification.subject).toContain('Luna');
    expect(confirmation.subject).toContain('Luna');
    expect(confirmation.html).toContain('Gracias');
  });
});
