import * as schema from '@avd/content/schema';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { emailOTP } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { drizzle } from 'drizzle-orm/d1';
import { Resend } from 'resend';
import { isAllowedEmail, parseAllowedEmails } from './allowlist';
import { assertAuthEnv } from './auth-env';
import { buildOtpEmail } from './otp-email';

/**
 * M2 (security review, phase-4-security-review.md): better-auth 1.7.2's
 * own throttle on this endpoint (getDefaultSpecialRules() in
 * better-auth/dist/api/rate-limiter/index.mjs — window: 60, max: 3) is
 * keyed by `createRateLimitKey(ip, path)`, never by the request body's
 * `email`. An attacker with many IPs can still flood one known
 * allowlisted volunteer's inbox at up to 3 sends per IP per minute, burn
 * the Resend quota, and hammer D1 — and every genuine code in that flood
 * makes a phishing email dropped alongside it more credible. This second,
 * address-keyed counter closes that regardless of how many IPs the
 * caller has.
 *
 * 5 sends per 5-minute window: the OTP itself expires after 5 minutes
 * (see `expiresIn: 300` on the emailOTP plugin below), so a volunteer who
 * mistypes the code or whose first email is slow has headroom to request
 * a fresh one inside that same window without ever touching this limit —
 * in practice a real sign-in is 1 send, occasionally 2. 5 per 5 minutes
 * caps the worst case at ~1,440 emails/day to one address regardless of
 * how many IPs an attacker rotates through, down from unbounded.
 *
 * Storage: reuses the existing `rate_limit` table (same shape a counter
 * needs: key/count/lastRequest) instead of adding a table, so no new
 * migration has to be hand-applied to production D1. The key is
 * namespaced (`email-otp-address:`) so it can never collide with
 * better-auth's own `createRateLimitKey(ip, path)` keys in the same
 * table.
 *
 * Write cost: exactly one read + at most one write to `rate_limit` per
 * send-verification-otp request, the same bounded, O(1)-per-request cost
 * the existing per-IP throttle already pays on every request to this
 * app — never unbounded, so this does not put the D1 free-tier
 * 100k-writes/day budget at any additional risk.
 *
 * Anti-enumeration: this check runs, and writes to the counter, for
 * *every* request to this path — allowlisted or not — before the
 * allowlist check below, and a throttled request returns the exact same
 * `{ success: true }` shape used for a non-allowlisted address and for a
 * genuine send. So whether a given address is allowlisted, throttled,
 * both, or neither is never observable from the response.
 *
 * Row pruning (fix-round-1 finding): this counter lives in the same
 * `rate_limit` table better-auth's own storage prunes itself.
 * `deleteExpiredRows` in `createDatabaseStorageWrapper`
 * (better-auth/dist/api/rate-limiter/index.mjs) issues a DELETE with no
 * key filter — `WHERE lastRequest < now - longestObservedWindow * 1000`
 * — over the *whole table*, so it can sweep this app's address rows
 * along with better-auth's own IP rows. `longestObservedWindow`
 * (`getConfiguredRateLimitWindows`, same file) is the max window across
 * `ctx.rateLimit.window`, the built-in special rules, any plugin rules,
 * and any *object-form* `rateLimit.customRules` entry. The
 * `customRules` entry below registers this endpoint's window at
 * `EMAIL_SEND_THROTTLE_WINDOW_SECONDS` for exactly this reason — without
 * it, `longestObservedWindow` would resolve to the built-in special
 * rule's 60s, and any row (including this counter's) older than 60s
 * would be pruned well before this counter's own 300s window should
 * have reset it, letting an attacker who paces requests ~65-70s apart
 * bypass the limit indefinitely. See
 * tests/otp-send-address-throttle-pruning.test.ts, which fails without
 * that `customRules` entry.
 */
const EMAIL_SEND_THROTTLE_WINDOW_MS = 5 * 60 * 1000;
const EMAIL_SEND_THROTTLE_WINDOW_SECONDS = EMAIL_SEND_THROTTLE_WINDOW_MS / 1000;
const EMAIL_SEND_THROTTLE_MAX = 5;

function emailSendThrottleKey(email: string): string {
  return `email-otp-address:${email.trim().toLowerCase()}`;
}

/**
 * Returns true if `email` may send now (and records the attempt), false
 * if it is currently throttled. Mirrors the fixed-window-with-restart
 * semantics of better-auth's own database rate-limit storage
 * (createDatabaseStorageWrapper in
 * better-auth/dist/api/rate-limiter/index.mjs): a denial never advances
 * `lastRequest`, so *this function's own logic* only resets a key once a
 * full EMAIL_SEND_THROTTLE_WINDOW_MS has elapsed since the last allowed
 * request. That guarantee depends on the row surviving that long —
 * which in turn depends on the `rateLimit.customRules` entry for this
 * path in `createAuth` keeping better-auth's own row-pruning window
 * (`longestObservedWindow`) at least this wide. See the block comment
 * above this section ("Row pruning") for why.
 */
async function consumeEmailSendThrottle(
  db: DrizzleD1Database<typeof schema>,
  email: string,
  now: number
): Promise<boolean> {
  const key = emailSendThrottleKey(email);
  const existing = (
    await db
      .select({
        count: schema.rateLimit.count,
        lastRequest: schema.rateLimit.lastRequest,
      })
      .from(schema.rateLimit)
      .where(eq(schema.rateLimit.key, key))
      .limit(1)
  )[0];

  if (!existing) {
    await db.insert(schema.rateLimit).values({
      id: crypto.randomUUID(),
      key,
      count: 1,
      lastRequest: now,
    });
    return true;
  }

  if (now - existing.lastRequest >= EMAIL_SEND_THROTTLE_WINDOW_MS) {
    await db
      .update(schema.rateLimit)
      .set({ count: 1, lastRequest: now })
      .where(eq(schema.rateLimit.key, key));
    return true;
  }

  if (existing.count >= EMAIL_SEND_THROTTLE_MAX) {
    return false;
  }

  await db
    .update(schema.rateLimit)
    .set({ count: existing.count + 1, lastRequest: now })
    .where(eq(schema.rateLimit.key, key));
  return true;
}

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
      customRules: {
        // Two purposes, both documented in the "Row pruning" comment
        // above consumeEmailSendThrottle: (1) registers a 300s window
        // for this path so better-auth's own row-pruning cutoff
        // (`longestObservedWindow`) is at least as wide as the
        // per-address counter's own window, so better-auth cannot prune
        // that counter's row out from under it early. (2) As an
        // unavoidable side effect (customRules keys and windows are not
        // separable in better-auth 1.7.2), this also replaces the
        // built-in per-IP rule for this exact path — 3 requests per IP
        // per 60s — with 3 per IP per 300s. That is *strictly stricter*
        // for a single IP, so it does not weaken the existing per-IP
        // protection; tests/otp-send-ip-throttle.test.ts was updated
        // (fix round 1) to assert the new 3-per-300s behaviour instead
        // of 3-per-60s.
        '/email-otp/send-verification-otp': {
          window: EMAIL_SEND_THROTTLE_WINDOW_SECONDS,
          max: 3,
        },
      },
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
        if (typeof email === 'string') {
          // Runs — and writes to the counter — for every address, not
          // just allowlisted ones, and returns the same shape on every
          // branch below. See the EMAIL_SEND_THROTTLE_* comment above
          // for why this can never become an enumeration oracle.
          const allowedToSendNow = await consumeEmailSendThrottle(
            db,
            email,
            Date.now()
          );
          if (!allowedToSendNow) {
            return ctx.json({ success: true });
          }
        }
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
