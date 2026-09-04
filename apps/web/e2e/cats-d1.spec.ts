import { expect, test } from '@playwright/test';

/**
 * Phase 3 (content-r2-pipeline): the /cats, /es/cats and /cat/[slug],
 * /es/cat/[slug] routes now render on demand from D1
 * (export const prerender = false), instead of Keystatic's filesystem
 * `cats` collection. This suite proves the D1-backed rendering end to end
 * against a real browser and a real Cloudflare Worker (wrangler dev), in
 * both locales, and pins the exact image URL shape a production WAF rule
 * now enforces (see e2e/fixtures/seed-e2e-image.sql and the parameter
 * check below).
 *
 * Seed data: packages/content/tests/fixtures/cats/*.yaml, seeded into local
 * D1 via `pnpm --filter @avd/content run seed:generate` +
 * `wrangler d1 execute avd-content --local --file ...`. "Lluna" additionally
 * gets a real cover image from e2e/fixtures/seed-e2e-image.sql (the shared
 * fixtures deliberately have none -- see that file for why).
 */

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
 */
function assertCanonicalTransformUrl(
  src: string,
  expectedWidth: 320 | 640 | 960 | 1280,
  keySuffix: string
) {
  const pattern = new RegExp(
    `^https://images\\.animalsvidadigna\\.org/cdn-cgi/image/width=${expectedWidth},fit=scale-down,quality=80,format=auto,onerror=redirect/cats/[^/]+/${keySuffix.replace('.', '\\.')}$`
  );
  expect(src).toMatch(pattern);
}

test.describe('/cats listing renders cats sourced from D1 (Catalan)', () => {
  test('lists the seeded cats with a 200 response', async ({ page }) => {
    const response = await page.goto('/cats');
    expect(response?.status()).toBe(200);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Gats' })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Misi/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Lluna/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Garfield/ })).toBeVisible();
  });

  test('the filter island narrows the D1-sourced list', async ({ page }) => {
    await page.goto('/cats');
    await page.waitForLoadState('networkidle');

    const statusFilter = page.getByLabel('Estat');
    await statusFilter.selectOption({ label: 'En tractament' });

    await expect(page.getByRole('link', { name: /Garfield/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Misi/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Lluna/ })).toHaveCount(0);
  });
});

test.describe('/es/cats listing renders cats sourced from D1 (Spanish)', () => {
  test('lists the seeded cats with a 200 response', async ({ page }) => {
    const response = await page.goto('/es/cats');
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('link', { name: /Misi/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Luna/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Garfield/ })).toBeVisible();
  });
});

test.describe('cat detail page reached by clicking through (D1-backed)', () => {
  test('renders title, description and cover image for a cat with real image data', async ({
    page,
  }) => {
    const response = await page.goto('/cats');
    expect(response?.status()).toBe(200);
    await page.getByRole('link', { name: /Lluna/ }).click();

    await expect(page).toHaveURL(/\/cat\/lluna\/?$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Lluna' })
    ).toBeVisible();

    // Description (Markdoc source rendered via renderMarkdocSource).
    await expect(page.locator('.prose')).toBeVisible();

    // Cover image (seeded intrinsic width 1500, NOT allowlisted -- see
    // e2e/fixtures/seed-e2e-image.sql), rendered through OptimizedImage's
    // r2Key path. C2 fix: transform width must be 1280 (the smallest
    // allowlisted width >= 1500 does not exist, so it falls back to the
    // largest), never the raw 1500.
    const coverImg = page.getByRole('article').getByRole('img').first();
    await expect(coverImg).toBeVisible();
    const coverSrc = await coverImg.getAttribute('src');
    expect(coverSrc).not.toBeNull();
    assertCanonicalTransformUrl(coverSrc as string, 1280, 'e2e-test-img-1.webp');

    // The intrinsic (non-allowlisted) width must still be exposed as the
    // HTML width attribute, so the browser can reserve layout space.
    expect(await coverImg.getAttribute('width')).toBe('1500');

    // JSON-LD schema.org image (C1 fix): always width=1280. BaseLayout
    // renders two <script type="application/ld+json"> tags -- the
    // Organization schema (first, no `image` field) and the cat's own
    // Thing schema (buildCatSchema) -- so find the one with `@type: Thing`.
    const jsonLdScripts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const catSchema = jsonLdScripts
      .map((text) => JSON.parse(text) as Record<string, unknown>)
      .find((schema) => schema['@type'] === 'Thing');
    expect(catSchema, 'expected a Thing (cat) JSON-LD schema on the page').not.toBeUndefined();
    assertCanonicalTransformUrl(
      catSchema?.image as string,
      1280,
      'e2e-test-img-1.webp'
    );

    // Gallery image (seeded intrinsic width 640, already allowlisted --
    // M8 fix: the gallery must exclude the cover image, so this is the
    // *second* seeded image, not a duplicate of the cover).
    const galleryImg = page.locator('.lightbox img').first();
    await expect(galleryImg).toBeVisible();
    const gallerySrc = await galleryImg.getAttribute('src');
    expect(gallerySrc).not.toBeNull();
    assertCanonicalTransformUrl(gallerySrc as string, 640, 'e2e-test-img-2.webp');
  });
});

test.describe('unknown or unpublished cat slug (M5 fix)', () => {
  test('/cat/[slug] returns a real 404, not a redirect', async ({ page }) => {
    const response = await page.goto('/cat/this-slug-does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page).toHaveURL(/\/cat\/this-slug-does-not-exist\/?$/);
  });

  test('/es/cat/[slug] returns a real 404, not a redirect', async ({
    page,
  }) => {
    const response = await page.goto('/es/cat/this-slug-does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page).toHaveURL(/\/es\/cat\/this-slug-does-not-exist\/?$/);
  });
});

test.describe('cache headers on the cat pages (M9 fix)', () => {
  for (const path of ['/cats', '/es/cats', '/cat/lluna', '/es/cat/luna']) {
    test(`${path} sets a short-TTL Cache-Control header`, async ({
      page,
    }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      const cacheControl = response?.headers()['cache-control'];
      expect(cacheControl).toBeDefined();
      expect(cacheControl).toMatch(/max-age=\d+/);
    });
  }
});

test.describe('sitemap-cats.xml', () => {
  test('returns 200, valid XML, with entries for both locales', async ({
    request,
  }) => {
    const response = await request.get('/sitemap-cats.xml');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/xml');

    const body = await response.text();
    expect(body).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(body).toContain('<urlset');
    expect(body).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');

    // At least one CA and one ES cat URL.
    expect(body).toMatch(/<loc>https:\/\/animalsvidadigna\.org\/cat\/[^<]+<\/loc>/);
    expect(body).toMatch(
      /<loc>https:\/\/animalsvidadigna\.org\/es\/cat\/[^<]+<\/loc>/
    );
  });
});
