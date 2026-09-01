import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { Hero } from './hero';

describe('Hero', () => {
  it('renders the title as an h1 on the dark band', () => {
    const html = renderMarkup(<Hero title="Una vida digna" />);
    expect(html).toContain('<h1');
    expect(html).toContain('Una vida digna');
    expect(html).toContain('bg-primary-dark');
    expect(html).toContain('text-surface');
  });

  it('renders both calls to action', () => {
    const html = renderMarkup(
      <Hero
        primaryCta={{ label: "Adopta'm", href: '#gats' }}
        secondaryCta={{ label: 'Fes un donatiu', href: 'https://example.org' }}
        title="Una vida digna"
      />
    );
    expect(html).toContain('Adopta&#x27;m');
    expect(html).toContain('bg-accent');
    expect(html).toContain('Fes un donatiu');
    expect(html).toContain('border-surface/30');
  });

  it('renders the image when given one', () => {
    const html = renderMarkup(
      <Hero imageAlt="Gats al refugi" imageSrc="/hero.webp" title="Hola" />
    );
    expect(html).toContain('src="/hero.webp"');
    expect(html).toContain('alt="Gats al refugi"');
  });

  it('omits the subtitle paragraph when absent', () => {
    const html = renderMarkup(<Hero title="Hola" />);
    expect(html).not.toContain('text-surface/80');
  });
});
