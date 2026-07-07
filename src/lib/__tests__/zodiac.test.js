import { describe, expect, it } from 'vitest';
import { getZodiacElement, getZodiacSign } from '../zodiac.js';

describe('getZodiacSign', () => {
  it('returns the correct sign for a date well inside a range', () => {
    expect(getZodiacSign('2000-05-15')).toBe('Taurus');
  });

  it('handles a boundary date correctly', () => {
    expect(getZodiacSign('2000-01-19')).toBe('Capricorn');
    expect(getZodiacSign('2000-01-20')).toBe('Aquarius');
  });

  it('handles the December -> Capricorn wraparound', () => {
    expect(getZodiacSign('2000-12-25')).toBe('Capricorn');
  });

  it('returns an empty string for missing or invalid input', () => {
    expect(getZodiacSign('')).toBe('');
    expect(getZodiacSign('not-a-date')).toBe('');
  });
});

describe('getZodiacElement', () => {
  it('maps signs to their classical element', () => {
    expect(getZodiacElement('Taurus')).toBe('Earth');
    expect(getZodiacElement('Scorpio')).toBe('Water');
  });
});
