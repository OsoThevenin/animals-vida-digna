const REQUIRED_AUTH_ENV_VARS = [
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'RESEND_API_KEY',
  'AUTH_EMAIL_FROM',
  'ADMIN_ALLOWED_EMAILS',
] as const;

/**
 * Thrown by {@link assertAuthEnv} when a required secret/config value is
 * missing or blank. A generic `TypeError` (what `parseAllowedEmails`
 * throws on `undefined`, for example) does not say *which* binding is
 * missing, and `createAuth` runs on every request via src/middleware.ts —
 * so a forgotten secret is a total outage, including /login, with no clue
 * in the logs about which `wrangler secret put` was skipped.
 */
export class MissingAuthEnvVarError extends Error {
  constructor(name: string) {
    super(`Missing required admin auth environment variable: ${name}`);
    this.name = 'MissingAuthEnvVarError';
  }
}

/**
 * Thrown when `BETTER_AUTH_URL` is not a bare origin. better-auth compares
 * `trustedOrigins` against `getOrigin(url)` with exact string equality, so
 * a trailing slash or path (e.g. "https://admin.example.org/") would 403
 * every browser login while still looking fine to a health-check `curl`
 * that hits a path-less endpoint.
 */
export class InvalidBetterAuthUrlError extends Error {
  constructor(url: string) {
    super(
      'BETTER_AUTH_URL must be a bare origin — no trailing slash, no ' +
        `path — got "${url}"`
    );
    this.name = 'InvalidBetterAuthUrlError';
  }
}

/**
 * Fails loudly, at the very top of `createAuth`, instead of letting a
 * missing secret either 500 every request (a `TypeError` deep inside
 * `parseAllowedEmails`) or silently ship better-auth's published
 * fallback secret (`BETTER_AUTH_SECRET` omitted/blank), which lets anyone
 * forge a session cookie for any email.
 */
export function assertAuthEnv(env: Env): void {
  for (const name of REQUIRED_AUTH_ENV_VARS) {
    const value = env[name];
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new MissingAuthEnvVarError(name);
    }
  }
  assertBareOrigin(env.BETTER_AUTH_URL);
}

function assertBareOrigin(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new InvalidBetterAuthUrlError(url);
  }
  if (url !== parsed.origin) {
    throw new InvalidBetterAuthUrlError(url);
  }
}
