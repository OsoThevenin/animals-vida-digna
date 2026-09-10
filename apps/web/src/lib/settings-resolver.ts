/**
 * Pure, dependency-free settings-resolution logic.
 *
 * Shared by:
 *  - scripts/generate-settings.ts (Node/build-time context — reads the Keystatic
 *    `settings` singleton via the filesystem reader and resolves the final
 *    contactEmail before writing src/generated/settings.ts)
 *  - anything else that needs the same fallback behaviour without importing
 *    @keystatic/core (and therefore node:fs).
 *
 * This module must never import @keystatic/core or node:fs — it is safe to
 * bundle into the Cloudflare Worker.
 */

export const DEFAULT_CONTACT_EMAIL = 'info@animalsvidadigna.org';
export const DEFAULT_DONATE_URL = '#';

/** Minimal shape of the Keystatic `settings` singleton relevant here. */
export interface RawSettingsInput {
  contactEmail?: string | null;
  donateUrl?: string | null;
}

/**
 * Resolve the shelter contact email from a (possibly partial/missing) settings
 * object, falling back to DEFAULT_CONTACT_EMAIL when contactEmail is missing,
 * null, or an empty string.
 */
export function resolveContactEmail(
  settings: RawSettingsInput | null | undefined
): string {
  return settings?.contactEmail || DEFAULT_CONTACT_EMAIL;
}

/**
 * Resolve the donation URL from a (possibly partial/missing) settings
 * object, falling back to DEFAULT_DONATE_URL when donateUrl is missing,
 * null, or an empty string.
 */
export function resolveDonateUrl(
  settings: RawSettingsInput | null | undefined
): string {
  return settings?.donateUrl || DEFAULT_DONATE_URL;
}
