import Markdoc from '@markdoc/markdoc';

/**
 * Renders raw Markdoc source to an HTML string for the admin's live
 * description preview. Pure — runs the same in the browser and on the
 * server, no network or filesystem access.
 */
export function renderPreview(src: string): string {
  if (!src || src.trim() === '') return '';
  try {
    const ast = Markdoc.parse(src);
    const transformed = Markdoc.transform(ast);
    return Markdoc.renderers.html(transformed) || '';
  } catch {
    return '';
  }
}
