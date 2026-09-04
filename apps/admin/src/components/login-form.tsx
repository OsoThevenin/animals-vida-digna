import { Button, Field } from '@avd/design-system';
import { type FormEvent, useState } from 'react';
import { authClient } from '../lib/auth-client';

type Step = 'email' | 'code';

export const LOGIN_LABELS = {
  emailLabel: 'Correu electrònic / Correo electrónico',
  emailPlaceholder: 'nom@animalsvidadigna.org',
  sendCode: 'Envia el codi / Enviar código',
  codeLabel: 'Codi de 6 dígits / Código de 6 dígitos',
  signIn: 'Entra / Entrar',
  back: 'Torna / Volver',
  sending: 'Enviant… / Enviando…',
  verifying: 'Verificant… / Verificando…',
  genericError:
    "No s'ha pogut enviar el codi / No se pudo enviar el código",
  tooManyAttempts:
    'Massa intents, demana un codi nou / Demasiados intentos, pide un código nuevo',
  invalidCode: 'Codi incorrecte / Código incorrecto',
  notAllowed:
    'Aquest correu no té accés / Este correo no tiene acceso',
} as const;

export function LoginForm() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const { error: sendError } = await authClient.emailOtp.sendVerificationOtp(
      { email, type: 'sign-in' }
    );
    setBusy(false);
    if (sendError) {
      setError(LOGIN_LABELS.genericError);
      return;
    }
    setStep('code');
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const { error: verifyError } = await authClient.signIn.emailOtp({
      email,
      otp,
    });
    setBusy(false);
    if (verifyError) {
      if (verifyError.code === 'TOO_MANY_ATTEMPTS') {
        setError(LOGIN_LABELS.tooManyAttempts);
        setStep('email');
        setOtp('');
        return;
      }
      if (verifyError.code === 'FORBIDDEN') {
        setError(LOGIN_LABELS.notAllowed);
        setStep('email');
        setOtp('');
        return;
      }
      setError(LOGIN_LABELS.invalidCode);
      return;
    }
    window.location.assign('/cats');
  }

  if (step === 'email') {
    return (
      <form onSubmit={handleSendCode}>
        <Field id="email" label={LOGIN_LABELS.emailLabel}>
          <input
            className="w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
            id="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder={LOGIN_LABELS.emailPlaceholder}
            required
            type="email"
            value={email}
          />
        </Field>
        {error ? (
          <p className="mb-4 text-red-600 text-sm">{error}</p>
        ) : null}
        <Button disabled={busy} fullWidth type="submit" variant="primary">
          {busy ? LOGIN_LABELS.sending : LOGIN_LABELS.sendCode}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyCode}>
      <Field id="otp" label={LOGIN_LABELS.codeLabel}>
        <input
          className="w-full rounded-lg border border-primary/20 bg-surface px-3 py-2 text-center text-lg text-text tracking-widest focus:border-primary focus:outline-none"
          id="otp"
          inputMode="numeric"
          maxLength={6}
          name="otp"
          onChange={(event) => setOtp(event.target.value)}
          required
          value={otp}
        />
      </Field>
      {error ? <p className="mb-4 text-red-600 text-sm">{error}</p> : null}
      <Button disabled={busy} fullWidth type="submit" variant="primary">
        {busy ? LOGIN_LABELS.verifying : LOGIN_LABELS.signIn}
      </Button>
      <button
        className="mt-3 w-full text-center text-primary text-sm underline"
        onClick={() => {
          setStep('email');
          setError(null);
          setOtp('');
        }}
        type="button"
      >
        {LOGIN_LABELS.back}
      </button>
    </form>
  );
}
