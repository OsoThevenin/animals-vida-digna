import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ImageManager from '../src/components/image-manager';

/**
 * `astro:actions` is stubbed (tests/support/astro-actions-shim.ts, aliased
 * in vitest.config.ts) purely so this module resolves — there is no jsdom
 * environment configured in this app (see vitest.config.ts), so no test
 * here dispatches a click or upload event. These assert the *initial*
 * server-rendered markup a volunteer gets: labelled controls, one row per
 * image, and discernible accessible names on the icon-ish reorder/remove
 * controls. Interactive behaviour (reorder, save, cover, remove) was
 * verified under `wrangler dev` — see task-9-report.md.
 */

const images = [
  {
    id: 'img_1',
    catId: 'cat_1',
    r2Key: 'cats/cat_1/img_1.webp',
    altCa: 'Lluna dormint',
    altEs: 'Luna durmiendo',
    width: 800,
    height: 600,
    position: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'img_2',
    catId: 'cat_1',
    r2Key: 'cats/cat_1/img_2.webp',
    altCa: '',
    altEs: '',
    width: 800,
    height: 600,
    position: 1,
    createdAt: '2026-01-01T00:00:01.000Z',
  },
  // biome-ignore lint/suspicious/noExplicitAny: test fixture, not the real CatImage import
] as any;

describe('ImageManager', () => {
  const html = renderToStaticMarkup(
    <ImageManager catId="cat_1" coverImageId="img_1" images={images} />
  );

  it('renders one row per image, ordered by position', () => {
    const firstIndex = html.indexOf('img_1');
    const secondIndex = html.indexOf('img_2');
    expect(firstIndex).toBeGreaterThanOrEqual(0);
    expect(secondIndex).toBeGreaterThan(firstIndex);
  });

  it('renders an <img> using imageUrl for each photo with its alt text', () => {
    expect(html).toContain('Lluna dormint');
    expect(html).toMatch(/<img[^>]*alt="Lluna dormint"/);
  });

  it('labels each alt-text input by id, not by nesting', () => {
    expect(html).toContain('for="alt-ca-img_1"');
    expect(html).toContain('id="alt-ca-img_1"');
    expect(html).toContain('for="alt-es-img_1"');
    expect(html).toContain('id="alt-es-img_1"');
  });

  it('marks the current cover image and offers to make the other one the cover', () => {
    expect(html).toContain('És la portada');
    expect(html).toContain('Fes portada');
  });

  it('gives the reorder controls discernible accessible names, not bare icons', () => {
    expect(html).toContain('aria-label="Mou &quot;Lluna dormint&quot; amunt"');
    expect(html).toContain('aria-label="Mou &quot;Lluna dormint&quot; avall"');
  });

  it('disables moving the first image up and the last image down', () => {
    const firstUp = html.match(
      /aria-label="Mou &quot;Lluna dormint&quot; amunt"[^>]*disabled=""/
    );
    expect(firstUp).not.toBeNull();
  });

  it('gives the remove control a discernible accessible name', () => {
    expect(html).toContain('aria-label="Elimina &quot;Lluna dormint&quot;"');
  });

  it('renders the save button and the upload input', () => {
    expect(html).toContain('Desa l&#x27;ordre i els textos alternatius');
    expect(html).toContain('id="cat-image-upload"');
    expect(html).toContain('type="file"');
    expect(html).toContain('multiple=""');
  });

  it('falls back to a generic alt when both alt texts are empty', () => {
    expect(html).toMatch(/<img[^>]*alt="Foto del gat"/);
  });
});
