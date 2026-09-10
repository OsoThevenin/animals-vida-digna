import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { Input } from './input';

describe('Input', () => {
  it('renders a text input by default', () => {
    const html = renderMarkup(<Input id="name" />);
    expect(html).toContain('<input');
    expect(html).toContain('type="text"');
    expect(html).toContain('id="name"');
  });

  it('renders a textarea when asked', () => {
    const html = renderMarkup(<Input id="message" rows={5} type="textarea" />);
    expect(html).toContain('<textarea');
    expect(html).toContain('rows="5"');
  });

  it('carries the shared field styling', () => {
    const html = renderMarkup(<Input id="email" type="email" />);
    expect(html).toContain('border-primary/20');
    expect(html).toContain('bg-surface');
  });
});
