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
 *
 * `pathPrefix` was added when the repo became a monorepo (this app moved to
 * `apps/web`, plan: docs/superpowers/plans/2026-09-03-content-r2-pipeline).
 * Keystatic's GitHub storage mode reads and writes content relative to the
 * repo root by default; `pathPrefix` scopes every read/write to a
 * subdirectory of the repo instead — see
 * https://keystatic.com/docs/github-mode (monorepo / path prefix section)
 * and the `pathPrefix?: string` field on `CommonRemoteStorageConfig` in
 * `@keystatic/core`'s `src/config.ts`, shared by the `github` storage kind.
 * Without it, a volunteer's content PR would try to write to
 * `src/content/cats/...` at the repo root, which no longer exists.
 */

/**
 * `owner/name`, matching `@keystatic/core`'s `RepoConfig` (a
 * `${string}/${string}` template literal). Typed as that literal template
 * rather than plain `string` so a typo that drops the slash is a compile
 * error here instead of an opaque failure inside Keystatic's own type
 * checking of `config()`'s `storage.repo`.
 */
export const KEYSTATIC_GITHUB_REPO: `${string}/${string}` =
  'OsoThevenin/animals-vida-digna';
export const KEYSTATIC_GITHUB_BRANCH_PREFIX = 'content/';
export const KEYSTATIC_GITHUB_PATH_PREFIX = 'apps/web';

export type KeystaticStorage =
  | { kind: 'local' }
  | {
      kind: 'github';
      repo: `${string}/${string}`;
      branchPrefix: string;
      pathPrefix: string;
    };

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
    pathPrefix: KEYSTATIC_GITHUB_PATH_PREFIX,
  };
}
