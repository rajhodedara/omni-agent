import { describe, it, expect } from 'vitest';
import { cn, formatDate, formatDuration, truncate } from './utils';

describe('utils', () => {
  it('cn combines class names and ignores falsy values', () => {
    expect(cn('class1', false, null, undefined, 'class2')).toBe('class1 class2');
  });

  it('formatDate formats numeric timestamps correctly', () => {
    const ts = new Date('2026-07-25T12:30:00Z').getTime();
    const formatted = formatDate(ts);
    expect(formatted).toContain('25');
  });

  it('formatDuration calculates minutes and seconds', () => {
    expect(formatDuration(5000)).toBe('5s');
    expect(formatDuration(65000)).toBe('1m 5s');
  });

  it('truncate shortens strings properly', () => {
    expect(truncate('Hello world', 5)).toBe('Hello...');
    expect(truncate('Short', 10)).toBe('Short');
  });
});
