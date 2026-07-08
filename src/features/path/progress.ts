// Derives per-unit path status (locked / active / complete) from store state.
// Pure given (units, pathState, srs). A unit is:
//   - complete: its quiz has been passed
//   - active: the first not-complete unit
//   - locked: comes after the current active unit and isn't complete
// Unlock rule: linear — you may play the first incomplete unit; the next
// unlocks once the current unit's quiz is passed.
//
// The quiz for a unit unlocks once ALL of the unit's OWNED players have been
// introduced (not after a fixed lesson count) — so you can never reach the
// checkpoint with un-taught players. Cameo players are review flavor only and
// never gate or count toward the unit.

import type { Unit } from '../../data/curriculum';
import type { PathState } from '../../store/schema';
import type { SrsRecord } from '../../engine/srs/types';

export type UnitStatus = 'locked' | 'active' | 'complete';

export interface UnitProgress {
  unit: Unit;
  status: UnitStatus;
  lessonsDone: number;
  quizPassed: boolean;
  /** how many of the unit's OWNED players are introduced */
  introduced: number;
  /** how many OWNED players are mastered (box 5) */
  mastered: number;
  /** total owned players (the "/N" denominator) */
  owned: number;
  /** whether all owned players are introduced and the quiz is available */
  quizUnlocked: boolean;
  legendary: boolean;
}

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
    const owned = u.playerIds.length;
    const quizUnlocked = owned > 0 && introduced >= owned;

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
      owned,
      quizUnlocked,
      legendary: rec.legendary,
    };
  });
}
