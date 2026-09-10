import { expect, test } from '@playwright/test';

test.describe('Spanish locale and language switcher', () => {
  test('/es renders the Spanish home page', async ({ page }) => {
    const response = await page.goto('/es');
    expect(response?.status()).toBe(200);

    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Dale un hogar a un gato' })
    ).toBeVisible();
  });

  test('language switcher deep-links / to /es and back', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ca');

    // The switcher shows the *target* language's label ("Castellano" while
    // on the Catalan site).
    await page.getByRole('link', { name: /Castellano/ }).click();
    await expect(page).toHaveURL(/\/es\/?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');

    await page.getByRole('link', { name: /Catala/ }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ca');
  });

  test('language switcher deep-links /cats to /es/cats and back', async ({
    page,
  }) => {
    await page.goto('/cats');
    await page.getByRole('link', { name: /Castellano/ }).click();
    await expect(page).toHaveURL(/\/es\/cats\/?$/);

    await page.getByRole('link', { name: /Catala/ }).click();
    await expect(page).toHaveURL(/\/cats\/?$/);
  });
});
