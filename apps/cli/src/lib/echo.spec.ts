import { describe, expect, it } from 'vitest';
import { echo } from './echo';

describe('echo', () => {
  it('should return the input text unchanged', () => {
    expect(echo('szia')).toBe('szia');
  });

  it('should return an empty string when given an empty string', () => {
    expect(echo('')).toBe('');
  });
});
