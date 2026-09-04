import { expect, test } from '@playwright/test';

// Current seed data (src/content/cats/*.yaml): 3 cats total —
// Misi (available), Lluna (available), Garfield (treatment). The filter
// island (src/components/cats/CatFilters.tsx) is client-rendered, so these
// interactions only prove anything when they run against real JS in a real
// browser — this is why the smoke suite covers it with Playwright rather
// than Vitest.
test.describe('/cats listing and filter', () => {
  test('lists all seeded cats', async ({ page }) => {
    const response = await page.goto('/cats');
    expect(response?.status()).toBe(200);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Gats' })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Misi/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Lluna/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Garfield/ })).toBeVisible();
  });

  test('the status filter narrows the visible list', async ({ page }) => {
    await page.goto('/cats');
    await page.waitForLoadState('networkidle');

    const statusFilter = page.getByLabel('Estat');
    await expect(statusFilter).toBeVisible();

    // Filtering to "En tractament" (treatment) should leave only Garfield.
    await statusFilter.selectOption({ label: 'En tractament' });
    await expect(page.getByRole('link', { name: /Garfield/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Misi/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Lluna/ })).toHaveCount(0);
    await expect(page.getByText('Mostrant 1')).toBeVisible();

    // Filtering to "Disponible" (available) should show Misi and Lluna, but
    // not Garfield.
    await statusFilter.selectOption({ label: 'Disponible' });
    await expect(page.getByRole('link', { name: /Misi/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Lluna/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Garfield/ })).toHaveCount(0);
    await expect(page.getByText('Mostrant 2')).toBeVisible();

    // Back to "Tots" (all) restores the full list.
    await statusFilter.selectOption({ label: 'Tots' });
    await expect(page.getByRole('link', { name: /Misi/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Lluna/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Garfield/ })).toBeVisible();
  });

  test('combining filters can produce zero results', async ({ page }) => {
    await page.goto('/cats');
    await page.waitForLoadState('networkidle');

    // Garfield is the only "treatment" cat and is male, not female — so
    // treatment + female should yield no results.
    await page.getByLabel('Estat').selectOption({ label: 'En tractament' });
    await page.getByLabel('Genere').selectOption({ label: 'Femella' });

    await expect(
      page.getByText("No s'han trobat gats amb aquests filtres.")
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Garfield/ })).toHaveCount(0);
  });
});
