import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Renders a component to static HTML so tests can assert on the
 * markup and class vocabulary without a DOM.
 */
export function renderMarkup(element: ReactElement): string {
  return renderToStaticMarkup(element);
}
