import { expect, test } from '@playwright/test';

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

  // The plan asks this page to be checked for its cover image and gallery.
  // As of this suite, every cat in src/content/cats/*.yaml has
  // `coverImage.src: null` and `gallery: []` — there is no cat with real
  // image content yet. This is a content/data gap, not an application bug:
  // OptimizedImage and CatGallery correctly render nothing when there's no
  // source (see the `{cat.coverImage?.src && (...)}` / `{images.length > 0
  // && (...)}` guards in src/pages/cat/[slug].astro and
  // src/components/cats/CatGallery.astro). Marked fixme rather than
  // asserted against fabricated data; re-enable once a cat has real images
  // (e.g. after the R2 image pipeline work lands).
  test.fixme('renders the cover image and photo gallery', async ({ page }) => {
    await page.goto('/cat/misi');
    await expect(
      page.getByRole('article').getByRole('img').first()
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: 'Galeria' })
    ).toBeVisible();
  });
});
