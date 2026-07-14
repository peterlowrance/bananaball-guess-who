// Versioned localStorage migrations (plan §5). Pure functions keyed by the
// version they upgrade FROM. Run in sequence until the payload reaches the
// current SCHEMA_VERSION. A corrupt/unknown payload is handled by the caller
// (backup to `bbgw.corrupt` + fresh start).

import { SCHEMA_VERSION, defaultSettings, type PersistedState } from './schema';
import { newStreakState } from '../engine/gamification/streak';

type AnyState = Record<string, unknown>;

/** migration[n] upgrades a state at version n -> n+1 */
export const MIGRATIONS: Record<number, (s: AnyState) => AnyState> = {
  // 0 -> 1: initial shape. (No prior versions shipped; kept as an example of
  // how future migrations attach.)
  0: (s) => ({ ...s, version: 1 }),
  // 1 -> 2: the curriculum moved from a generated (popularity) path to
  // hand-authored themed units with owned/cameo rosters. Unit keys and
  // membership are entirely redefined, so v1 progress can't be remapped
  // meaningfully — reset to a fresh state. (Intentional full reset.)
  1: () => ({ ...(freshState() as unknown as AnyState) }),
  // 2 -> 3: SrsRecord gains `boxUps` (recent box-up timestamps for the daily
  // advancement cap). Existing records start with an empty history.
  2: (s) => {
    const players = Object.fromEntries(
      Object.entries((s.players as Record<string, AnyState>) ?? {}).map(([id, rec]) => [
        id,
        { boxUps: [], ...rec },
      ]),
    );
    return { ...s, players, version: 3 };
  },
};

export function migrate(raw: unknown): PersistedState {
  if (!raw || typeof raw !== 'object') return freshState();
  let s = raw as AnyState;
  let v = typeof s.version === 'number' ? s.version : 0;
  while (v < SCHEMA_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) break; // no path; caller will decide to reset
    s = step(s);
    v = typeof s.version === 'number' ? s.version : v + 1;
  }
  return coerce(s);
}

/** Fill any missing fields so the app never reads undefined off the store. */
export function coerce(s: AnyState): PersistedState {
  const profile = (s.profile ?? {}) as AnyState;
  const bests = (profile.bests ?? {}) as AnyState;
  const path = (s.path ?? {}) as AnyState;
  return {
    version: SCHEMA_VERSION,
    players: (s.players as PersistedState['players']) ?? {},
    profile: {
      totalXp: (profile.totalXp as number) ?? 0,
      streak: (profile.streak as PersistedState['profile']['streak']) ?? newStreakState(),
      achievements: (profile.achievements as string[]) ?? [],
      bests: {
        bestXpDay: (bests.bestXpDay as number) ?? 0,
        fastestPerfectMs: (bests.fastestPerfectMs as number | null) ?? null,
        bestBlitz: (bests.bestBlitz as number) ?? 0,
      },
      settings: { ...defaultSettings(), ...(profile.settings as object) },
      lessonsCompleted: (profile.lessonsCompleted as number) ?? 0,
      perfectLessonsInARow: (profile.perfectLessonsInARow as number) ?? 0,
      legendaryUnitsCleared: (profile.legendaryUnitsCleared as number) ?? 0,
      jerseyCorrect: (profile.jerseyCorrect as number) ?? 0,
      lastLessonHour: (profile.lastLessonHour as number | null) ?? null,
      onboarded: (profile.onboarded as boolean) ?? false,
    },
    path: {
      units: (path.units as PathUnits) ?? {},
      checkpointsPassed: (path.checkpointsPassed as number[]) ?? [],
    },
  };
}

type PathUnits = PersistedState['path']['units'];

export function freshState(): PersistedState {
  return coerce({ version: SCHEMA_VERSION });
}
