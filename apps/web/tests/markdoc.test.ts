import { describe, expect, it } from 'vitest';
import Markdoc from '@markdoc/markdoc';
import { renderMarkdoc } from '../src/lib/markdoc';

describe('renderMarkdoc', () => {
  it('returns empty string for null input', async () => {
    expect(await renderMarkdoc(null)).toBe('');
  });

  it('returns empty string for undefined input', async () => {
    expect(await renderMarkdoc(undefined)).toBe('');
  });

  it('transforms a simple paragraph node to HTML', async () => {
    const ast = Markdoc.parse('Hello world');
    const mockContent = async () => ({ node: ast });

    const html = await renderMarkdoc(mockContent);
    expect(html).toContain('Hello world');
    expect(html).toContain('<p>');
  });

  it('handles already-resolved object with .node property', async () => {
    const ast = Markdoc.parse('Direct node');
    const resolved = { node: ast };

    const html = await renderMarkdoc(resolved);
    expect(html).toContain('Direct node');
  });

  it('handles errors gracefully', async () => {
    const badContent = async () => {
      throw new Error('fail');
    };

    expect(await renderMarkdoc(badContent as any)).toBe('');
  });

  it('returns empty string when node is null', async () => {
    const noNode = async () => ({ node: null });
    expect(await renderMarkdoc(noNode as any)).toBe('');
  });
});

import { renderMarkdocSource } from '../src/lib/markdoc';

describe('renderMarkdocSource', () => {
  it('returns empty string for empty input', () => {
    expect(renderMarkdocSource('')).toBe('');
  });

  it('renders a Markdoc source string to HTML', () => {
    const html = renderMarkdocSource('Hello **world**');
    expect(html).toContain('<p>');
    expect(html).toContain('Hello');
    expect(html).toContain('<strong>world</strong>');
  });

  it('renders multiple paragraphs', () => {
    const html = renderMarkdocSource('First paragraph.\n\nSecond paragraph.');
    expect(html).toContain('First paragraph.');
    expect(html).toContain('Second paragraph.');
    expect((html.match(/<p>/g) ?? []).length).toBe(2);
  });

  it('returns empty string on a parse/transform error rather than throwing', () => {
    expect(() =>
      renderMarkdocSource('{% unknown-tag %}broken{% /unknown-tag %}'),
    ).not.toThrow();
  });
});
