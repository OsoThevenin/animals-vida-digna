import { describe, expect, it } from 'vitest';
import { parseStatusFilter } from '../src/lib/cats-status-filter';

describe('parseStatusFilter', () => {
  it('returns the status when it is a known CatStatus', () => {
    expect(parseStatusFilter('adopted')).toBe('adopted');
    expect(parseStatusFilter('available')).toBe('available');
    expect(parseStatusFilter('treatment')).toBe('treatment');
    expect(parseStatusFilter('unavailable')).toBe('unavailable');
  });

  it('returns null for the "all statuses" empty string', () => {
    expect(parseStatusFilter('')).toBeNull();
  });

  it('returns null when the param is absent', () => {
    expect(parseStatusFilter(null)).toBeNull();
  });

  it('returns null for an unknown or forged status value', () => {
    expect(parseStatusFilter('deceased')).toBeNull();
    expect(parseStatusFilter('<script>')).toBeNull();
  });
});
