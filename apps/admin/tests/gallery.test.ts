import { describe, expect, it } from 'vitest';
import { moveImage, withPositions } from '../src/lib/gallery';

describe('moveImage', () => {
  it('moves an item forward', () => {
    const result = moveImage(['a', 'b', 'c'], 0, 2);
    expect(result).toEqual(['b', 'c', 'a']);
  });

  it('moves an item backward', () => {
    const result = moveImage(['a', 'b', 'c'], 2, 0);
    expect(result).toEqual(['c', 'a', 'b']);
  });

  it('does not mutate the input array', () => {
    const input = ['a', 'b', 'c'];
    moveImage(input, 0, 2);
    expect(input).toEqual(['a', 'b', 'c']);
  });

  it('is a no-op when from equals to', () => {
    const input = ['a', 'b', 'c'];
    const result = moveImage(input, 1, 1);
    expect(result).toEqual(['a', 'b', 'c']);
    expect(result).not.toBe(input);
  });

  it('returns a copy unchanged for an out-of-range index', () => {
    const input = ['a', 'b', 'c'];
    expect(moveImage(input, -1, 1)).toEqual(['a', 'b', 'c']);
    expect(moveImage(input, 0, 5)).toEqual(['a', 'b', 'c']);
  });
});

describe('withPositions', () => {
  it('assigns 0-based positions in array order', () => {
    const result = withPositions([{ id: 'x' }, { id: 'y' }, { id: 'z' }]);
    expect(result).toEqual([
      { id: 'x', position: 0 },
      { id: 'y', position: 1 },
      { id: 'z', position: 2 },
    ]);
  });

  it('does not mutate the input items', () => {
    const input = [{ id: 'x' }];
    withPositions(input);
    expect(input[0]).not.toHaveProperty('position');
  });
});
