import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import * as schema from '@avd/content/schema';
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { emailOTP } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/d1';
import { Resend } from 'resend';
import { isAllowedEmail, parseAllowedEmails } from './allowlist';
import { buildOtpEmail } from './otp-email';

/**
 * Built fresh per request. The Cloudflare adapter (v12) only exposes
 * bindings through context.locals.runtime.env on each request — there is
 * no module-scope D1Database to close over — so both src/middleware.ts and
 * src/pages/api/auth/[...all].ts call this instead of importing a shared
 * instance. betterAuth() is a cheap synchronous factory.
 */
export function createAuth(env: Env) {
  const allowed = parseAllowedEmails(env.ADMIN_ALLOWED_EMAILS);
  const db = drizzle(env.DB, { schema });

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL],
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    rateLimit: {
      enabled: true,
      storage: 'database',
    },
    advanced: {
      // Plain http in `astro dev` needs Secure off; production always
      // leaves AUTH_INSECURE_COOKIES unset. See .dev.vars.example (Task 9).
      useSecureCookies: env.AUTH_INSECURE_COOKIES !== '1',
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip'],
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            // Belt-and-braces: sendVerificationOTP below is the primary
            // gate (it decides whether a code is ever emailed at all),
            // but this hook fires on every user-creation path, so a
            // stranger can never end up with a user row even if a future
            // auth flow bypasses sendVerificationOTP.
            if (!isAllowedEmail(allowed, user.email)) {
              throw new APIError('FORBIDDEN', {
                message: 'Email not authorised.',
              });
            }
            return { data: user };
          },
        },
      },
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 3,
        async sendVerificationOTP({ email, otp }) {
          // Never email a stranger, and never call Resend at all for one.
          if (!isAllowedEmail(allowed, email)) {
            return;
          }
          if (env.AUTH_DEV_LOG_OTP === '1') {
            // Local-dev-only escape hatch (Task 9) so a volunteer's real
            // inbox is never needed to test the login flow.
            console.log(`[auth] OTP for ${email}: ${otp}`);
            return;
          }
          const resend = new Resend(env.RESEND_API_KEY);
          const { subject, text, html } = buildOtpEmail(otp);
          await resend.emails.send({
            from: env.AUTH_EMAIL_FROM,
            to: email,
            subject,
            text,
            html,
          });
        },
      }),
    ],
  });
}
