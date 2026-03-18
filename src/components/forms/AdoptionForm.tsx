import { useState } from 'preact/hooks';
import { validateAdoptionForm } from '../../lib/validation';

interface Translations {
  name: string;
  email: string;
  phone: string;
  livingSituation: string;
  message: string;
  submit: string;
  sending: string;
  successAdoption: string;
  errorRequired: string;
  errorInvalidEmail: string;
  errorServer: string;
  errorRateLimited: string;
  livingSituationFlat: string;
  livingSituationHouse: string;
  livingSituationHouseGarden: string;
  livingSituationRural: string;
  livingSituationOther: string;
}

interface Props {
  locale: 'ca' | 'es';
  translations: Translations;
  catName: string;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

const errorMessages: Record<string, keyof Translations> = {
  required: 'errorRequired',
  invalid_email: 'errorInvalidEmail',
};

export default function AdoptionForm({ locale, translations: t, catName }: Props) {
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
      phone: formData.get('phone') as string,
      livingSituation: formData.get('livingSituation') as string,
      message: formData.get('message') as string,
      catName: formData.get('catName') as string,
    };

    // Client-side validation
    const validation = validateAdoptionForm(data);
    if (!validation.valid && validation.errors) {
      setFieldErrors(validation.errors);
      return;
    }

    setStatus('submitting');
    try {
      const response = await fetch('/api/adopt', {
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
    const successMessage = t.successAdoption.replace('{catName}', catName);
    return (
      <div class="rounded-xl bg-green-50 p-8 text-center">
        <svg class="mx-auto mb-4 h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <p class="text-lg font-medium text-green-800">{successMessage}</p>
      </div>
    );
  }

  const inputClass = 'w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none';
  const errorClass = 'mt-1 text-xs text-red-600';

  const livingSituationOptions = [
    { value: '', label: '---' },
    { value: 'flat', label: t.livingSituationFlat },
    { value: 'house', label: t.livingSituationHouse },
    { value: 'houseGarden', label: t.livingSituationHouseGarden },
    { value: 'rural', label: t.livingSituationRural },
    { value: 'other', label: t.livingSituationOther },
  ];

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Honeypot field */}
      <div class="absolute -left-[9999px]" aria-hidden="true">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="catName" value={catName} />

      {/* Cat name display */}
      <div class="mb-6 rounded-lg bg-primary/5 p-4">
        <p class="text-sm font-medium text-text-muted">{catName}</p>
      </div>

      {serverError && (
        <div class="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div class="mb-5">
        <label htmlFor="adopt-name" class="mb-1 block text-sm font-medium text-text">
          {t.name} *
        </label>
        <input
          id="adopt-name"
          type="text"
          name="name"
          required
          class={inputClass}
        />
        {getFieldError('name') && <p class={errorClass}>{getFieldError('name')}</p>}
      </div>

      <div class="mb-5">
        <label htmlFor="adopt-email" class="mb-1 block text-sm font-medium text-text">
          {t.email} *
        </label>
        <input
          id="adopt-email"
          type="email"
          name="email"
          required
          class={inputClass}
        />
        {getFieldError('email') && <p class={errorClass}>{getFieldError('email')}</p>}
      </div>

      <div class="mb-5">
        <label htmlFor="adopt-phone" class="mb-1 block text-sm font-medium text-text">
          {t.phone}
        </label>
        <input
          id="adopt-phone"
          type="tel"
          name="phone"
          class={inputClass}
        />
      </div>

      <div class="mb-5">
        <label htmlFor="adopt-livingSituation" class="mb-1 block text-sm font-medium text-text">
          {t.livingSituation} *
        </label>
        <select
          id="adopt-livingSituation"
          name="livingSituation"
          required
          class={inputClass}
        >
          {livingSituationOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {getFieldError('livingSituation') && <p class={errorClass}>{getFieldError('livingSituation')}</p>}
      </div>

      <div class="mb-6">
        <label htmlFor="adopt-message" class="mb-1 block text-sm font-medium text-text">
          {t.message} *
        </label>
        <textarea
          id="adopt-message"
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
        class="w-full rounded-lg bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'submitting' ? t.sending : t.submit}
      </button>
    </form>
  );
}
