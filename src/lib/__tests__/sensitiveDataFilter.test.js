import { describe, expect, it } from 'vitest';
import { filterSensitiveData } from '../sensitiveDataFilter.js';

describe('filterSensitiveData', () => {
  it('redacts an email address', () => {
    const result = filterSensitiveData('Reach me at priya.sharma@example.com anytime.');
    expect(result.protectedText).not.toContain('priya.sharma@example.com');
    expect(result.protectedText).toContain('[EMAIL_PROTECTED]');
  });

  it('redacts an Indian phone number', () => {
    const result = filterSensitiveData('Call me on 9876543210 later.');
    expect(result.protectedText).not.toContain('9876543210');
  });

  it('redacts a generic international phone number', () => {
    const result = filterSensitiveData('WhatsApp me on +44 7911123456.');
    expect(result.protectedText).not.toContain('7911123456');
  });

  it('leaves ordinary conversation text untouched', () => {
    const input = 'I just want to understand what changed between us.';
    expect(filterSensitiveData(input).protectedText).toBe(input);
  });
});
