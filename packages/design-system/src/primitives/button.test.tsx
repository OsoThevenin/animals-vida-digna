import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { Button } from './button';

describe('Button', () => {
  it('renders an anchor when href is set', () => {
    const html = renderMarkup(<Button href="/adopt">Adopt</Button>);
    expect(html).toContain('<a');
    expect(html).toContain('href="/adopt"');
    expect(html).toContain('Adopt');
  });

  it('renders a button element without href', () => {
    const html = renderMarkup(<Button type="submit">Send</Button>);
    expect(html).toContain('<button');
    expect(html).toContain('type="submit"');
  });

  it('uses the accent background by default', () => {
    const html = renderMarkup(<Button href="#">Donate</Button>);
    expect(html).toContain('bg-accent');
  });

  it('uses surface borders for the outline variant', () => {
    const html = renderMarkup(
      <Button href="#" variant="outline">
        Donate
      </Button>
    );
    expect(html).toContain('border-surface/30');
    expect(html).not.toContain('bg-accent');
  });

  it('opens external links safely in a new tab', () => {
    const html = renderMarkup(
      <Button href="https://example.org/donate">Donate</Button>
    );
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
