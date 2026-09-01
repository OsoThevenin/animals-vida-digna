import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const tokensCss = readFileSync(join(__dirname, 'tokens.css'), 'utf8');
const siteCss = readFileSync(
  join(__dirname, '../../../../src/styles/global.css'),
  'utf8'
);

function themeColors(css: string): Record<string, string> {
  const colors: Record<string, string> = {};
  const pattern = /--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})/g;
  let match = pattern.exec(css);
  while (match !== null) {
    colors[match[1]] = match[2].toLowerCase();
    match = pattern.exec(css);
  }
  return colors;
}

describe('design tokens', () => {
  it('matches the palette in the site global.css', () => {
    expect(themeColors(tokensCss)).toEqual(themeColors(siteCss));
  });
});
