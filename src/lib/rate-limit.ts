/**
 * Shared Cloudflare Rate Limiting binding check for public form endpoints
 * (contact, adoption). Extracted so both endpoints share one implementation
 * instead of duplicating the binding-lookup and error-handling logic.
 *
 * Fail-open/fail-closed decision (deliberate, not accidental):
 *
 * This guards a public contact/adoption form for a small animal shelter —
 * not an auth, payment, or otherwise high-value endpoint. If the rate
 * limiter binding is missing, or Cloudflare's rate-limit API throws, we
 * fail OPEN (let the request through) rather than fail CLOSED (block it).
 * Failing closed here would mean a transient Cloudflare hiccup, or running
 * `astro dev` locally without Cloudflare bindings, silently blocks every
 * legitimate adopter trying to reach the shelter — a worse outcome than a
 * short burst of unthrottled traffic, which is still bounded by the
 * honeypot check and Cloudflare's edge-level abuse protections.
 *
 * The bug this replaces was not "fail open" — fail open was a reasonable
 * choice. The bug was that it failed open *silently*: a missing binding
 * and a working one were indistinguishable, so the failure was invisible
 * in production. Every fail-open path here is logged, so an operator
 * watching `wrangler tail` (or any log sink) can see it happening.
 */

export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; status: 429 };

export interface RateLimitCheckContext {
  locals: unknown;
  request: Request;
}

/**
 * Extracts `context.locals.runtime.env` defensively — the Cloudflare
 * adapter shape — without throwing if any part of the chain is missing
 * (e.g. running under `astro dev` without the Cloudflare runtime).
 */
function extractRuntimeEnv(locals: unknown): Record<string, unknown> | undefined {
  if (!locals || typeof locals !== 'object' || !('runtime' in locals)) {
    return undefined;
  }
  const runtime = (locals as { runtime?: unknown }).runtime;
  if (!runtime || typeof runtime !== 'object' || !('env' in runtime)) {
    return undefined;
  }
  const env = (runtime as { env?: unknown }).env;
  return env && typeof env === 'object'
    ? (env as Record<string, unknown>)
    : undefined;
}

/**
 * Checks the named Cloudflare Rate Limit binding for the current request.
 * Keys on `cf-connecting-ip`. See module doc comment for the fail-open
 * reasoning.
 */
export async function checkRateLimit(
  context: RateLimitCheckContext,
  bindingName = 'FORM_RATE_LIMITER'
): Promise<RateLimitDecision> {
  const env = extractRuntimeEnv(context.locals);
  const rateLimiter = env?.[bindingName] as RateLimitBinding | undefined;

  if (!rateLimiter) {
    // Explicit, logged, deliberate path — not an accident. Expected in
    // local `astro dev` (no Cloudflare runtime); unexpected anywhere the
    // binding should be configured (e.g. production).
    console.warn(
      `[rate-limit] "${bindingName}" binding not available on this request — skipping rate limiting. Expected in local dev; investigate if seen in a deployed environment.`
    );
    return { allowed: true };
  }

  try {
    const clientIp =
      context.request.headers.get('cf-connecting-ip') || 'unknown';
    const result = await rateLimiter.limit({ key: clientIp });
    if (!result.success) {
      return { allowed: false, status: 429 };
    }
    return { allowed: true };
  } catch (error) {
    // Never swallow silently — log and fail open (see module doc comment).
    console.error(
      `[rate-limit] "${bindingName}".limit() threw — failing open for this request`,
      error
    );
    return { allowed: true };
  }
}
