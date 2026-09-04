import { describe, expect, it } from 'vitest';
import { CONTENT_PACKAGE } from '../src/index';

describe('@avd/content package wiring', () => {
  it('exports its own package name as a sanity constant', () => {
    expect(CONTENT_PACKAGE).toBe('@avd/content');
  });
});
