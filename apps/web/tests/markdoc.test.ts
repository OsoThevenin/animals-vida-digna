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
