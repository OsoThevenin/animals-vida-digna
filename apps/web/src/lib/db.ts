import { createDb, type Db } from '@avd/content/cats';
import type { D1Database } from '@cloudflare/workers-types';

function extractRuntimeEnv(
  locals: unknown
): Record<string, unknown> | undefined {
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
 * Returns a Drizzle D1 client bound to the `DB` binding declared in
 * wrangler.toml, or undefined if the binding is not present (e.g. a route
 * rendered outside a Cloudflare runtime context, or the binding not yet
 * configured locally). Callers are on-demand-rendered pages/islands that
 * already run inside a Cloudflare Worker context, so an undefined result
 * signals a misconfiguration to surface, not a normal fallback path.
 */
export function getDb(locals: unknown): Db | undefined {
  const env = extractRuntimeEnv(locals);
  const d1 = env?.DB;
  if (!d1) return undefined;
  return createDb(d1 as D1Database);
}

/**
 * Same as getDb, but throws instead of returning undefined. Every on-demand
 * page/island in Phase 3 runs inside a real Cloudflare Worker context where
 * the DB binding is always configured, so a missing binding here means
 * misconfiguration (wrangler.toml, or platformProxy in dev) -- fail loudly
 * rather than let `undefined` propagate into a repository call.
 */
export function requireDb(locals: unknown): Db {
  const db = getDb(locals);
  if (!db) {
    throw new Error('D1 binding "DB" is not available');
  }
  return db;
}
