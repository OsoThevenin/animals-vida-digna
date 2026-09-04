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
  // The R2 image pipeline (this phase) is implemented and works -- see
  // e2e/cats-d1.spec.ts's "renders title, description and cover image for a
  // cat with real image data" test, which asserts a real cover image on
  // /cat/lluna via e2e/fixtures/seed-e2e-image.sql (an E2E-only fixture:
  // packages/content's own seed fixtures deliberately carry no images, see
  // that SQL file's header for why).
  //
  // Misi specifically, and gallery images generally, still have no real
  // content: packages/content/tests/fixtures/cats/*.yaml (the source for
  // packages/content's `seed:generate`, migrated verbatim from the old
  // Keystatic `src/content/cats/*.yaml`) all have `coverImage.src: null`
  // and `gallery: []` — a genuine content/data gap, not an application bug.
  // OptimizedImage and CatGallery correctly render nothing when there's no
  // source (see the `{cat.coverImage && (...)}` / `{images.length > 0 &&
  // (...)}` guards in src/pages/cat/[slug].astro and
  // src/components/cats/CatGallery.astro). Kept fixme rather than asserted
  // against fabricated data; re-enable once a cat has a real gallery (e.g.
  // once a volunteer uploads photos through the admin app, Phase 5).
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
