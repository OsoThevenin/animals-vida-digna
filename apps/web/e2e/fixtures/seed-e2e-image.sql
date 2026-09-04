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
INSERT OR IGNORE INTO cat_images (id, cat_id, r2_key, alt_ca, alt_es, width, height, position, created_at)
SELECT 'e2e-test-img-1', id, 'cats/' || id || '/e2e-test-img-1.webp', 'Lluna, gata siames disponible per adopcio', 'Luna, gata siames disponible para adopcion', 1280, 960, 0, '2026-09-04T00:00:00.000Z'
FROM cats WHERE slug_ca = 'lluna';

UPDATE cats SET cover_image_id = 'e2e-test-img-1' WHERE slug_ca = 'lluna';
