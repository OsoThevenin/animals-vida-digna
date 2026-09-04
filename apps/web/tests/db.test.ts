import { describe, expect, it } from 'vitest';
import { getDb } from '../src/lib/db';

describe('getDb', () => {
  it('returns undefined when locals is undefined', () => {
    expect(getDb(undefined)).toBeUndefined();
  });

  it('returns undefined when locals has no runtime', () => {
    expect(getDb({})).toBeUndefined();
  });

  it('returns undefined when runtime has no env', () => {
    expect(getDb({ runtime: {} })).toBeUndefined();
  });

  it('returns undefined when env has no DB binding', () => {
    expect(getDb({ runtime: { env: {} } })).toBeUndefined();
  });

  it('returns a Db when the DB binding is present', () => {
    const fakeD1 = {} as unknown;
    const db = getDb({ runtime: { env: { DB: fakeD1 } } });
    expect(db).toBeDefined();
  });
});
