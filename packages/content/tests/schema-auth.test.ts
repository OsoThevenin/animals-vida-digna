import { describe, expect, it } from 'vitest';
import * as schema from '../src/schema';

describe('better-auth tables re-exported from packages/content schema', () => {
  it('exports the five better-auth tables', () => {
    expect(schema.user).toBeDefined();
    expect(schema.session).toBeDefined();
    expect(schema.account).toBeDefined();
    expect(schema.verification).toBeDefined();
    expect(schema.rateLimit).toBeDefined();
  });

  it('still exports the Phase 2 cats tables unchanged', () => {
    expect(schema.cats).toBeDefined();
    expect(schema.catImages).toBeDefined();
  });
});
