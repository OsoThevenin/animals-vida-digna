import { expect, test } from '@playwright/test';

/**
 * Fix 1 (LanguageSwitcher redirect trap on cat pages): cats have genuinely
 * different CA and ES slugs (slug_ca / slug_es -- "lluna" / "luna" for the
 * seeded Lluna cat, see packages/content/tests/fixtures/cats/lluna.yaml).
 * LanguageSwitcher used to recompute its target URL with the generic
 * `/es` path-prefix swap (getAlternateUrl()), which produces `/es/cat/lluna`
 * -- a slug that matches no ES cat, so (since the M5 fix that turned an
 * unknown-slug lookup into a real 404 instead of a redirect) clicking ES
 * from a cat page 404s. BaseLayout.astro already computes the correct
 * per-cat alternate URL for its <link rel="alternate">; the fix threads
 * that value down to LanguageSwitcher instead of letting it recompute.
 *
 * Uses the same local-D1 E2E fixture as e2e/cats-d1.spec.ts (Lluna/Luna).
 */
test.describe('language switcher on a cat detail page (redirect-trap fix)', () => {
  test('CA -> ES lands on the Spanish cat page (200, correct Spanish name), not a 404', async ({
    page,
  }) => {
    const response = await page.goto('/cat/lluna');
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Lluna' })
    ).toBeVisible();

    const [esResponse] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.request().isNavigationRequest() &&
          res.url().includes('/es/cat/luna') &&
          res.status() < 300
      ),
      page.getByRole('link', { name: /Castellano/ }).click(),
    ]);

    expect(esResponse.status()).toBe(200);
    await expect(page).toHaveURL(/\/es\/cat\/luna\/?$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Luna' })
    ).toBeVisible();
  });

  test('ES -> CA lands on the Catalan cat page (200, correct Catalan name), not a 404', async ({
    page,
  }) => {
    const response = await page.goto('/es/cat/luna');
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Luna' })
    ).toBeVisible();

    const [caResponse] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.request().isNavigationRequest() &&
          res.url().includes('/cat/lluna') &&
          res.status() < 300
      ),
      page.getByRole('link', { name: /Catala/ }).click(),
    ]);

    expect(caResponse.status()).toBe(200);
    await expect(page).toHaveURL(/\/cat\/lluna\/?$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Lluna' })
    ).toBeVisible();
  });
});
