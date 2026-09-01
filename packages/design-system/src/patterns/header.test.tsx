import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { Header } from './header';

const links = [
  { label: 'Qui som', href: '/#qui-som' },
  { label: 'Gats', href: '/#gats' },
];

describe('Header', () => {
  it('sticks to the top with a translucent surface', () => {
    const html = renderMarkup(<Header links={links} />);
    expect(html).toContain('sticky');
    expect(html).toContain('bg-surface/80');
    expect(html).toContain('backdrop-blur-md');
  });

  it('renders every navigation link', () => {
    const html = renderMarkup(<Header links={links} />);
    expect(html).toContain('Qui som');
    expect(html).toContain('href="/#gats"');
  });

  it('renders the donate button in accent', () => {
    const html = renderMarkup(
      <Header donate={{ label: 'Donatiu', href: '#' }} links={links} />
    );
    expect(html).toContain('Donatiu');
    expect(html).toContain('bg-accent');
  });

  it('renders the brand name', () => {
    const html = renderMarkup(<Header brand="Animals Vida Digna" links={links} />);
    expect(html).toContain('Animals Vida Digna');
  });
});
