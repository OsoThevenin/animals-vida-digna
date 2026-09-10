import type { APIRoute } from 'astro';
import { createAuth } from '../../../lib/auth';

// better-auth's handler needs to run on every method (GET for OAuth
// callbacks the app does not use yet, POST for sign-in/verify/sign-out),
// so this route cannot be prerendered.
export const prerender = false;

/**
 * Fills in `cf-connecting-ip` from `ctx.clientAddress` so local dev exercises
 * the same header better-auth's database-backed rate limiter trusts
 * (src/lib/auth.ts sets `ipAddressHeaders: ['cf-connecting-ip']`). In
 * production Cloudflare sets this header itself, so the check-and-set here
 * only ever fills a gap that `astro dev` / a non-Cloudflare-fronted
 * `wrangler dev` request would otherwise leave empty — a real
 * Cloudflare-supplied value is never overwritten.
 *
 * Do NOT add `x-forwarded-for` to `ipAddressHeaders` in src/lib/auth.ts as a
 * "fix" for this instead: unlike `cf-connecting-ip` (which only Cloudflare's
 * edge can set on the way in), `X-Forwarded-For` is fully client-controlled,
 * so trusting it would let any caller spoof their rate-limit identity.
 * Confirmed by experiment: varying `X-Forwarded-For` across requests today
 * does not change the rate-limit key.
 *
 * `ctx.request.headers` is immutable under the real Workers runtime
 * (workerd) — calling `.set()` on it throws `TypeError: Can't modify
 * immutable headers.` in production and under `wrangler dev`, even though it
 * silently "works" under the Node-based `astro dev` server. Cloning into a
 * new Headers object (and a new Request that carries them) avoids mutating
 * the original.
 */
export function buildRequestWithTrustedIp(
  request: Request,
  clientAddress: string
): Request {
  const headers = new Headers(request.headers);
  if (!headers.has('cf-connecting-ip')) {
    headers.set('cf-connecting-ip', clientAddress);
  }
  return new Request(request, { headers });
}

export const ALL: APIRoute = async (ctx) => {
  const auth = createAuth(ctx.locals.runtime.env);
  const request = buildRequestWithTrustedIp(ctx.request, ctx.clientAddress);
  return auth.handler(request);
};
