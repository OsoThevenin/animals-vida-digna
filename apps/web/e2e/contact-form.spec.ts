import { expect, test } from '@playwright/test';

test.describe('contact form validation', () => {
  test('submitting the empty form shows validation errors and never calls the API', async ({
    page,
  }) => {
    // Guard against ever hitting the real contact endpoint (and therefore
    // Resend) from this test: fail loudly if it happens instead of letting
    // it silently succeed or send an email.
    let apiCalled = false;
    await page.route('**/api/contact', (route) => {
      apiCalled = true;
      route.abort();
    });

    await page.goto('/contact');
    // ContactForm is a client:load Preact island — wait for it to hydrate
    // before clicking submit, otherwise the click can fire the browser's
    // native (un-handled) form submission instead of the app's onSubmit,
    // which would navigate away before any validation runs.
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Enviar' }).click();

    // Client-side validation (src/lib/validation.ts) blocks the submit
    // before any network call, and the form's `noValidate` means these
    // errors come from the app, not the browser's native bubble UI.
    await expect(page.getByText('Aquest camp es obligatori')).toHaveCount(3);

    // Still on the contact page — no navigation, no success state.
    await expect(page).toHaveURL(/\/contact\/?$/);
    await expect(page.getByRole('button', { name: 'Enviar' })).toBeVisible();
    expect(apiCalled).toBe(false);
  });

  test('an invalid email is flagged once the other fields are valid', async ({
    page,
  }) => {
    let apiCalled = false;
    await page.route('**/api/contact', (route) => {
      apiCalled = true;
      route.abort();
    });

    await page.goto('/contact');
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Nom *').fill('Test User');
    await page.getByLabel('Correu electronic *').fill('not-an-email');
    await page
      .getByLabel('Missatge *')
      .fill('Hola, aixo es un missatge de prova.');
    await page.getByRole('button', { name: 'Enviar' }).click();

    await expect(
      page.getByText('El correu electronic no es valid')
    ).toBeVisible();
    expect(apiCalled).toBe(false);
  });
});
