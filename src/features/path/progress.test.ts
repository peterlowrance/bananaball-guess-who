import { describe, it, expect } from 'vitest';
import { computePathProgress } from './progress';
import { curriculumUnits } from './units';
import type { PathState } from '../../store/schema';
import { newSrsRecord } from '../../engine/srs/types';

const units = curriculumUnits();
const emptyPath: PathState = { units: {}, checkpointsPassed: [] };

/** srs map with the given ids introduced (box 1). */
function introduced(ids: string[]) {
  return Object.fromEntries(ids.map((id) => [id, { ...newSrsRecord(), box: 1, introducedAt: 1 }]));
}

describe('computePathProgress', () => {
  it('first unit is active, rest locked, with no progress', () => {
    const p = computePathProgress(units, emptyPath, {});
    expect(p[0].status).toBe('active');
    expect(p[1].status).toBe('locked');
    expect(p.slice(2).every((u) => u.status === 'locked')).toBe(true);
  });

  it('passing a unit quiz completes it and unlocks the next', () => {
    const path: PathState = {
      units: { [units[0].key]: { lessonsDone: 2, quizPassed: true, legendary: false } },
      checkpointsPassed: [],
    };
    const p = computePathProgress(units, path, {});
    expect(p[0].status).toBe('complete');
    expect(p[1].status).toBe('active');
    expect(p[2].status).toBe('locked');
  });

  it('quiz unlocks only once ALL owned players are introduced', () => {
    const first = units[0];
    // one player short — quiz stays locked
    const partial = introduced(first.playerIds.slice(0, -1));
    expect(computePathProgress(units, emptyPath, partial)[0].quizUnlocked).toBe(false);
    // all introduced — quiz unlocks (regardless of lesson count)
    const all = introduced(first.playerIds);
    expect(computePathProgress(units, emptyPath, all)[0].quizUnlocked).toBe(true);
  });

  it('counts mastered/introduced players over owned ids', () => {
    const first = units[0];
    const srs = Object.fromEntries(
      first.playerIds.map((id) => [id, { ...newSrsRecord(), box: 5, introducedAt: 1 }]),
    );
    const p = computePathProgress(units, emptyPath, srs);
    expect(p[0].mastered).toBe(first.playerIds.length);
    expect(p[0].introduced).toBe(first.playerIds.length);
    expect(p[0].owned).toBe(first.playerIds.length);
  });
});
