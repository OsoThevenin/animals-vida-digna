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

  it('omits mb-12 from the heading on the dark tone', () => {
    const html = renderMarkup(
      <Section title="Contacta amb nosaltres" tone="dark">
        Body
      </Section>
    );
    const h2Match = html.match(/<h2[^>]*>/);
    expect(h2Match).not.toBeNull();
    expect(h2Match?.[0]).not.toContain('mb-12');
  });

  it('keeps mb-12 on the heading for the light tones', () => {
    const html = renderMarkup(
      <Section title="Les nostres colònies" tone="tint">
        Body
      </Section>
    );
    const h2Match = html.match(/<h2[^>]*>/);
    expect(h2Match).not.toBeNull();
    expect(h2Match?.[0]).toContain('mb-12');
  });
});
