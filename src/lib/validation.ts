export interface ValidationResult {
  valid: boolean;
  errors?: Record<string, string>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isBlank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

export function validateContactForm(data: {
  name?: string;
  email?: string;
  message?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (isBlank(data.name)) errors.name = 'required';
  if (isBlank(data.email)) {
    errors.email = 'required';
  } else if (!EMAIL_REGEX.test(data.email!)) {
    errors.email = 'invalid_email';
  }
  if (isBlank(data.message)) errors.message = 'required';

  if (Object.keys(errors).length > 0) return { valid: false, errors };
  return { valid: true };
}

export function validateAdoptionForm(data: {
  name?: string;
  email?: string;
  phone?: string;
  livingSituation?: string;
  message?: string;
  catName?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (isBlank(data.name)) errors.name = 'required';
  if (isBlank(data.email)) {
    errors.email = 'required';
  } else if (!EMAIL_REGEX.test(data.email!)) {
    errors.email = 'invalid_email';
  }
  if (isBlank(data.message)) errors.message = 'required';
  if (isBlank(data.livingSituation)) errors.livingSituation = 'required';
  // phone is optional — no validation needed

  if (Object.keys(errors).length > 0) return { valid: false, errors };
  return { valid: true };
}
