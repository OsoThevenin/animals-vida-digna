import * as schema from '@avd/content/schema';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { emailOTP } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/d1';
import { Resend } from 'resend';
import { isAllowedEmail, parseAllowedEmails } from './allowlist';
import { assertAuthEnv } from './auth-env';
import { buildOtpEmail } from './otp-email';

/**
 * Built fresh per request. The Cloudflare adapter (v12) only exposes
 * bindings through context.locals.runtime.env on each request — there is
 * no module-scope D1Database to close over — so both src/middleware.ts and
 * src/pages/api/auth/[...all].ts call this instead of importing a shared
 * instance. betterAuth() is a cheap synchronous factory.
 */
export function createAuth(env: Env) {
  // Fail loudly and by name for a missing/blank secret, instead of either
  // a generic TypeError deep inside parseAllowedEmails or (for a missing
  // BETTER_AUTH_SECRET specifically) letting better-auth silently sign
  // cookies with its own published fallback secret. See src/lib/auth-env.ts.
  assertAuthEnv(env);
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
      // The emailOTP plugin registers nine public routes, but this app
      // only ever calls two of them: /email-otp/send-verification-otp
      // (request a code) and /sign-in/email-otp (redeem it — untouched by
      // the prefix check below, since it doesn't start with either
      // prefix). Every other /email-otp/* and /forget-password/* route
      // (check-verification-otp, verify-email, request-password-reset,
      // the deprecated forget-password/email-otp, reset-password,
      // request-email-change, change-email) is attacker-reachable
      // regardless of the allowlist and, for the two password-reset
      // routes, calls resolveOTP — which writes a row to the
      // `verification` table — *before* checking whether the user even
      // exists, deleting it only afterwards. That is an unbounded-D1-write
      // vector reachable by anyone, and for an address that already has a
      // user row, a route that genuinely emails a correctly-branded access
      // code: an attacker can script it to flood an admin's inbox, burn
      // the Resend quota, and drop a far more credible phishing message
      // into the flood. This is a path *allowlist*: every route under
      // either prefix is blocked outright except send-verification-otp,
      // which instead falls through to the existing per-email allowlist
      // check below.
      //
      // Short-circuiting with the endpoint's own `{ success: true }` shape
      // keeps the HTTP response byte-identical to a real send (no
      // enumeration signal) and does no extra work on either branch (no
      // timing signal). Router-level rate limiting (see rateLimit above)
      // still runs before hooks.before, so every path here stays
      // rate-limited exactly like every other request.
      before: createAuthMiddleware(async (ctx) => {
        const isEmailOtpOrForgetPasswordPath =
          ctx.path.startsWith('/email-otp/') ||
          ctx.path.startsWith('/forget-password/');
        if (!isEmailOtpOrForgetPasswordPath) {
          return;
        }
        if (ctx.path !== '/email-otp/send-verification-otp') {
          return ctx.json({ success: true });
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
        async sendVerificationOTP({ email, otp, type }) {
          // This app only ever offers sign-in-by-code, never
          // email-verification, forget-password, or change-email OTPs. The
          // `before` hook above blocks every route except
          // /email-otp/send-verification-otp, but that one remaining route
          // still accepts an attacker-supplied `type` in its own request
          // body, and better-auth calls this callback (and would email a
          // real, correctly-branded code) for whichever type is asked for.
          // Rejecting anything but 'sign-in' here closes that regardless
          // of which path called it.
          if (type !== 'sign-in') {
            return;
          }
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
