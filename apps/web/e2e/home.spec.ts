import { expect, test } from '@playwright/test';

test.describe('home page (Catalan)', () => {
  test('renders the hero, header and returns 200 with no console errors', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    // Header landmark with the site name link. (The desktop nav links and
    // the mobile menu are viewport-dependent — one of the two is always
    // hidden from the accessibility tree, so they're covered separately
    // rather than asserted here across both desktop and mobile projects.)
    const header = page.getByRole('banner');
    await expect(header).toBeVisible();
    await expect(
      header.getByRole('link', { name: 'Animals Vida Digna' })
    ).toBeVisible();

    // Hero heading, from src/content/landing/home.yaml's `title_ca`.
    await expect(
      page.getByRole('heading', { level: 1, name: 'Doneu una llar a un gat' })
    ).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });
});
