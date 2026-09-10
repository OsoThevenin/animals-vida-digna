import { describe, expect, it } from 'vitest';
import * as barrel from '../src/index';

describe('@avd/content package wiring', () => {
  it('re-exports the schema, repository, validation, localize and image-url modules', () => {
    expect(barrel.cats).toBeDefined();
    expect(barrel.catImages).toBeDefined();
    expect(barrel.createDb).toBeTypeOf('function');
    expect(barrel.catInputSchema).toBeDefined();
    expect(barrel.slugify).toBeTypeOf('function');
    expect(barrel.localizeCat).toBeTypeOf('function');
    expect(barrel.imageUrl).toBeTypeOf('function');
    expect(barrel.DEFAULT_IMAGES_ORIGIN).toBe(
      'https://images.animalsvidadigna.org'
    );
  });
});
