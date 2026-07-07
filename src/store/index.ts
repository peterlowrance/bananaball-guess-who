// The app store: zustand + persist, wrapping the pure engine. Actions mutate
// persisted state via the engine's pure functions. Non-persisted transient
// session data lives in a separate `useSession` store (session.ts).

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  STORE_KEY,
  SCHEMA_VERSION,
  defaultSettings,
  type PersistedState,
  type Settings,
} from './schema';
import { migrate, freshState } from './migrations';
import { newStreakState, addXp, type Goal } from '../engine/gamification/streak';
import { levelForXp } from '../engine/gamification/xp';
import {
  evaluateAchievements,
  type AchievementSnapshot,
} from '../engine/gamification/achievements';
import { newSrsRecord, type SrsRecord } from '../engine/srs/types';
import { grade as srsGrade, introduce as srsIntroduce, type GradeInput } from '../engine/srs/scheduler';
import { mulberry32 } from '../engine/rng';
import { players, playersByTeamId, playersByDifficulty, teamById } from '../data/dataset';

const now = () => Date.now();
const tz = () => new Date().getTimezoneOffset();
// A per-call rng seed derived from the clock; grading jitter needn't be
// reproducible across app runs (only content generation is seeded explicitly).
const clockRng = () => mulberry32((now() ^ (now() >>> 3)) >>> 0);

export interface GradeArgs {
  playerId: string;
  correct: boolean;
  typed?: boolean;
  confusedWith?: string | null;
  isReview?: boolean;
  jerseyQuestion?: boolean;
}

export interface LessonFinish {
  correctCount: number;
  total: number;
  firstTryCorrect: number;
  bestCombo: number;
  xp: number;
  legendaryCleared?: boolean;
  unitKey?: string;
  finishHour: number;
}

interface StoreActions {
  srsFor(playerId: string): SrsRecord;
  introducePlayer(playerId: string): void;
  gradeAnswer(args: GradeArgs): void;
  finishLesson(f: LessonFinish): { newlyUnlocked: string[]; streakExtended: boolean };
  markUnitLesson(unitKey: string): void;
  passUnitQuiz(unitKey: string): void;
  passCheckpoint(act: number): void;
  setSettings(patch: Partial<Settings>): void;
  setGoal(goal: Goal): void;
  setOnboarded(v: boolean): void;
  resetProgress(): void;
  importState(json: string): boolean;
  exportState(): string;
}

export type Store = PersistedState & StoreActions;

function achievementSnapshot(s: PersistedState): AchievementSnapshot {
  const playersByTeam: Record<string, string[]> = {};
  for (const [teamId, list] of playersByTeamId) {
    const team = teamById.get(teamId)!;
    playersByTeam[team.name] = list.map((p) => p.player_id);
  }
  const hardTierIds = new Set((playersByDifficulty.get('hard') ?? []).map((p) => p.player_id));
  return {
    srs: s.players,
    playersByTeam,
    hardTierIds,
    totalPlayers: players.length,
    longestStreak: s.profile.streak.longest,
    lessonsCompleted: s.profile.lessonsCompleted,
    perfectLessonsInARow: s.profile.perfectLessonsInARow,
    legendaryUnitsCleared: s.profile.legendaryUnitsCleared,
    jerseyCorrect: s.profile.jerseyCorrect,
    bestBlitz: s.profile.bests.bestBlitz,
    lastLessonHour: s.profile.lastLessonHour,
    act2Reached: s.path.checkpointsPassed.includes(1),
  };
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...freshState(),

      srsFor(playerId) {
        return get().players[playerId] ?? newSrsRecord();
      },

      introducePlayer(playerId) {
        set((s) => {
          const rec = s.players[playerId] ?? newSrsRecord();
          if (rec.introducedAt !== null) return s;
          return { players: { ...s.players, [playerId]: srsIntroduce(rec, now()) } };
        });
      },

      gradeAnswer(args) {
        set((s) => {
          const rec = s.players[args.playerId] ?? newSrsRecord();
          const input: GradeInput = {
            record: rec,
            correct: args.correct,
            now: now(),
            rng: clockRng(),
            typed: args.typed,
            confusedWith: args.confusedWith,
            isReview: args.isReview,
          };
          const updated = srsGrade(input);
          const jerseyCorrect =
            s.profile.jerseyCorrect + (args.jerseyQuestion && args.correct ? 1 : 0);
          return {
            players: { ...s.players, [args.playerId]: updated },
            profile: { ...s.profile, jerseyCorrect },
          };
        });
      },

      finishLesson(f) {
        const before = get();
        const prevAch = new Set(before.profile.achievements);

        // streak + xp
        const streakRes = addXp({
          state: before.profile.streak,
          xp: f.xp,
          now: now(),
          tzOffsetMinutes: tz(),
        });
        const totalXp = before.profile.totalXp + f.xp;
        const perfect = f.firstTryCorrect === f.total && f.total > 0;

        const profile = {
          ...before.profile,
          totalXp,
          streak: streakRes.state,
          lessonsCompleted: before.profile.lessonsCompleted + 1,
          perfectLessonsInARow: perfect ? before.profile.perfectLessonsInARow + 1 : 0,
          legendaryUnitsCleared:
            before.profile.legendaryUnitsCleared + (f.legendaryCleared ? 1 : 0),
          lastLessonHour: f.finishHour,
          bests: {
            ...before.profile.bests,
            bestXpDay: Math.max(before.profile.bests.bestXpDay, streakRes.state.xpToday),
            fastestPerfectMs: before.profile.bests.fastestPerfectMs, // set by lesson timer elsewhere
          },
        };

        const nextState: PersistedState = { ...before, profile };
        const earned = evaluateAchievements(achievementSnapshot(nextState));
        const newly = [...earned].filter((id) => !prevAch.has(id));
        profile.achievements = [...new Set([...before.profile.achievements, ...earned])];

        set({ profile });
        return { newlyUnlocked: newly, streakExtended: streakRes.streakExtended };
      },

      markUnitLesson(unitKey) {
        set((s) => {
          const u = s.path.units[unitKey] ?? { lessonsDone: 0, quizPassed: false, legendary: false };
          return {
            path: {
              ...s.path,
              units: { ...s.path.units, [unitKey]: { ...u, lessonsDone: u.lessonsDone + 1 } },
            },
          };
        });
      },

      passUnitQuiz(unitKey) {
        set((s) => {
          const u = s.path.units[unitKey] ?? { lessonsDone: 0, quizPassed: false, legendary: false };
          return {
            path: {
              ...s.path,
              units: { ...s.path.units, [unitKey]: { ...u, quizPassed: true } },
            },
          };
        });
      },

      passCheckpoint(act) {
        set((s) => ({
          path: {
            ...s.path,
            checkpointsPassed: [...new Set([...s.path.checkpointsPassed, act])],
          },
        }));
      },

      setSettings(patch) {
        set((s) => ({ profile: { ...s.profile, settings: { ...s.profile.settings, ...patch } } }));
      },

      setGoal(goal) {
        set((s) => ({
          profile: { ...s.profile, streak: { ...s.profile.streak, goal } },
        }));
      },

      setOnboarded(v) {
        set((s) => ({ profile: { ...s.profile, onboarded: v } }));
      },

      resetProgress() {
        const fresh = freshState();
        set({ players: fresh.players, profile: fresh.profile, path: fresh.path });
      },

      exportState() {
        const s = get();
        const payload: PersistedState = {
          version: SCHEMA_VERSION,
          players: s.players,
          profile: s.profile,
          path: s.path,
        };
        return JSON.stringify(payload);
      },

      importState(json) {
        try {
          const parsed = JSON.parse(json);
          const migrated = migrate(parsed);
          set({ players: migrated.players, profile: migrated.profile, path: migrated.path });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: STORE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => resilientStorage()),
      // Only persist data, not action methods.
      partialize: (s) => ({
        version: SCHEMA_VERSION,
        players: s.players,
        profile: s.profile,
        path: s.path,
      }),
      migrate: (persisted) => migrate(persisted) as unknown as Store,
    },
  ),
);

/** localStorage with corrupt-payload recovery: on parse failure, back up the
 *  bad blob and start fresh so the app never bricks. Methods are bound
 *  explicitly (spreading a Storage drops its prototype methods). */
function resilientStorage(): Storage {
  const ls = typeof localStorage !== 'undefined' ? localStorage : undefined;
  if (!ls) return memoryStorage();
  return {
    get length() {
      return ls.length;
    },
    clear: () => ls.clear(),
    key: (i: number) => ls.key(i),
    setItem: (k: string, v: string) => {
      try {
        ls.setItem(k, v);
      } catch {
        // quota exceeded / private mode — surfaced to the user via a banner
        // elsewhere; we drop silently here so the app keeps running in-memory.
      }
    },
    removeItem: (k: string) => ls.removeItem(k),
    getItem: (key: string) => {
      const raw = ls.getItem(key);
      if (raw == null) return raw;
      try {
        JSON.parse(raw);
        return raw;
      } catch {
        ls.setItem(`${key}.corrupt`, raw);
        ls.removeItem(key);
        return null;
      }
    },
  };
}

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
}

// convenience selectors
export const selectLevel = (s: Store) => levelForXp(s.profile.totalXp);
export { defaultSettings, newStreakState };
