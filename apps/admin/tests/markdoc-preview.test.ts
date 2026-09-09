import { describe, expect, it } from 'vitest';
import { renderPreview } from '../src/lib/markdoc-preview';

describe('renderPreview', () => {
  it('renders a paragraph', () => {
    const html = renderPreview('Hola, sóc en Mimi.');
    expect(html).toContain('<p>Hola, sóc en Mimi.</p>');
  });

  it('renders bold and italic markdown', () => {
    const html = renderPreview('**fort** i _cursiva_');
    expect(html).toContain('<strong>fort</strong>');
    expect(html).toContain('<em>cursiva</em>');
  });

  it('returns an empty string for empty input', () => {
    expect(renderPreview('')).toBe('');
    expect(renderPreview('   ')).toBe('');
  });

  it('does not throw on malformed input', () => {
    expect(() => renderPreview('{% unknown-tag %}')).not.toThrow();
  });
});
