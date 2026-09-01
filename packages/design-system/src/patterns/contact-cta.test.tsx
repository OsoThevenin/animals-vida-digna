import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { ContactCta } from './contact-cta';

describe('ContactCta', () => {
  it('renders on the dark band with an accent button', () => {
    const html = renderMarkup(
      <ContactCta
        cta={{ label: 'Contacta', href: '/contact' }}
        title="Parlem"
      />
    );
    expect(html).toContain('bg-primary-dark');
    expect(html).toContain('Parlem');
    expect(html).toContain('bg-accent');
    expect(html).toContain('Contacta');
  });

  it('sets the anchor id for in-page navigation', () => {
    const html = renderMarkup(<ContactCta id="contacte" title="Parlem" />);
    expect(html).toContain('id="contacte"');
  });

  it('renders without a call to action', () => {
    const html = renderMarkup(<ContactCta title="Parlem" />);
    expect(html).not.toContain('<a');
  });
});
