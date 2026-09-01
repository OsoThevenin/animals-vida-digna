import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { CatTraits } from './cat-traits';

const traits = [
  { term: 'Raça', value: 'Comú europeu' },
  { term: 'Edat', value: '3 anys' },
];

describe('CatTraits', () => {
  it('renders each trait as a term and value pair', () => {
    const html = renderMarkup(
      <CatTraits statusLabel="Disponible" traits={traits} />
    );
    expect(html).toContain('<dt');
    expect(html).toContain('Raça');
    expect(html).toContain('Comú europeu');
    expect(html).toContain('3 anys');
  });

  it('renders personality tags in accent pills', () => {
    const html = renderMarkup(
      <CatTraits
        personality={['Juganera', 'Tranquil·la']}
        personalityTitle="Personalitat"
        statusLabel="Disponible"
        traits={traits}
      />
    );
    expect(html).toContain('bg-accent/10');
    expect(html).toContain('Juganera');
    expect(html).toContain('Personalitat');
  });

  it('omits the personality block when the list is empty', () => {
    const html = renderMarkup(
      <CatTraits
        personality={[]}
        personalityTitle="Personalitat"
        statusLabel="Disponible"
        traits={traits}
      />
    );
    expect(html).not.toContain('Personalitat');
  });

  it('renders goodWith pills in green and personality pills in accent', () => {
    const html = renderMarkup(
      <CatTraits
        goodWith={['Nens']}
        goodWithTitle="Compatible amb"
        personality={['Juganera']}
        personalityTitle="Personalitat"
        statusLabel="Disponible"
        traits={traits}
      />
    );
    expect(html).toContain('bg-green-50');
    expect(html).toContain('bg-accent/10');
  });

  it('does not apply bg-accent/10 to the goodWith pill', () => {
    const html = renderMarkup(
      <CatTraits
        goodWith={['Nens']}
        goodWithTitle="Compatible amb"
        statusLabel="Disponible"
        traits={traits}
      />
    );
    expect(html).toContain('bg-green-50');
    expect(html).not.toContain('bg-accent/10');
  });

  it('renders medical facts with a check for done and a cross for not done', () => {
    const html = renderMarkup(
      <CatTraits
        medical={[
          { label: 'Vacunada', done: true },
          { label: 'Esterilitzada', done: false },
        ]}
        statusLabel="Disponible"
        traits={traits}
      />
    );
    expect(html).toContain('text-green-700');
    expect(html).toContain('✓');
    expect(html).toContain('Vacunada');
    expect(html).toContain('text-text-muted');
    expect(html).toContain('✗');
    expect(html).toContain('Esterilitzada');
  });

  it('omits the medical block when medical is not provided', () => {
    const html = renderMarkup(
      <CatTraits statusLabel="Disponible" traits={traits} />
    );
    expect(html).not.toContain('✓');
    expect(html).not.toContain('✗');
  });

  it('renders specialNeeds inside an amber callout, omitted when absent', () => {
    const withNeeds = renderMarkup(
      <CatTraits
        specialNeeds="Necessita medicació diària"
        statusLabel="Disponible"
        traits={traits}
      />
    );
    expect(withNeeds).toContain('bg-amber-50');
    expect(withNeeds).toContain('Necessita medicació diària');

    const withoutNeeds = renderMarkup(
      <CatTraits statusLabel="Disponible" traits={traits} />
    );
    expect(withoutNeeds).not.toContain('bg-amber-50');
  });
});
