import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { Footer } from './footer';

const links = [
  { label: 'Qui som', href: '/#qui-som' },
  { label: 'Contacte', href: '/#contacte' },
];

describe('Footer', () => {
  it('renders dark with surface text', () => {
    const html = renderMarkup(<Footer links={links} />);
    expect(html).toContain('bg-primary-dark');
    expect(html).toContain('text-surface');
  });

  it('renders the navigation links', () => {
    const html = renderMarkup(<Footer links={links} navTitle="Navegació" />);
    expect(html).toContain('Navegació');
    expect(html).toContain('Qui som');
    expect(html).toContain('href="/#contacte"');
  });

  it('renders the tagline and copyright', () => {
    const html = renderMarkup(
      <Footer
        copyright="© 2026 Animals Vida Digna"
        links={links}
        tagline="Refugi de gats"
      />
    );
    expect(html).toContain('Refugi de gats');
    expect(html).toContain('© 2026 Animals Vida Digna');
  });

  it('brightens the logo against the dark background', () => {
    const html = renderMarkup(<Footer links={links} />);
    expect(html).toContain('brightness-200');
  });

  it('renders the donate button in accent', () => {
    const html = renderMarkup(
      <Footer donate={{ label: 'Donatiu', href: '#' }} links={links} />
    );
    expect(html).toContain('Donatiu');
    expect(html).toContain('href="#"');
    expect(html).toContain('px-4 py-2');
    expect(html).toContain('text-sm');
    expect(html).toContain('bg-accent');
  });

  it('omits the donate button when not given', () => {
    const html = renderMarkup(<Footer links={links} />);
    expect(html).not.toContain('bg-accent');
  });
});
