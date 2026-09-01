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
});
