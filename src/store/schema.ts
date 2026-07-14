// Persisted store schema (plan §5). Single versioned envelope in localStorage
// under key `bbgw`. SRS is keyed by player_id so roster changes = orphan
// pruning, not migration.

import type { SrsRecord } from '../engine/srs/types';
import type { StreakState } from '../engine/gamification/streak';

export const STORE_KEY = 'bbgw';
// v2: curriculum is hand-authored (themed units, owned/cameo). Units were
// redefined, so v1 path/SRS state is reset on upgrade (see migrations.ts).
// v3: SrsRecord gains `boxUps` (recent box-up timestamps for the daily
// advancement cap); existing records get an empty list.
export const SCHEMA_VERSION = 3;

export interface Settings {
  sound: boolean;
  haptics: boolean;
  dark: boolean;
}

export interface PersonalBests {
  bestXpDay: number;
  fastestPerfectMs: number | null;
  bestBlitz: number;
}

export interface ProfileState {
  totalXp: number;
  streak: StreakState;
  achievements: string[]; // unlocked ids
  bests: PersonalBests;
  settings: Settings;
  // counters feeding achievements
  lessonsCompleted: number;
  perfectLessonsInARow: number;
  legendaryUnitsCleared: number;
  jerseyCorrect: number;
  lastLessonHour: number | null;
  onboarded: boolean;
}

export interface PathState {
  // unit key -> completion record
  units: Record<
    string,
    { lessonsDone: number; quizPassed: boolean; legendary: boolean }
  >;
  checkpointsPassed: number[]; // act numbers
}

export interface PersistedState {
  version: number;
  players: Record<string, SrsRecord>; // by player_id
  profile: ProfileState;
  path: PathState;
}

export function defaultSettings(): Settings {
  return {
    sound: true,
    haptics: true,
    dark: false,
  };
}
