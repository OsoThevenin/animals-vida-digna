-- E2E-only fixture data: gives the seeded "Lluna" cat a real cover image so
-- Playwright can assert on the actual R2/Cloudflare-Images URL shape
-- OptimizedImage renders on a cat page (see e2e/cats-d1.spec.ts).
--
-- packages/content's real fixture cats (packages/content/tests/fixtures/cats)
-- deliberately have no images -- packages/content/tests/seed-idempotency.test.ts
-- asserts that "today's real fixtures have no cover image / empty galleries"
-- -- so this lives in apps/web/e2e/fixtures instead of being folded into that
-- shared fixture data.
--
-- Apply once against local D1 after migrations + the regular seed
-- (packages/content/seed.sql) have been applied:
--   pnpm --filter web exec wrangler d1 execute avd-content --local \
--     --file e2e/fixtures/seed-e2e-image.sql
--
-- Looked up by slug rather than a hardcoded cat id, so it survives a
-- reseed (seed:generate/seed.sql assigns a fresh nanoid to each cat every
-- run). Idempotent: INSERT OR IGNORE on a fixed image id, UPDATE is a no-op
-- if already applied.
--
-- width/height are deliberately 1500x1125, NOT 1280x960: 1280 is the one
-- intrinsic width that also happens to be an allowlisted Cloudflare Images
-- transform width, which made the C2 defect (using the intrinsic width
-- directly as the transform width) invisible to this suite. 1500 is a
-- realistic stored width within Phase 5's MAX_UPLOAD_EDGE=2000 bound and is
-- NOT one of the four widths the production WAF rule allowlists, so the
-- rendered <img src> must differ from the intrinsic width (see
-- optimized-image-url.ts's pickAllowlistedTransformWidth).
INSERT OR IGNORE INTO cat_images (id, cat_id, r2_key, alt_ca, alt_es, width, height, position, created_at)
SELECT 'e2e-test-img-1', id, 'cats/' || id || '/e2e-test-img-1.webp', 'Lluna, gata siames disponible per adopcio', 'Luna, gata siames disponible para adopcion', 1500, 1125, 0, '2026-09-04T00:00:00.000Z'
FROM cats WHERE slug_ca = 'lluna';

-- A second, non-cover image so the gallery (which excludes the cover -- see
-- packages/content/src/localize.ts) has something to assert an image URL
-- against in e2e/cats-d1.spec.ts.
INSERT OR IGNORE INTO cat_images (id, cat_id, r2_key, alt_ca, alt_es, width, height, position, created_at)
SELECT 'e2e-test-img-2', id, 'cats/' || id || '/e2e-test-img-2.webp', 'Lluna jugant', 'Luna jugando', 640, 480, 1, '2026-09-04T00:00:00.000Z'
FROM cats WHERE slug_ca = 'lluna';

UPDATE cats SET cover_image_id = 'e2e-test-img-1' WHERE slug_ca = 'lluna';
