const ALLOWED_PREFIX = 'cats/';

/**
 * `GET /r2/[...key]` streams R2 objects with no authentication — that is
 * acceptable only because it must never be reachable in a deployed Worker.
 * The route gates on `import.meta.env.DEV` (a build-time constant Vite
 * inlines and dead-code-eliminates against, so a production build cannot
 * serve this route no matter how the Worker's runtime env is configured)
 * and passes that value straight through here rather than re-deriving it,
 * so this function stays a plain, easily-tested predicate.
 */
export function isDevPreviewEnabled(dev: boolean): boolean {
  return dev === true;
}

/**
 * The requested key comes straight from the URL path. Reject anything
 * that is not a plain, relative path under the `cats/` prefix — no `..`
 * segments (bare, percent-encoded, or double-encoded), no absolute paths,
 * no backslashes, no empty/`.` segments, and nothing outside `cats/`.
 * Returns the decoded key on success, `null` on any rejection.
 */
export function resolveR2PreviewKey(rawKey: string | undefined): string | null {
  if (!rawKey) return null;
  if (rawKey.includes('\\')) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(rawKey);
  } catch {
    return null;
  }

  // Reject double-encoded traversal (e.g. `%252e%252e`) by decoding once
  // more and checking it did not change further — if it still contains a
  // percent-escape after one decode, decode again and compare against the
  // never-encoded `..`/`.` checks below on the fully-decoded form.
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // A single-encoded key with a literal, undecodable `%` left over is
    // fine to leave as-is — the segment checks below still apply to it.
  }

  if (decoded.includes('\\')) return null;
  if (decoded.startsWith('/')) return null;
  if (!decoded.startsWith(ALLOWED_PREFIX)) return null;

  const segments = decoded.split('/');
  const hasUnsafeSegment = segments.some(
    (segment) => segment === '' || segment === '.' || segment === '..'
  );
  if (hasUnsafeSegment) return null;

  return decoded;
}
