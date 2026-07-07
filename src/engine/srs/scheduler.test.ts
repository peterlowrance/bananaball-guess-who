import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../rng';
import { newSrsRecord } from './types';
import {
  grade,
  introduce,
  isDue,
  BOX_INTERVALS,
  MAX_BOX,
} from './scheduler';

const NOW = 1_000_000_000_000;
const DAY = 86_400_000;
const rng = () => mulberry32(42);

describe('srs scheduler', () => {
  it('introduce sets box>=1, dues now, is idempotent', () => {
    const a = introduce(newSrsRecord(), NOW);
    expect(a.box).toBe(1);
    expect(a.introducedAt).toBe(NOW);
    expect(a.due).toBe(NOW);
    const b = introduce(a, NOW + 5000);
    expect(b.introducedAt).toBe(NOW); // unchanged
  });

  it('correct review advances the box by one', () => {
    let r = introduce(newSrsRecord(), NOW);
    r = grade({ record: r, correct: true, now: NOW, rng: rng(), isReview: true });
    expect(r.box).toBe(2);
    r = grade({ record: r, correct: true, now: NOW, rng: rng(), isReview: true });
    expect(r.box).toBe(3);
  });

  it('box never exceeds MAX_BOX', () => {
    let r = introduce(newSrsRecord(), NOW);
    for (let i = 0; i < 20; i++) {
      r = grade({ record: r, correct: true, now: NOW, rng: rng(), isReview: true });
    }
    expect(r.box).toBe(MAX_BOX);
  });

  it('wrong answer drops box by 2 (min 1) and re-dues ~tomorrow', () => {
    let r = introduce(newSrsRecord(), NOW);
    for (let i = 0; i < 4; i++)
      r = grade({ record: r, correct: true, now: NOW, rng: rng(), isReview: true });
    expect(r.box).toBe(5);
    r = grade({ record: r, correct: false, now: NOW, rng: rng() });
    expect(r.box).toBe(3);
    // wrong from box 1 stays at 1
    let low = introduce(newSrsRecord(), NOW);
    low = grade({ record: low, correct: false, now: NOW, rng: rng() });
    expect(low.box).toBe(1);
    // due within ~1 day (jittered)
    expect(low.due).toBeGreaterThan(NOW + 0.8 * DAY);
    expect(low.due).toBeLessThan(NOW + 1.2 * DAY);
  });

  it('due date matches the box interval (within jitter)', () => {
    let r = introduce(newSrsRecord(), NOW);
    r = grade({ record: r, correct: true, now: NOW, rng: rng(), isReview: true }); // box 2
    const expected = BOX_INTERVALS[2];
    expect(r.due - NOW).toBeGreaterThan(expected * 0.85);
    expect(r.due - NOW).toBeLessThan(expected * 1.15);
  });

  it('practice on a not-due player never advances the box', () => {
    let r = introduce(newSrsRecord(), NOW); // box 1
    r = grade({ record: r, correct: true, now: NOW, rng: rng(), isReview: false });
    expect(r.box).toBe(1); // unchanged
    expect(r.correct).toBe(1); // stats still count
  });

  it('legendary requires box 5 AND a typed question', () => {
    let r = introduce(newSrsRecord(), NOW);
    for (let i = 0; i < 4; i++)
      r = grade({ record: r, correct: true, now: NOW, rng: rng(), isReview: true });
    expect(r.box).toBe(5);
    expect(r.legendary).toBe(false);
    r = grade({ record: r, correct: true, now: NOW, rng: rng(), isReview: true, typed: true });
    expect(r.legendary).toBe(true);
  });

  it('logs confusion pairs on wrong answers, capped and deduped', () => {
    let r = introduce(newSrsRecord(), NOW);
    r = grade({ record: r, correct: false, now: NOW, rng: rng(), confusedWith: 'x' });
    r = grade({ record: r, correct: false, now: NOW, rng: rng(), confusedWith: 'y' });
    r = grade({ record: r, correct: false, now: NOW, rng: rng(), confusedWith: 'x' });
    expect(r.lastWrongWith[0]).toBe('x'); // most recent first
    expect(r.lastWrongWith.filter((id) => id === 'x')).toHaveLength(1); // deduped
  });

  it('isDue is false for never-introduced players', () => {
    expect(isDue(newSrsRecord(), NOW)).toBe(false);
    const intro = introduce(newSrsRecord(), NOW);
    expect(isDue(intro, NOW)).toBe(true); // due now on introduce
  });

  it('grade does not mutate the input record', () => {
    const r = introduce(newSrsRecord(), NOW);
    const snapshot = JSON.stringify(r);
    grade({ record: r, correct: true, now: NOW, rng: rng(), isReview: true });
    expect(JSON.stringify(r)).toBe(snapshot);
  });
});
