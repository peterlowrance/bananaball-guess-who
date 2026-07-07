import { describe, it, expect } from 'vitest';
import { mascotQuote, QUOTES, type QuoteMoment } from './quotes';

const MOMENTS = Object.keys(QUOTES) as QuoteMoment[];

describe('mascotQuote', () => {
  it('every moment has at least a few non-empty lines', () => {
    for (const m of MOMENTS) {
      expect(QUOTES[m].length).toBeGreaterThanOrEqual(3);
      for (const line of QUOTES[m]) expect(line.trim().length).toBeGreaterThan(0);
    }
  });

  it('returns a real line for every moment', () => {
    for (const m of MOMENTS) {
      expect(QUOTES[m]).toContain(mascotQuote(m, 0));
    }
  });

  it('is deterministic for a given moment + seed', () => {
    for (const m of MOMENTS) {
      expect(mascotQuote(m, 'abc')).toBe(mascotQuote(m, 'abc'));
      expect(mascotQuote(m, 7)).toBe(mascotQuote(m, 7));
    }
  });

  it('varies across seeds for moments with several lines', () => {
    // gather the distinct lines produced across many seeds for a rich moment
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) seen.add(mascotQuote('lesson-perfect', i));
    expect(seen.size).toBeGreaterThan(1);
  });
});
