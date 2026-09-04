import type { APIRoute } from 'astro';
import { createAuth } from '../../../lib/auth';

// better-auth's handler needs to run on every method (GET for OAuth
// callbacks the app does not use yet, POST for sign-in/verify/sign-out),
// so this route cannot be prerendered.
export const prerender = false;

export const ALL: APIRoute = async (ctx) => {
  const auth = createAuth(ctx.locals.runtime.env);
  // Forward the real client IP so better-auth's database-backed rate
  // limiter (ipAddressHeaders: ['cf-connecting-ip']) sees it — without
  // this, IP-based limits silently degrade to "every request looks like
  // the same client" behind the Workers runtime.
  ctx.request.headers.set('x-forwarded-for', ctx.clientAddress);
  return auth.handler(ctx.request);
};
