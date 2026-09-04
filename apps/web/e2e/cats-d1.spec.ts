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

const ALLOWED_WIDTHS = ['320', '640', '960', '1280'];

function assertImagesOrigin(src: string) {
  expect(src.startsWith('https://images.animalsvidadigna.org/cdn-cgi/image/')).toBe(
    true
  );
  expect(src).toContain('fit=scale-down');
  const widthMatch = src.match(/width=(\d+)/);
  expect(widthMatch).not.toBeNull();
  expect(ALLOWED_WIDTHS).toContain(widthMatch?.[1]);
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
    await page.goto('/cats');
    await page.getByRole('link', { name: /Lluna/ }).click();

    await expect(page).toHaveURL(/\/cat\/lluna\/?$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Lluna' })
    ).toBeVisible();

    // Description (Markdoc source rendered via renderMarkdocSource).
    await expect(page.locator('.prose')).toBeVisible();

    // Cover image, rendered through OptimizedImage's r2Key path.
    const coverImg = page.getByRole('article').getByRole('img').first();
    await expect(coverImg).toBeVisible();
    const src = await coverImg.getAttribute('src');
    expect(src).not.toBeNull();
    assertImagesOrigin(src as string);
  });
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
