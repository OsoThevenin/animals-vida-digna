import { describe, expect, it } from 'vitest';
import { emptyCatInput } from '../src/lib/cat-form';
import {
  applyNameChange,
  fieldAriaProps,
  previewOrFallback,
  toggleListValue,
} from '../src/lib/cat-form-ui';

describe('toggleListValue', () => {
  it('adds a value not already present', () => {
    expect(toggleListValue([], 'playful')).toEqual(['playful']);
    expect(toggleListValue(['calm'], 'playful')).toEqual(['calm', 'playful']);
  });

  it('removes a value already present', () => {
    expect(toggleListValue(['playful', 'calm'], 'playful')).toEqual(['calm']);
  });

  it('does not mutate the input array', () => {
    const list = ['calm'];
    toggleListValue(list, 'playful');
    expect(list).toEqual(['calm']);
  });
});

describe('applyNameChange', () => {
  it('auto-fills both slugs from the CA/ES names when untouched', () => {
    const state = emptyCatInput();
    const next = applyNameChange(state, 'nameCa', 'Mimi Petita');
    expect(next.nameCa).toBe('Mimi Petita');
    expect(next.slugCa).toBe('mimi-petita');
  });

  it('keeps deriving slugs on further name edits until manually touched', () => {
    let state = applyNameChange(emptyCatInput(), 'nameCa', 'Mimi');
    state = applyNameChange(state, 'nameEs', 'Mimi');
    expect(state.slugCa).toBe('mimi');
    expect(state.slugEs).toBe('mimi');
  });

  it('stops overwriting a slug once slugsEditedManually is set', () => {
    const state = {
      ...applyNameChange(emptyCatInput(), 'nameCa', 'Mimi'),
      slugCa: 'mimi-custom',
      slugsEditedManually: true,
    };
    const next = applyNameChange(state, 'nameCa', 'Mimi Gran');
    expect(next.nameCa).toBe('Mimi Gran');
    expect(next.slugCa).toBe('mimi-custom');
  });

  it('does not mutate the input state', () => {
    const state = emptyCatInput();
    applyNameChange(state, 'nameCa', 'Mimi');
    expect(state.nameCa).toBe('');
  });

  it('does not throw when only one name has been typed so far', () => {
    // deriveSlugs()/slugify('') throws SlugifyError on a blank name —
    // exactly the state right after the first keystroke in nameCa, with
    // nameEs still empty. This must not crash the form.
    const next = applyNameChange(emptyCatInput(), 'nameCa', 'Mimi');
    expect(next.nameCa).toBe('Mimi');
    expect(next.slugCa).toBe('mimi');
    expect(next.slugEs).toBe('');
  });
});

describe('previewOrFallback', () => {
  it('renders the same HTML as renderPreview for valid Markdoc', () => {
    expect(previewOrFallback('Hola')).toContain('<p>Hola</p>');
  });

  it('returns an empty string for empty input, not the fallback message', () => {
    expect(previewOrFallback('')).toBe('');
    expect(previewOrFallback('   ')).toBe('');
  });

  it('explains a blank preview instead of silently rendering nothing', () => {
    // Markdoc drops an unrecognized tag rather than throwing, so
    // renderPreview() resolves to a content-free "<article></article>"
    // wrapper here, not to ''. Either shape of "nothing to show" for
    // non-blank input must surface the explanation.
    const result = previewOrFallback('{% bad-tag %}');
    expect(result).not.toBe('');
    expect(result.toLowerCase()).toMatch(/no s'ha pogut previsualitzar/);
  });
});

describe('fieldAriaProps', () => {
  it('returns no aria props when there is no error', () => {
    expect(fieldAriaProps('cat-name-ca-error', false)).toEqual({});
  });

  it('points aria-describedby at the error id and sets aria-invalid when there is an error', () => {
    expect(fieldAriaProps('cat-name-ca-error', true)).toEqual({
      'aria-describedby': 'cat-name-ca-error',
      'aria-invalid': true,
    });
  });
});
