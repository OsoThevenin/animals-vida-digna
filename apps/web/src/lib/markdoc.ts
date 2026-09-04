import Markdoc from '@markdoc/markdoc';

/**
 * Render a Keystatic markdoc async content field to an HTML string.
 *
 * Handles two shapes:
 * 1. Async function (from singleton/collection fields): `() => Promise<{ node: unknown }>`
 * 2. Already-resolved object with `.node` property (from blocks): `{ node: unknown }`
 *
 * Returns empty string for null/undefined input or on error.
 */
export async function renderMarkdoc(
  asyncContent:
    | (() => Promise<{ node: unknown }>)
    | { node: unknown }
    | null
    | undefined,
): Promise<string> {
  if (!asyncContent) return '';

  try {
    let node: unknown;

    if (typeof asyncContent === 'function') {
      const resolved = await asyncContent();
      node = resolved?.node;
    } else if ('node' in asyncContent) {
      node = asyncContent.node;
    } else {
      return '';
    }

    if (!node) return '';

    const transformed = Markdoc.transform(node as Parameters<typeof Markdoc.transform>[0]);
    return Markdoc.renderers.html(transformed) || '';
  } catch {
    return '';
  }
}

/**
 * Render a raw Markdoc source string (as stored in D1's `description_ca` /
 * `description_es` columns) to an HTML string.
 *
 * Unlike `renderMarkdoc`, this takes plain text directly — no Keystatic
 * async-content wrapper. Returns empty string for empty/falsy input or on
 * any parse/transform error.
 */
export function renderMarkdocSource(src: string): string {
  if (!src) return '';

  try {
    const ast = Markdoc.parse(src);
    const transformed = Markdoc.transform(ast);
    return Markdoc.renderers.html(transformed) || '';
  } catch {
    return '';
  }
}
