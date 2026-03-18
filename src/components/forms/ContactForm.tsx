import { useState } from 'preact/hooks';
import { validateContactForm } from '../../lib/validation';

interface Translations {
  name: string;
  email: string;
  message: string;
  submit: string;
  sending: string;
  successContact: string;
  errorRequired: string;
  errorInvalidEmail: string;
  errorServer: string;
  errorRateLimited: string;
}

interface Props {
  locale: 'ca' | 'es';
  translations: Translations;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

const errorMessages: Record<string, keyof Translations> = {
  required: 'errorRequired',
  invalid_email: 'errorInvalidEmail',
};

export default function ContactForm({ locale, translations: t }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [serverError, setServerError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const getFieldError = (field: string): string | null => {
    const errorKey = fieldErrors[field];
    if (!errorKey) return null;
    const translationKey = errorMessages[errorKey];
    return translationKey ? t[translationKey] : errorKey;
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setServerError('');
    setFieldErrors({});

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      message: formData.get('message') as string,
    };

    // Client-side validation
    const validation = validateContactForm(data);
    if (!validation.valid && validation.errors) {
      setFieldErrors(validation.errors);
      return;
    }

    setStatus('submitting');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setStatus('success');
      } else if (response.status === 429) {
        setStatus('error');
        setServerError(t.errorRateLimited);
      } else if (result.errors) {
        setStatus('idle');
        setFieldErrors(result.errors);
      } else {
        setStatus('error');
        setServerError(t.errorServer);
      }
    } catch {
      setStatus('error');
      setServerError(t.errorServer);
    }
  };

  if (status === 'success') {
    return (
      <div class="rounded-xl bg-green-50 p-8 text-center">
        <svg class="mx-auto mb-4 h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <p class="text-lg font-medium text-green-800">{t.successContact}</p>
      </div>
    );
  }

  const inputClass = 'w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none';
  const errorClass = 'mt-1 text-xs text-red-600';

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Honeypot field */}
      <div class="absolute -left-[9999px]" aria-hidden="true">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <input type="hidden" name="locale" value={locale} />

      {serverError && (
        <div class="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div class="mb-5">
        <label htmlFor="contact-name" class="mb-1 block text-sm font-medium text-text">
          {t.name} *
        </label>
        <input
          id="contact-name"
          type="text"
          name="name"
          required
          class={inputClass}
        />
        {getFieldError('name') && <p class={errorClass}>{getFieldError('name')}</p>}
      </div>

      <div class="mb-5">
        <label htmlFor="contact-email" class="mb-1 block text-sm font-medium text-text">
          {t.email} *
        </label>
        <input
          id="contact-email"
          type="email"
          name="email"
          required
          class={inputClass}
        />
        {getFieldError('email') && <p class={errorClass}>{getFieldError('email')}</p>}
      </div>

      <div class="mb-6">
        <label htmlFor="contact-message" class="mb-1 block text-sm font-medium text-text">
          {t.message} *
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          class={inputClass}
        />
        {getFieldError('message') && <p class={errorClass}>{getFieldError('message')}</p>}
      </div>

      <button
        type="submit"
        disabled={status === 'submitting'}
        class="w-full rounded-lg bg-primary px-6 py-3 font-semibold text-surface transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'submitting' ? t.sending : t.submit}
      </button>
    </form>
  );
}
