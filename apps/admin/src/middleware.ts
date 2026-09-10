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
    if (context.url.pathname.startsWith('/_actions/')) {
      // A 302 here is correct for a browser page load, but Astro's
      // client action helper (node_modules/astro/dist/actions/runtime/
      // virtual.js) follows redirects and treats a 200 response (the
      // login page) as a successful action result, then tries to
      // `devalueParse` its HTML — an uncaught throw no call site
      // handles. Returning a JSON body shaped exactly like
      // `deserializeActionResult`'s error branch expects (see
      // node_modules/astro/dist/actions/runtime/shared.js,
      // `ActionError.fromJson`/`isActionError`) makes `rawResult.ok`
      // false instead, so the helper deserializes a real ActionError
      // and the app's `describeActionError` renders it in Catalan.
      return new Response(
        JSON.stringify({
          type: 'AstroActionError',
          code: 'UNAUTHORIZED',
          message: 'Cal iniciar sessió (session required).',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    return context.redirect('/login');
  }
  return next();
});
