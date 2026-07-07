// Streak + daily-goal logic (plan §3.6, §3.11). Pure. Uses local calendar days
// with a 3am rollover; never revokes a streak on clock skew (fails in the
// user's favor).

export type Goal = 'casual' | 'regular' | 'fanatic';
export const GOAL_XP: Record<Goal, number> = { casual: 20, regular: 40, fanatic: 60 };

const DAY = 86_400_000;
const ROLLOVER_HOURS = 3; // day flips at 3am local

export interface StreakState {
  current: number;
  longest: number;
  freezes: number;
  lastActiveDay: number | null; // dateKey of the last day the goal was met
  xpToday: number;
  todayKey: number | null; // dateKey the xpToday belongs to
  goal: Goal;
}

export function newStreakState(goal: Goal = 'regular'): StreakState {
  return {
    current: 0,
    longest: 0,
    freezes: 0,
    lastActiveDay: null,
    xpToday: 0,
    todayKey: null,
    goal,
  };
}

/** Integer day index in local time, with a 3am rollover. */
export function dateKey(now: number, tzOffsetMinutes: number): number {
  // shift by timezone and the rollover so "3am boundary" aligns to local day
  const localMs = now - tzOffsetMinutes * 60_000 - ROLLOVER_HOURS * 3_600_000;
  return Math.floor(localMs / DAY);
}

const MAX_FREEZES = 2;

export interface AddXpInput {
  state: StreakState;
  xp: number;
  now: number;
  tzOffsetMinutes: number;
}

export interface AddXpResult {
  state: StreakState;
  goalJustMet: boolean;
  streakExtended: boolean;
  freezeEarned: boolean;
}

/**
 * Record XP earned now. Rolls the day if needed (consuming a freeze or breaking
 * the streak for missed days), accumulates xpToday, and extends the streak the
 * first time today's goal is met.
 */
export function addXp(input: AddXpInput): AddXpResult {
  const { xp, now, tzOffsetMinutes } = input;
  const today = dateKey(now, tzOffsetMinutes);
  let s: StreakState = { ...input.state };
  let freezeEarned = false;

  // Day rollover: reset xpToday and reconcile the streak against missed days.
  if (s.todayKey === null) {
    s.todayKey = today;
    s.xpToday = 0;
  } else if (today > s.todayKey) {
    // How many active-day gaps since we last met the goal?
    if (s.lastActiveDay !== null) {
      const missed = today - s.lastActiveDay - 1; // full days skipped
      if (missed >= 1 && s.current > 0) {
        // consume freezes to cover missed days, else break
        if (s.freezes >= missed) {
          s.freezes -= missed;
        } else {
          s.current = 0;
        }
      }
    }
    s.todayKey = today;
    s.xpToday = 0;
  } else if (today < s.todayKey) {
    // clock moved backwards — do not penalize; keep the later day.
    today; // no-op; keep s.todayKey
  }

  const wasMet = s.xpToday >= GOAL_XP[s.goal];
  s.xpToday += Math.max(0, xp);
  const nowMet = s.xpToday >= GOAL_XP[s.goal];

  let goalJustMet = false;
  let streakExtended = false;
  if (!wasMet && nowMet) {
    goalJustMet = true;
    if (s.lastActiveDay !== s.todayKey) {
      s.current += 1;
      s.longest = Math.max(s.longest, s.current);
      s.lastActiveDay = s.todayKey;
      streakExtended = true;
      // earn a freeze every 7 consecutive days (banked up to MAX_FREEZES)
      if (s.current % 7 === 0 && s.freezes < MAX_FREEZES) {
        s.freezes += 1;
        freezeEarned = true;
      }
    }
  }

  return { state: s, goalJustMet, streakExtended, freezeEarned };
}
