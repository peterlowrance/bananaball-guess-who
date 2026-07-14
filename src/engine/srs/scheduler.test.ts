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

/** Advance a record to `box` via one correct answer per day (respects both
 *  advancement caps). Returns the record and the day-index it ended on. */
function toBox(box: number, start = NOW): { r: ReturnType<typeof newSrsRecord>; now: number } {
  let r = introduce(newSrsRecord(), start);
  let now = start;
  while (r.box < box) {
    now += DAY;
    r = grade({ record: r, correct: true, now, rng: rng() });
  }
  return { r, now };
}

describe('srs scheduler', () => {
  it('introduce sets box>=1, dues now, counts as a box-up, is idempotent', () => {
    const a = introduce(newSrsRecord(), NOW);
    expect(a.box).toBe(1);
    expect(a.introducedAt).toBe(NOW);
    expect(a.due).toBe(NOW);
    expect(a.boxUps).toEqual([NOW]);
    const b = introduce(a, NOW + 5000);
    expect(b.introducedAt).toBe(NOW); // unchanged
  });

  it('correct answer advances the box by one (due-ness does not gate)', () => {
    let r = introduce(newSrsRecord(), NOW);
    r = grade({ record: r, correct: true, now: NOW, rng: rng() });
    expect(r.box).toBe(2);
    r = grade({ record: r, correct: true, now: NOW, rng: rng() });
    expect(r.box).toBe(3); // NOW+intro = 3 box-ups today; at the daily cap now
  });

  it('caps box-ups per rolling day (incl. the introduce), then resumes next day', () => {
    let r = introduce(newSrsRecord(), NOW); // 1st box-up today
    for (let i = 0; i < 10; i++) {
      r = grade({ record: r, correct: true, now: NOW + i, rng: rng() });
    }
    expect(r.box).toBe(3); // intro + 2 grades = 3/day, further ups blocked
    r = grade({ record: r, correct: true, now: NOW + DAY + 1, rng: rng() });
    expect(r.box).toBe(4); // window rolled over
  });

  it('allowAdvance=false never advances (the +1-per-session cap)', () => {
    let r = introduce(newSrsRecord(), NOW);
    r = grade({ record: r, correct: true, now: NOW, rng: rng(), allowAdvance: false });
    expect(r.box).toBe(1); // unchanged
    expect(r.correct).toBe(1); // stats still count
  });

  it('box never exceeds MAX_BOX', () => {
    let { r, now } = toBox(MAX_BOX);
    r = grade({ record: r, correct: true, now: now + DAY, rng: rng() });
    expect(r.box).toBe(MAX_BOX);
  });

  it('wrong answer drops box by 2 (min 1) and re-dues ~tomorrow; practice drops 1', () => {
    let { r, now } = toBox(5);
    r = grade({ record: r, correct: false, now, rng: rng() });
    expect(r.box).toBe(3);
    // practice softens the drop to 1
    let { r: p, now: pnow } = toBox(5);
    p = grade({ record: p, correct: false, now: pnow, rng: rng(), practice: true });
    expect(p.box).toBe(4);
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
    r = grade({ record: r, correct: true, now: NOW, rng: rng() }); // box 2
    const expected = BOX_INTERVALS[2];
    expect(r.due - NOW).toBeGreaterThan(expected * 0.85);
    expect(r.due - NOW).toBeLessThan(expected * 1.15);
  });

  it('legendary requires box 5 AND a typed question', () => {
    let { r, now } = toBox(5);
    expect(r.legendary).toBe(false);
    r = grade({ record: r, correct: true, now: now + DAY, rng: rng(), typed: true });
    expect(r.legendary).toBe(true);
  });

  it('tolerates persisted records that predate boxUps', () => {
    const legacy = { ...introduce(newSrsRecord(), NOW), boxUps: undefined } as unknown as Parameters<typeof grade>[0]['record'];
    const r = grade({ record: legacy, correct: true, now: NOW, rng: rng() });
    expect(r.box).toBe(2);
    expect(r.boxUps).toEqual([NOW]);
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
    grade({ record: r, correct: true, now: NOW, rng: rng() });
    expect(JSON.stringify(r)).toBe(snapshot);
  });
});
