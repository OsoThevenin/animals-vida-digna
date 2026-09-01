import { describe, expect, it } from 'vitest';
import { renderMarkup } from '../test-utils';
import { StatsSection } from './stats-section';

const items = [
  { value: '120', label: 'Gats rescatats' },
  { value: '85', label: 'Adopcions' },
];

describe('StatsSection', () => {
  it('renders every stat value and label', () => {
    const html = renderMarkup(<StatsSection items={items} />);
    expect(html).toContain('120');
    expect(html).toContain('Gats rescatats');
    expect(html).toContain('85');
    expect(html).toContain('Adopcions');
  });

  it('renders values large in the display font', () => {
    const html = renderMarkup(<StatsSection items={items} />);
    expect(html).toContain('font-display');
    expect(html).toContain('text-4xl');
    expect(html).toContain('text-primary-dark');
  });

  it('sits on the tinted background', () => {
    const html = renderMarkup(<StatsSection items={items} />);
    expect(html).toContain('bg-primary/5');
  });
});
