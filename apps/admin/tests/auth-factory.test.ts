import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAuth } from '../src/lib/auth';

function fakeEnv(): Env {
  return {
    DB: {} as unknown as D1Database,
    IMAGES_BUCKET: {} as unknown as R2Bucket,
    BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret',
    BETTER_AUTH_URL: 'http://localhost:4322',
    RESEND_API_KEY: 're_test',
    AUTH_EMAIL_FROM: 'Animals Vida Digna <no-reply@animalsvidadigna.org>',
    ADMIN_ALLOWED_EMAILS: 'ana@example.com',
    AUTH_INSECURE_COOKIES: '1',
  } as unknown as Env;
}

function getSendVerificationOtp(
  auth: ReturnType<typeof createAuth>
): (data: { email: string; otp: string; type: string }) => Promise<void> {
  const plugin = auth.options.plugins?.find(
    (candidate) => candidate.id === 'email-otp'
  ) as
    | {
        options: {
          sendVerificationOTP: (data: {
            email: string;
            otp: string;
            type: string;
          }) => Promise<void>;
        };
      }
    | undefined;
  if (!plugin) {
    throw new Error('email-otp plugin not found on auth.options.plugins');
  }
  return plugin.options.sendVerificationOTP;
}

describe('createAuth', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a betterAuth instance with the emailOTP plugin configured', () => {
    const auth = createAuth(fakeEnv());
    expect(auth.options.plugins?.length).toBeGreaterThan(0);
  });

  it('emails Resend for an allowlisted address', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"id":"test"}'));
    const auth = createAuth(fakeEnv());
    const sendVerificationOTP = getSendVerificationOtp(auth);

    await sendVerificationOTP({
      email: 'ana@example.com',
      otp: '482913',
      type: 'sign-in',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('https://api.resend.com/emails');
  });

  it('never calls fetch (never emails Resend) for a non-allowlisted address', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"id":"test"}'));
    const auth = createAuth(fakeEnv());
    const sendVerificationOTP = getSendVerificationOtp(auth);

    await sendVerificationOTP({
      email: 'stranger@example.com',
      otp: '482913',
      type: 'sign-in',
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
