import { describe, expect, it } from 'vitest';

import { parseCsvSet } from './config.js';

describe('parseCsvSet', () => {
  it('returns an empty set for empty / null / undefined', () => {
    expect(parseCsvSet(undefined).size).toBe(0);
    expect(parseCsvSet(null).size).toBe(0);
    expect(parseCsvSet('').size).toBe(0);
  });
  it('parses csv, trims whitespace, drops empties', () => {
    expect([...parseCsvSet(' a , b ,, c ,')]).toEqual(['a', 'b', 'c']);
  });
  it('de-duplicates', () => {
    expect([...parseCsvSet('a,a,b')]).toEqual(['a', 'b']);
  });
});
