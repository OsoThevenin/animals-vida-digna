import { expect, test } from '@playwright/test';

const pages = ['/', '/es', '/cats', '/es/cats', '/contact', '/es/contact'];

test.describe('accessibility sanity', () => {
  for (const path of pages) {
    test(`${path} has exactly one h1`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    });
  }

  test('the skip-to-content link is the first focusable element and is focusable', async ({
    page,
  }) => {
    await page.goto('/');

    const skipLink = page.getByRole('link', { name: 'Saltar al contingut' });
    // Off-screen (sr-only) until focused, per BaseLayout.astro's
    // `sr-only focus:not-sr-only` classes.
    await expect(skipLink).toBeAttached();

    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();

    // Activating it should move focus into the main content landmark.
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeVisible();
  });
});
