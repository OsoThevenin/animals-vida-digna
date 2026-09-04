import * as schema from '@avd/content/schema';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
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
        // Only `cf-connecting-ip` is trusted here. Never add
        // `x-forwarded-for` — it is fully client-controlled, so trusting it
        // would let any caller spoof the rate-limit key. See the
        // `buildRequestWithTrustedIp` comment in
        // src/pages/api/auth/[...all].ts for how the header gets set.
        ipAddressHeaders: ['cf-connecting-ip'],
      },
    },
    hooks: {
      // Rejects a non-allowlisted email *before* better-auth's
      // send-verification-otp endpoint runs. That endpoint (in the
      // emailOTP plugin) calls resolveOTP — which writes a row to the
      // `verification` table — before it ever calls sendVerificationOTP
      // below to decide whether to actually email anyone. Without this
      // earlier gate, any unauthenticated visitor can cause unbounded
      // writes to production D1 just by posting arbitrary addresses,
      // even though no code is ever sent and sign-in is still blocked by
      // the databaseHooks.user.create.before hook further down.
      //
      // Short-circuiting here with the endpoint's own `{ success: true }`
      // shape keeps the HTTP response byte-identical to the allowlisted
      // case (no enumeration signal) and does no extra work on either
      // branch (no timing signal). Router-level rate limiting (see
      // rateLimit above) still runs before hooks.before, so this path
      // stays rate-limited exactly like every other request.
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== '/email-otp/send-verification-otp') {
          return;
        }
        const email = ctx.body?.email;
        if (typeof email === 'string' && !isAllowedEmail(allowed, email)) {
          return ctx.json({ success: true });
        }
      }),
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
