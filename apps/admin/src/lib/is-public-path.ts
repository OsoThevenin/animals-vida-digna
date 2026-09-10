const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/api/auth/',
  '/_astro/',
  '/favicon.ico',
];

/**
 * Routes that never require a session: the login page itself, the
 * better-auth handler (it issues/validates sessions, so it cannot require
 * one), build-time static assets, and the favicon. Everything else is
 * gated by src/middleware.ts.
 */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
