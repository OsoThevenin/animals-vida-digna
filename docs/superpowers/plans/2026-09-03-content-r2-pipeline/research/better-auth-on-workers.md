# better-auth on Astro 5 + Cloudflare Workers + D1 (researched 2026-09-03)

Versions confirmed on npm: `better-auth@1.7.2`, `@better-auth/drizzle-adapter@1.7.2`.
Docs: https://www.better-auth.com/docs

## 1. Astro integration

```ts
// src/pages/api/auth/[...all].ts
import type { APIRoute } from 'astro';
export const prerender = false;
export const ALL: APIRoute = async (ctx) => {
  const auth = createAuth(ctx.locals.runtime.env);      // see §2
  ctx.request.headers.set('x-forwarded-for', ctx.clientAddress); // for rate limiting
  return auth.handler(ctx.request);
};
```

```ts
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
export const onRequest = defineMiddleware(async (context, next) => {
  const auth = createAuth(context.locals.runtime.env);
  const result = await auth.api.getSession({ headers: context.request.headers });
  context.locals.user = result?.user ?? null;
  context.locals.session = result?.session ?? null;
  return next();
});
```

```ts
// src/env.d.ts additions
declare namespace App {
  interface Locals extends Runtime {
    user: import('better-auth').User | null;
    session: import('better-auth').Session | null;
  }
}
```
https://www.better-auth.com/docs/integrations/astro

## 2. Running on Workers — per-request instance

- `nodejs_compat` is **required** (better-auth uses `AsyncLocalStorage`). Already set in `wrangler.toml`.
- `@astrojs/cloudflare` v12 exposes bindings only per request (`locals.runtime.env`), so build the instance in a factory and call it from the auth route and middleware. `betterAuth()` is a cheap synchronous factory; no first-party doc forbids per-request construction (community-standard pattern; *unverified against a first-party doc*).
- Set `baseURL`, `secret`, `trustedOrigins` explicitly from env — no auto-detection at the edge.

```ts
// src/lib/auth.ts
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { emailOTP } from 'better-auth/plugins';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { drizzle } from 'drizzle-orm/d1';
import { Resend } from 'resend';
import * as schema from '@avd/content/schema';

export function createAuth(env: Env) {
  const allowed = new Set(
    env.ADMIN_ALLOWED_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  );
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL],
    database: drizzleAdapter(drizzle(env.DB, { schema }), { provider: 'sqlite', schema }),
    rateLimit: { enabled: true, storage: 'database' },
    advanced: {
      useSecureCookies: true,
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (!allowed.has(user.email.toLowerCase())) {
              throw new APIError('FORBIDDEN', { message: 'Email not authorised.' });
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
          if (!allowed.has(email.toLowerCase())) return; // never email strangers
          const resend = new Resend(env.RESEND_API_KEY);
          await resend.emails.send({
            from: env.AUTH_EMAIL_FROM,
            to: [email],
            subject: 'Codi d\'accés / Código de acceso',
            text: `Codi: ${otp} (5 min)`,
          });
        },
      }),
    ],
  });
}
```

## 3. D1 + Drizzle

- `database` also accepts a raw `D1Database` (better-auth bundles a Kysely D1 dialect). This plan uses the **Drizzle adapter** so one Drizzle schema (`packages/content`) covers app tables and auth tables, and one tool (`drizzle-kit generate`) emits all SQL migrations, applied with `wrangler d1 migrations apply`.
- Generate the auth tables into the Drizzle schema once: `npx @better-auth/cli generate --config <path-to-auth-config>` (writes `user`, `session`, `account`, `verification`, and `rateLimit` when `rateLimit.storage = 'database'`).
- Core tables (1.7.x): `user`(id, name, email unique, emailVerified, image, createdAt, updatedAt); `session`(id, userId, token unique, expiresAt, ipAddress, userAgent, createdAt, updatedAt); `account`(id, userId, issuer, accountId, providerId, tokens…, password, createdAt, updatedAt); `verification`(id, identifier, value, expiresAt, createdAt, updatedAt).
- drizzle-kit config for D1: `dialect: 'sqlite'`, `driver: 'd1-http'` is only needed for `push`; for `generate` (SQL from schema diff) no credentials are needed. https://orm.drizzle.team/docs/connect-cloudflare-d1

## 4. `emailOTP` plugin

Server options: `otpLength` (6), `expiresIn` (300 s), `allowedAttempts` (3 → `TOO_MANY_ATTEMPTS`), `disableSignUp` (false), `resendStrategy` (`rotate`|`reuse`).
Client:
```ts
import { createAuthClient } from 'better-auth/client';
import { emailOTPClient } from 'better-auth/client/plugins';
export const authClient = createAuthClient({ plugins: [emailOTPClient()] });
await authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' });
await authClient.signIn.emailOtp({ email, otp });
await authClient.signOut();
```
Allowlist: `databaseHooks.user.create.before` throwing `APIError` fires on every user-creation path (first OTP sign-in included). Keep `disableSignUp: false` so allowlisted first-timers get a row.
https://www.better-auth.com/docs/plugins/email-otp

## 5. Resend from a Worker

`resend` npm uses `fetch`; officially documented for Workers. `new Resend(env.RESEND_API_KEY).emails.send({ from, to, subject, text|html })`.
https://resend.com/docs/send-with-cloudflare-workers

## 6. Cookies

Admin UI and its `/api/auth/*` share one host (`admin.animalsvidadigna.org`) → default first-party cookies. `advanced.useSecureCookies: true` forces `Secure` (in dev over http use `false` via an env flag). `crossSubDomainCookies` is not needed.
https://www.better-auth.com/docs/concepts/cookies

## 7. Rate limiting

Defaults: 100 req / 60 s; `/sign-in/*` paths stricter. In-memory storage is documented as unsuitable for serverless → `storage: 'database'` (needs the `rateLimit` table) and `ipAddressHeaders: ['cf-connecting-ip']`.
https://www.better-auth.com/docs/concepts/rate-limit

## Gotchas

1. Adapter v12: no module-scope bindings → `createAuth(env)` per request.
2. `nodejs_compat` mandatory.
3. Forward `ctx.clientAddress` as `x-forwarded-for` in the auth route or IP-based limits silently degrade.
4. `sendVerificationOTP` must itself check the allowlist; the create-hook only runs at user creation.
5. Secrets: `BETTER_AUTH_SECRET` (`openssl rand -hex 32`), `BETTER_AUTH_URL`, `RESEND_API_KEY`, `ADMIN_ALLOWED_EMAILS`, `AUTH_EMAIL_FROM` — all `wrangler secret put`, mirrored in `.dev.vars` locally.
6. Cookies over plain http in `astro dev` need `useSecureCookies: false` — gate it on `env.AUTH_INSECURE_COOKIES === '1'`.
