import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { CatCard } from './cat-card';

describe('CatCard', () => {
  it('renders the name and status', () => {
    const html = renderMarkup(
      <CatCard name="Mia" status="available" statusLabel="Disponible" />
    );
    expect(html).toContain('Mia');
    expect(html).toContain('Disponible');
    expect(html).toContain('bg-green-100');
  });

  it('styles the name as a display heading', () => {
    const html = renderMarkup(<CatCard name="Mia" statusLabel="Disponible" />);
    expect(html).toContain('<h3');
    expect(html).toContain('font-display');
    expect(html).toContain('text-primary');
  });

  it('clamps the description to two lines', () => {
    const html = renderMarkup(
      <CatCard
        description="Una gata molt caristosa"
        name="Mia"
        statusLabel="Disponible"
      />
    );
    expect(html).toContain('line-clamp-2');
    expect(html).toContain('Una gata molt caristosa');
  });

  it('omits the description paragraph when absent', () => {
    const html = renderMarkup(<CatCard name="Mia" statusLabel="Disponible" />);
    expect(html).not.toContain('line-clamp-2');
  });
});
