import { describe, expect, it } from 'vitest';
import { validateContactForm, validateAdoptionForm } from '../src/lib/validation';

describe('validateContactForm', () => {
  it('returns valid for complete input', () => {
    const result = validateContactForm({ name: 'Maria', email: 'maria@example.com', message: 'Hola!' });
    expect(result).toEqual({ valid: true });
  });

  it('returns errors for empty object', () => {
    const result = validateContactForm({});
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({
      name: 'required',
      email: 'required',
      message: 'required',
    });
  });

  it('returns email format error for invalid email', () => {
    const result = validateContactForm({ name: 'Maria', email: 'bad', message: 'hi' });
    expect(result.valid).toBe(false);
    expect(result.errors?.email).toBe('invalid_email');
    expect(result.errors?.name).toBeUndefined();
    expect(result.errors?.message).toBeUndefined();
  });

  it('trims whitespace-only fields as empty', () => {
    const result = validateContactForm({ name: '   ', email: '', message: '' });
    expect(result.valid).toBe(false);
    expect(result.errors?.name).toBe('required');
  });

  it('accepts email with subdomain', () => {
    const result = validateContactForm({ name: 'Test', email: 'user@mail.example.co.uk', message: 'Hello' });
    expect(result).toEqual({ valid: true });
  });

  it('rejects email without domain', () => {
    const result = validateContactForm({ name: 'Test', email: 'user@', message: 'Hello' });
    expect(result.valid).toBe(false);
    expect(result.errors?.email).toBe('invalid_email');
  });
});

describe('validateAdoptionForm', () => {
  const validData = {
    name: 'Maria',
    email: 'maria@example.com',
    message: 'I want to adopt Luna',
    livingSituation: 'flat',
    catName: 'Luna',
  };

  it('returns valid for complete input', () => {
    const result = validateAdoptionForm(validData);
    expect(result).toEqual({ valid: true });
  });

  it('returns valid with optional phone', () => {
    const result = validateAdoptionForm({ ...validData, phone: '+34 612 345 678' });
    expect(result).toEqual({ valid: true });
  });

  it('returns valid without optional phone', () => {
    const result = validateAdoptionForm({ ...validData, phone: undefined });
    expect(result).toEqual({ valid: true });
  });

  it('requires livingSituation', () => {
    const result = validateAdoptionForm({ ...validData, livingSituation: undefined });
    expect(result.valid).toBe(false);
    expect(result.errors?.livingSituation).toBe('required');
  });

  it('requires all contact form fields plus livingSituation', () => {
    const result = validateAdoptionForm({});
    expect(result.valid).toBe(false);
    expect(result.errors?.name).toBe('required');
    expect(result.errors?.email).toBe('required');
    expect(result.errors?.message).toBe('required');
    expect(result.errors?.livingSituation).toBe('required');
  });

  it('validates email format', () => {
    const result = validateAdoptionForm({ ...validData, email: 'bad-email' });
    expect(result.valid).toBe(false);
    expect(result.errors?.email).toBe('invalid_email');
  });
});
