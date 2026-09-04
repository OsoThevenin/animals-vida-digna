/**
 * Pure, dependency-free logic for deciding Keystatic's storage config from
 * environment variables.
 *
 * Local development ALWAYS uses local storage. Production ALWAYS uses the
 * GitHub storage kind. This module deliberately does NOT check for the
 * presence of `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`,
 * or `KEYSTATIC_SECRET` — that used to be validated here, but it was wrong.
 *
 * Those credentials are runtime secrets, not build-time config. Keystatic's
 * own Astro API route handler (compiled into
 * `dist/_worker.js/pages/api/keystatic/_---params_.astro.mjs`) resolves each
 * one at request time, in this order:
 *
 *   envVarsForCf = context.locals?.runtime?.env
 *   // then, per variable:
 *   envVarsForCf?.KEYSTATIC_GITHUB_CLIENT_ID
 *     ?? tryOrUndefined(() => process.env.KEYSTATIC_GITHUB_CLIENT_ID)
 *
 * i.e. it reads `locals.runtime.env` first — the same Cloudflare runtime env
 * chain `src/lib/rate-limit.ts` already handles — and only falls back to
 * `process.env`. They should be configured as `wrangler secret` runtime
 * bindings, not build-time env vars: never baked into the bundle, rotatable
 * without a rebuild.
 *
 * Runtime secrets do not exist during `astro build` (there is no
 * `locals.runtime` at build time), so validating them here would throw on
 * every correctly configured production build and block deployment instead
 * of protecting it. Do not re-add that validation — if credential
 * misconfiguration needs to be surfaced, do it at request time, where the
 * runtime env is actually available.
 */

export const KEYSTATIC_GITHUB_REPO = 'OsoThevenin/animals-vida-digna';
export const KEYSTATIC_GITHUB_BRANCH_PREFIX = 'content/';

export type KeystaticStorage =
  | { kind: 'local' }
  | { kind: 'github'; repo: string; branchPrefix: string };

/**
 * Extracts a usable env record from `unknown`, without throwing if it is
 * not an object at all (mirrors the defensive chain-walking in
 * `extractRuntimeEnv` in src/lib/rate-limit.ts, rather than assuming the
 * caller's shape).
 *
 * `import.meta.env` is a Vite-only construct. `keystatic.config.tsx` is
 * also imported under plain Node (via `tsx`) by `scripts/generate-settings.ts`
 * during the `prebuild` step, and by tests — in that context there is no
 * Vite env object at all, so `env` arrives as `undefined`. Being imported
 * outside of a Vite/Astro build is definitionally not a production Astro
 * build, so treating "no env object" as local storage is both safe and
 * correct.
 */
function asEnvRecord(env: unknown): Record<string, unknown> | undefined {
  return env && typeof env === 'object'
    ? (env as Record<string, unknown>)
    : undefined;
}

/**
 * Decide Keystatic's storage config from a (possibly untrusted/partial/
 * absent) env value. Never mutates the input, never throws.
 */
export function resolveKeystaticStorage(env: unknown): KeystaticStorage {
  const envRecord = asEnvRecord(env);

  if (!envRecord || !envRecord.PROD) {
    return { kind: 'local' };
  }

  return {
    kind: 'github',
    repo: KEYSTATIC_GITHUB_REPO,
    branchPrefix: KEYSTATIC_GITHUB_BRANCH_PREFIX,
  };
}
