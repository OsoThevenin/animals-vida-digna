/**
 * Pure allowlist helpers shared by both places better-auth needs to check
 * "is this a volunteer we trust?": `emailOTP.sendVerificationOTP` (never
 * email a stranger) and `databaseHooks.user.create.before` (never create a
 * user row for a stranger, in case sendVerificationOTP's own check is ever
 * bypassed by a different auth flow). See src/lib/auth.ts.
 */
export function parseAllowedEmails(raw: string): Set<string> {
  return new Set(
    raw
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0)
  );
}

export function isAllowedEmail(
  allowed: Set<string>,
  email: string
): boolean {
  return allowed.has(email.trim().toLowerCase());
}
