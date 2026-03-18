import { describe, expect, it } from 'vitest';
import {
  getContactNotificationHtml,
  getContactNotificationSubject,
  getContactConfirmationHtml,
  getContactConfirmationSubject,
} from '../src/lib/email';

describe('getContactNotificationHtml', () => {
  const data = { name: 'Maria', email: 'maria@example.com', message: 'Hola, vull informacio.' };

  it('returns HTML with Catalan content', () => {
    const html = getContactNotificationHtml(data, 'ca');
    expect(html).toContain('Maria');
    expect(html).toContain('maria@example.com');
    expect(html).toContain('Hola, vull informacio.');
    expect(html).toContain('<html');
  });

  it('returns HTML with Spanish content', () => {
    const html = getContactNotificationHtml(data, 'es');
    expect(html).toContain('Maria');
    expect(html).toContain('maria@example.com');
    expect(html).toContain('Hola, vull informacio.');
    expect(html).toContain('<html');
  });

  it('includes reply-to data in notification', () => {
    const html = getContactNotificationHtml(data, 'ca');
    expect(html).toContain('maria@example.com');
  });
});

describe('getContactNotificationSubject', () => {
  it('returns Catalan subject', () => {
    const subject = getContactNotificationSubject('ca');
    expect(subject.length).toBeGreaterThan(0);
    expect(typeof subject).toBe('string');
  });

  it('returns Spanish subject', () => {
    const subject = getContactNotificationSubject('es');
    expect(subject.length).toBeGreaterThan(0);
  });

  it('has different subjects for CA and ES', () => {
    expect(getContactNotificationSubject('ca')).not.toBe(getContactNotificationSubject('es'));
  });
});

describe('getContactConfirmationHtml', () => {
  it('includes warm Catalan message', () => {
    const html = getContactConfirmationHtml('Maria', 'ca');
    expect(html).toContain('Maria');
    expect(html).toMatch(/[Gg]r[aà]cies/i);
    expect(html).toContain('<html');
  });

  it('includes warm Spanish message', () => {
    const html = getContactConfirmationHtml('Maria', 'es');
    expect(html).toContain('Maria');
    expect(html).toMatch(/[Gg]racias/i);
    expect(html).toContain('<html');
  });
});

describe('getContactConfirmationSubject', () => {
  it('returns Catalan subject', () => {
    const subject = getContactConfirmationSubject('ca');
    expect(subject.length).toBeGreaterThan(0);
  });

  it('returns Spanish subject', () => {
    const subject = getContactConfirmationSubject('es');
    expect(subject.length).toBeGreaterThan(0);
  });
});
