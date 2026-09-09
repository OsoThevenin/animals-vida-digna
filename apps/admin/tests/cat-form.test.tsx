import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CatForm from '../src/components/cat-form';

/**
 * `astro:actions` is stubbed (tests/support/astro-actions-shim.ts, aliased
 * in vitest.config.ts) purely so this module resolves — there is no jsdom
 * environment configured in this app (see vitest.config.ts), so no test
 * here dispatches a submit event or exercises `deriveSlugs`/error-mapping
 * wiring live. That wiring's own pure logic is covered by
 * tests/cat-form.test.ts (Task 3) and tests/cat-form-ui.test.ts (this
 * task). This file asserts the *initial* server-rendered markup: every
 * field has a real label association, both a create and an edit mode
 * render, and the edit-mode initial values come from the passed `cat`.
 * Interactive behaviour (typing, slug auto-fill/lock, submit, field
 * errors, redirect) was verified under `wrangler dev` — see
 * task-8-report.md.
 */

const cat = {
  id: 'cat_1',
  slugCa: 'mimi',
  slugEs: 'mimi-es',
  nameCa: 'Mimi',
  nameEs: 'Mimi',
  raceCa: 'Europeu',
  raceEs: 'Europeo',
  status: 'available',
  age: 3,
  gender: 'female',
  size: 'small',
  personality: ['playful', 'curious'],
  goodWith: ['children'],
  healthStatus: 'healthy',
  vaccinated: true,
  microchipped: false,
  sterilized: true,
  weight: 3.5,
  rescueDate: '2026-01-01',
  adoptionDate: null,
  specialNeedsCa: '',
  specialNeedsEs: '',
  observationsCa: '',
  observationsEs: '',
  shortDescriptionCa: 'Una gateta juganera.',
  shortDescriptionEs: 'Una gatita juguetona.',
  descriptionCa: 'Hola, sóc en Mimi.',
  descriptionEs: 'Hola, soy Mimi.',
  seoTitleCa: '',
  seoTitleEs: '',
  seoDescriptionCa: '',
  seoDescriptionEs: '',
  featured: false,
  sortOrder: 1,
  published: true,
  coverImageId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  updatedBy: 'volunteer@example.org',
  images: [],
  coverImage: null,
  // biome-ignore lint/suspicious/noExplicitAny: test fixture, not the real CatWithImages import
} as any;

describe('CatForm create mode', () => {
  const html = renderToStaticMarkup(<CatForm mode="create" />);

  it('renders the create submit label', () => {
    expect(html).toContain('Crea el gat');
  });

  it('labels every text field by id, not by nesting', () => {
    for (const id of [
      'cat-name-ca',
      'cat-name-es',
      'cat-slug-ca',
      'cat-slug-es',
      'cat-race-ca',
      'cat-race-es',
      'cat-age',
      'cat-weight',
      'cat-rescue-date',
      'cat-adoption-date',
      'cat-short-description-ca',
      'cat-description-ca',
      'cat-seo-title-ca',
      'cat-sort-order',
    ]) {
      expect(html).toContain(`for="${id}"`);
    }
  });

  it('starts every text field empty', () => {
    expect(html).toMatch(/id="cat-name-ca"[^>]*value=""/);
  });

  it('renders a labelled combobox trigger for each enum field', () => {
    // Radix Select's SelectValue only resolves the selected item's
    // display text once hydrated (see cat-form-tsx report) — static
    // server markup has no visible option label to assert against, so
    // this only confirms the trigger renders as an accessible combobox.
    for (const id of [
      'cat-status',
      'cat-gender',
      'cat-size',
      'cat-health-status',
    ]) {
      expect(html).toContain(`for="${id}"`);
      const triggerIndex = html.indexOf(
        `id="${id}"`,
        html.indexOf(`for="${id}"`)
      );
      expect(triggerIndex).toBeGreaterThan(-1);
    }
    expect(html).toContain('role="combobox"');
  });

  it('renders one checkbox per personality and good-with option', () => {
    expect(html).toContain('for="cat-personality-playful"');
    expect(html).toContain('for="cat-good-with-children"');
  });

  it('groups the personality and good-with checkboxes under a named <fieldset>/<legend>', () => {
    // fix-round-1 MINOR 4: a bare <span> label above the checkboxes gave
    // screen-reader users no group name when tabbing through the
    // options. A native <fieldset>/<legend> pair (biome's own suggestion
    // over role="group" + aria-labelledby on a <div>) announces the
    // group name automatically, no extra ARIA wiring needed.
    expect(html).toMatch(/<fieldset[^>]*><legend[^>]*>Personalitat<\/legend>/);
    expect(html).toMatch(
      /<fieldset[^>]*><legend[^>]*>Es porta bé amb<\/legend>/
    );
  });

  it('does not render field errors when there are none', () => {
    expect(html).not.toContain('role="alert"');
  });
});

describe('CatForm edit mode', () => {
  const html = renderToStaticMarkup(<CatForm cat={cat} mode="edit" />);

  it('renders the save-changes submit label, not the create one', () => {
    expect(html).toContain('Desa els canvis');
    expect(html).not.toContain('Crea el gat');
  });

  it('pre-fills text fields from the passed cat', () => {
    expect(html).toMatch(/id="cat-name-ca"[^>]*value="Mimi"/);
    expect(html).toMatch(/id="cat-slug-ca"[^>]*value="mimi"/);
  });

  it('pre-checks the boolean fields the cat already has set', () => {
    // vaccinated: true and sterilized: true, microchipped: false.
    const vaccinatedIndex = html.indexOf('id="cat-vaccinated"');
    const microchippedIndex = html.indexOf('id="cat-microchipped"');
    expect(vaccinatedIndex).toBeGreaterThan(-1);
    expect(microchippedIndex).toBeGreaterThan(-1);
  });

  it('shows the Markdoc preview toggle for both languages', () => {
    expect(html).toContain('Mostra la vista prèvia');
  });
});
