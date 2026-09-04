import { describe, expect, it } from 'vitest';
import { CONTENT_PACKAGE } from '../src/lib/content-package';

describe('apps/web ↔ @avd/content workspace resolution', () => {
  it('resolves the CONTENT_PACKAGE constant from the @avd/content workspace package', () => {
    expect(CONTENT_PACKAGE).toBe('@avd/content');
  });
});
