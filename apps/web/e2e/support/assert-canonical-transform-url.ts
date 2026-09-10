import { expect } from '@playwright/test';

/**
 * Asserts the EXACT canonical transform URL string the production WAF rule
 * enforces (see phase-0-results.md, Findings §5):
 *   /cdn-cgi/image/width=<W>,fit=scale-down,quality=80,format=auto,onerror=redirect/<key>
 * in exactly this parameter order and with the exact expected width. A
 * reordered parameter list, a dropped parameter, or a non-allowlisted width
 * all return 403 to real visitors -- a prefix/membership check (the
 * previous version of this helper) would pass on any of those. The R2 key's
 * cat-id segment is matched with a wildcard since it is a per-seed-run
 * generated nanoid; everything else is pinned literally.
 *
 * Shared by e2e/cats-d1.spec.ts and e2e/cat-detail.spec.ts.
 */
export function assertCanonicalTransformUrl(
  src: string,
  expectedWidth: 320 | 640 | 960 | 1280,
  keySuffix: string
) {
  const pattern = new RegExp(
    `^https://images\\.animalsvidadigna\\.org/cdn-cgi/image/width=${expectedWidth},fit=scale-down,quality=80,format=auto,onerror=redirect/cats/[^/]+/${keySuffix.replace('.', '\\.')}$`
  );
  expect(src).toMatch(pattern);
}
