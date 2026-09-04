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
  //
  // ctx.request.headers is immutable under the real Workers runtime
  // (workerd) — calling .set() on it throws `TypeError: Can't modify
  // immutable headers.` in production and under `wrangler dev`, even
  // though it silently "works" under the Node-based `astro dev` server.
  // Cloning into a new Headers object (and a new Request that carries
  // them) avoids mutating the original.
  const headers = new Headers(ctx.request.headers);
  headers.set('x-forwarded-for', ctx.clientAddress);
  const request = new Request(ctx.request, { headers });
  return auth.handler(request);
};
