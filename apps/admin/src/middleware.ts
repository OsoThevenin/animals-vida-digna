import { defineMiddleware } from 'astro:middleware';
import { createAuth } from './lib/auth';
import { isPublicPath } from './lib/is-public-path';

export const onRequest = defineMiddleware(async (context, next) => {
  const auth = createAuth(context.locals.runtime.env);
  const result = await auth.api.getSession({
    headers: context.request.headers,
  });
  context.locals.user = result?.user ?? null;
  context.locals.session = result?.session ?? null;

  if (isPublicPath(context.url.pathname)) {
    return next();
  }
  if (!context.locals.user) {
    return context.redirect('/login');
  }
  return next();
});
