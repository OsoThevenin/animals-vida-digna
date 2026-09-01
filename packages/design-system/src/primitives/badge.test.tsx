import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders the label', () => {
    const html = renderMarkup(<Badge label="Disponible" />);
    expect(html).toContain('Disponible');
  });

  it('colours each status distinctly', () => {
    const available = renderMarkup(
      <Badge label="Disponible" status="available" />
    );
    const adopted = renderMarkup(<Badge label="Adoptat" status="adopted" />);
    expect(available).toContain('bg-green-100');
    expect(adopted).toContain('bg-blue-100');
  });

  it('falls back to grey for an unknown status', () => {
    const html = renderMarkup(<Badge label="?" />);
    expect(html).toContain('bg-gray-100');
  });
});
