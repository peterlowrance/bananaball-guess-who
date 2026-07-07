// Achievements (plan §3.6). Pure evaluation: given a snapshot of progress,
// return the set of achievement ids that are currently earned. The store diffs
// this against previously-unlocked to surface "newly unlocked" toasts.

import type { SrsRecord } from '../srs/types';

export interface AchievementSnapshot {
  srs: Record<string, SrsRecord>; // by player_id
  playersByTeam: Record<string, string[]>; // team_name -> player_ids
  hardTierIds: ReadonlySet<string>;
  totalPlayers: number;
  longestStreak: number;
  lessonsCompleted: number;
  perfectLessonsInARow: number;
  legendaryUnitsCleared: number;
  jerseyCorrect: number;
  bestBlitz: number;
  lastLessonHour: number | null; // 0-23 local hour of last lesson finish
  act2Reached: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  hint: string;
  earned: (s: AchievementSnapshot) => boolean;
}

const masteredCount = (s: AchievementSnapshot) =>
  Object.values(s.srs).filter((r) => r.box >= 5).length;
const introducedCount = (s: AchievementSnapshot) =>
  Object.values(s.srs).filter((r) => r.introducedAt !== null).length;

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'first-pitch', name: 'First Pitch', hint: 'Complete your first lesson.', earned: (s) => s.lessonsCompleted >= 1 },
  { id: 'hot-streak', name: 'Hot Streak', hint: 'Reach a 7-day streak.', earned: (s) => s.longestStreak >= 7 },
  { id: 'eternal-flame', name: 'Eternal Flame', hint: 'Reach a 30-day streak.', earned: (s) => s.longestStreak >= 30 },
  { id: 'peeled-back', name: 'Peeled Back', hint: 'Master 10 players.', earned: (s) => masteredCount(s) >= 10 },
  {
    id: 'team-player',
    name: 'Team Player',
    hint: 'Master every player on one team.',
    earned: (s) =>
      Object.values(s.playersByTeam).some(
        (ids) => ids.length > 0 && ids.every((id) => (s.srs[id]?.box ?? 0) >= 5),
      ),
  },
  { id: 'full-roster', name: 'Full Roster', hint: 'Meet all players.', earned: (s) => introducedCount(s) >= s.totalPlayers },
  { id: 'completionist', name: 'The Completionist', hint: 'Master all players.', earned: (s) => masteredCount(s) >= s.totalPlayers },
  { id: 'perfect-game', name: 'Perfect Game', hint: '3 perfect lessons in a row.', earned: (s) => s.perfectLessonsInARow >= 3 },
  { id: 'no-autographs', name: 'No Autographs, Please', hint: 'Clear a Legendary unit.', earned: (s) => s.legendaryUnitsCleared >= 1 },
  {
    id: 'deep-cut',
    name: 'Deep Cut',
    hint: 'Master a hard player early — before you finish the medium ones.',
    earned: (s) =>
      !s.act2Reached &&
      Object.entries(s.srs).some(([id, r]) => r.box >= 5 && s.hardTierIds.has(id)),
  },
  { id: 'number-cruncher', name: 'Number Cruncher', hint: 'Answer 25 jersey questions correctly.', earned: (s) => s.jerseyCorrect >= 25 },
  {
    id: 'night-game',
    name: 'Night Game',
    hint: 'Finish a lesson between 10pm and 4am.',
    earned: (s) => s.lastLessonHour !== null && (s.lastLessonHour >= 22 || s.lastLessonHour < 4),
  },
  { id: 'speed-round', name: 'Speed Round', hint: 'Score 20+ in Face Blitz.', earned: (s) => s.bestBlitz >= 20 },
];

/** Returns the set of currently-earned achievement ids. */
export function evaluateAchievements(s: AchievementSnapshot): Set<string> {
  const earned = new Set<string>();
  for (const a of ACHIEVEMENTS) if (a.earned(s)) earned.add(a.id);
  return earned;
}

/** Newly-unlocked ids: earned now but not in the previously-unlocked set. */
export function newlyUnlocked(
  s: AchievementSnapshot,
  previous: ReadonlySet<string>,
): string[] {
  const now = evaluateAchievements(s);
  return [...now].filter((id) => !previous.has(id));
}
