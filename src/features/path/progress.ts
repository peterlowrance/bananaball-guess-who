// Derives per-unit path status (locked / active / complete) from store state.
// Pure given (units, pathState, srs). A unit is:
//   - complete: its quiz has been passed
//   - active: the first not-complete unit (or any unit after an unlocked one)
//   - locked: comes after the current active unit and isn't complete
// Unlock rule: linear — you may play the first incomplete unit; the next
// unlocks once the current unit's quiz is passed.

import type { Unit } from '../../data/curriculum';
import type { PathState } from '../../store/schema';
import type { SrsRecord } from '../../engine/srs/types';

export type UnitStatus = 'locked' | 'active' | 'complete';

export interface UnitProgress {
  unit: Unit;
  status: UnitStatus;
  lessonsDone: number;
  quizPassed: boolean;
  /** how many of the unit's players are introduced */
  introduced: number;
  /** how many are mastered (box 5) */
  mastered: number;
  /** whether all lessons are done and the quiz is available */
  quizUnlocked: boolean;
  legendary: boolean;
}

const LESSONS_PER_UNIT = 2; // learn lessons before the quiz (plan §2.4/§3.4)

export function computePathProgress(
  units: readonly Unit[],
  path: PathState,
  srs: Record<string, SrsRecord>,
): UnitProgress[] {
  let unlockedReached = false; // once we hit the first incomplete unit, later ones lock
  return units.map((u) => {
    const rec = path.units[u.key] ?? { lessonsDone: 0, quizPassed: false, legendary: false };
    const introduced = u.playerIds.filter((id) => srs[id]?.introducedAt != null).length;
    const mastered = u.playerIds.filter((id) => (srs[id]?.box ?? 0) >= 5).length;
    const quizUnlocked = rec.lessonsDone >= LESSONS_PER_UNIT;

    let status: UnitStatus;
    if (rec.quizPassed) {
      status = 'complete';
    } else if (!unlockedReached) {
      status = 'active';
      unlockedReached = true;
    } else {
      status = 'locked';
    }

    return {
      unit: u,
      status,
      lessonsDone: rec.lessonsDone,
      quizPassed: rec.quizPassed,
      introduced,
      mastered,
      quizUnlocked,
      legendary: rec.legendary,
    };
  });
}

export { LESSONS_PER_UNIT };
