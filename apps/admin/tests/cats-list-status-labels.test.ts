import { describe, expect, it } from 'vitest';
import { CAT_STATUS_LABELS_CA } from '../src/pages/cats/status-labels';

describe('CAT_STATUS_LABELS_CA', () => {
  it('has a Catalan label for every cat status', () => {
    expect(CAT_STATUS_LABELS_CA.available).toBe('Disponible');
    expect(CAT_STATUS_LABELS_CA.adopted).toBe('Adoptat');
    expect(CAT_STATUS_LABELS_CA.treatment).toBe('En tractament');
    expect(CAT_STATUS_LABELS_CA.unavailable).toBe('No disponible');
  });
});
