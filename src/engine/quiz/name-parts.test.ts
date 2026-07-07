import { describe, it, expect } from 'vitest';
import { firstName, lastName, dropSuffix } from './name-parts';

describe('name-parts', () => {
  it('drops generational suffixes', () => {
    expect(dropSuffix('Jackie Bradley Jr.')).toBe('Jackie Bradley');
    expect(dropSuffix('Eric Jones Jr')).toBe('Eric Jones');
    expect(dropSuffix('Sam Smith III')).toBe('Sam Smith');
    expect(dropSuffix('Plain Name')).toBe('Plain Name');
  });

  it('firstName is the first token, suffix-independent', () => {
    expect(firstName('Jackie Bradley Jr.')).toBe('Jackie');
    expect(firstName('Madonna')).toBe('Madonna');
  });

  it('lastName is the last non-suffix token', () => {
    expect(lastName('Jackie Bradley Jr.')).toBe('Bradley');
    expect(lastName('Eric Jones Jr')).toBe('Jones');
    expect(lastName('Sam Smith III')).toBe('Smith');
    expect(lastName('Madonna')).toBe('Madonna');
  });
});
