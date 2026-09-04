import { defineMiddleware } from 'astro:middleware';
import { isAllowedEmail, parseAllowedEmails } from './lib/allowlist';
import { createAuth } from './lib/auth';
import { isPublicPath } from './lib/is-public-path';

/**
 * Authorization, not just authentication: `getSession` only proves the
 * cookie is a *valid, unexpired* session — it says nothing about whether
 * this volunteer is still trusted. Sessions are rolling (better-auth bumps
 * `expiresAt` on every request older than `updateAge`), so once a user has
 * signed in, their cookie alone would otherwise keep authenticating forever,
 * even after a maintainer removes their address from
 * `ADMIN_ALLOWED_EMAILS` and redeploys. Re-checking the allowlist here, on
 * every request, is what actually revokes access in that case — the same
 * normalisation as the create-time gate in src/lib/auth.ts, via
 * src/lib/allowlist.ts, so behaviour matches exactly.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const auth = createAuth(context.locals.runtime.env);
  const result = await auth.api.getSession({
    headers: context.request.headers,
  });
  const allowed = parseAllowedEmails(
    context.locals.runtime.env.ADMIN_ALLOWED_EMAILS
  );
  const sessionUser =
    result?.user && isAllowedEmail(allowed, result.user.email)
      ? result.user
      : null;
  context.locals.user = sessionUser;
  context.locals.session = sessionUser ? (result?.session ?? null) : null;

  if (isPublicPath(context.url.pathname)) {
    return next();
  }
  if (!context.locals.user) {
    return context.redirect('/login');
  }
  return next();
});
