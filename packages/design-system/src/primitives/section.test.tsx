import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { Section } from './section';

describe('Section', () => {
  it('renders a heading when given a title', () => {
    const html = renderMarkup(<Section title="Els nostres gats">Body</Section>);
    expect(html).toContain('<h2');
    expect(html).toContain('Els nostres gats');
    expect(html).toContain('font-display');
  });

  it('omits the heading when there is no title', () => {
    const html = renderMarkup(<Section>Body</Section>);
    expect(html).not.toContain('<h2');
  });

  it('inverts text colour on the dark tone', () => {
    const html = renderMarkup(<Section tone="dark">Body</Section>);
    expect(html).toContain('bg-primary-dark');
    expect(html).toContain('text-surface');
  });

  it('uses a tinted background for the tint tone', () => {
    const html = renderMarkup(<Section tone="tint">Body</Section>);
    expect(html).toContain('bg-primary/5');
  });

  it('sets the anchor id', () => {
    const html = renderMarkup(<Section id="gats">Body</Section>);
    expect(html).toContain('id="gats"');
  });
});
