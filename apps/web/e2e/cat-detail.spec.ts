import { expect, test } from '@playwright/test';
import { assertCanonicalTransformUrl } from './support/assert-canonical-transform-url';

test.describe('cat detail page (reached by clicking through from /cats)', () => {
  test('renders the clicked cat title and its back link', async ({ page }) => {
    await page.goto('/cats');
    await page.getByRole('link', { name: /Misi/ }).click();

    await expect(page).toHaveURL(/\/cat\/misi\/?$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Misi' })
    ).toBeVisible();

    await expect(
      page.getByRole('link', { name: /Tornar a tots els gats/ })
    ).toBeVisible();

    // Misi is "available" in the seed data, so the adoption inquiry form
    // should render.
    await expect(
      page.getByRole('heading', { level: 2, name: /Sol·licitud d'adopcio/ })
    ).toBeVisible();
  });

  // Re-enabled by Task 11 (Phase 5 Deferred Verification item 4). Misi's
  // own packages/content fixture still has `coverImage.src: null` /
  // `gallery: []` (no real photo of this cat exists yet -- a genuine
  // content gap, not an application bug), so this asserts against
  // e2e/fixtures/seed-e2e-image.sql's e2e-test-img-3 (cover, 1500x1125,
  // NOT an allowlisted width) / e2e-test-img-4 (gallery, 640x480,
  // already allowlisted) — the same synthetic-but-real-shape pattern
  // already used for Lluna in e2e/cats-d1.spec.ts. Pins the exact
  // canonical WAF transform URL (see assertCanonicalTransformUrl), not
  // just "an <img> exists".
  test('renders the cover image and photo gallery', async ({ page }) => {
    await page.goto('/cat/misi');

    const coverImg = page.getByRole('article').getByRole('img').first();
    await expect(coverImg).toBeVisible();
    const coverSrc = await coverImg.getAttribute('src');
    expect(coverSrc).not.toBeNull();
    assertCanonicalTransformUrl(
      coverSrc as string,
      1280,
      'e2e-test-img-3.webp'
    );
    expect(await coverImg.getAttribute('width')).toBe('1500');

    await expect(
      page.getByRole('heading', { level: 2, name: 'Galeria' })
    ).toBeVisible();
    const galleryImg = page.locator('.lightbox img').first();
    await expect(galleryImg).toBeVisible();
    const gallerySrc = await galleryImg.getAttribute('src');
    expect(gallerySrc).not.toBeNull();
    assertCanonicalTransformUrl(
      gallerySrc as string,
      640,
      'e2e-test-img-4.webp'
    );
  });
});
