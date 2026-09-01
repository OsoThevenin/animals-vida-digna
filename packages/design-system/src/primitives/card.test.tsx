import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { Card } from './card';

describe('Card', () => {
  it('renders children inside a surface panel', () => {
    const html = renderMarkup(<Card>Content</Card>);
    expect(html).toContain('Content');
    expect(html).toContain('bg-surface');
    expect(html).toContain('rounded-xl');
  });

  it('becomes a link when href is set', () => {
    const html = renderMarkup(<Card href="/cat/mia">Mia</Card>);
    expect(html).toContain('<a');
    expect(html).toContain('href="/cat/mia"');
  });

  it('renders the image in a 4:3 frame', () => {
    const html = renderMarkup(
      <Card imageAlt="Mia" imageSrc="/mia.webp">
        Mia
      </Card>
    );
    expect(html).toContain('aspect-[4/3]');
    expect(html).toContain('src="/mia.webp"');
    expect(html).toContain('alt="Mia"');
  });

  it('shows a placeholder when there is no image', () => {
    const html = renderMarkup(<Card imageAlt="">Mia</Card>);
    expect(html).toContain('bg-primary/5');
  });
});
