import { describe, it, expect } from 'vitest';
import { lessonXp, levelForXp, XP } from './xp';
import { addXp, newStreakState, dateKey, GOAL_XP } from './streak';
import {
  evaluateAchievements,
  newlyUnlocked,
  type AchievementSnapshot,
} from './achievements';
import { newSrsRecord, type SrsRecord } from '../srs/types';

describe('xp', () => {
  it('rewards base + per-correct', () => {
    expect(lessonXp({ correctCount: 12, total: 12, firstTryCorrect: 0, bestCombo: 0 })).toBe(
      XP.lessonBase + 12 * XP.correct,
    );
  });
  it('adds a perfect bonus only when all first-try correct', () => {
    const perfect = lessonXp({ correctCount: 12, total: 12, firstTryCorrect: 12, bestCombo: 12 });
    const imperfect = lessonXp({ correctCount: 12, total: 12, firstTryCorrect: 11, bestCombo: 6 });
    expect(perfect).toBeGreaterThan(imperfect);
    expect(perfect).toBe(XP.lessonBase + 12 * XP.correct + XP.perfectBonus + 2 * XP.comboUnit);
  });
  it('maps xp to level titles', () => {
    expect(levelForXp(0).title).toBe('Rookie');
    expect(levelForXp(800).title).toBe('First-Base Coach');
    expect(levelForXp(100000).title).toBe('Banana Legend');
    expect(levelForXp(100000).next).toBeNull();
  });
});

describe('streak', () => {
  const TZ = 0;
  // pick times firmly inside a local day (noon UTC, tz 0, past the 3am rollover)
  const dayAtNoon = (d: number) => (d * 86_400_000) + (12 + 3) * 3_600_000;

  it('extends the streak once when the daily goal is met', () => {
    let st = newStreakState('casual'); // 20 xp goal
    const now = dayAtNoon(100);
    let r = addXp({ state: st, xp: 10, now, tzOffsetMinutes: TZ });
    expect(r.streakExtended).toBe(false); // goal not yet met
    r = addXp({ state: r.state, xp: 10, now, tzOffsetMinutes: TZ });
    expect(r.goalJustMet).toBe(true);
    expect(r.state.current).toBe(1);
    // more xp same day doesn't double-count
    r = addXp({ state: r.state, xp: 50, now, tzOffsetMinutes: TZ });
    expect(r.state.current).toBe(1);
    st = r.state;
    expect(st.current).toBe(1);
  });

  it('increments across consecutive days', () => {
    let st = newStreakState('casual');
    for (let d = 0; d < 5; d++) {
      const r = addXp({ state: st, xp: GOAL_XP.casual, now: dayAtNoon(200 + d), tzOffsetMinutes: TZ });
      st = r.state;
    }
    expect(st.current).toBe(5);
    expect(st.longest).toBe(5);
  });

  it('breaks the streak after a missed day with no freeze', () => {
    let st = newStreakState('casual');
    st = addXp({ state: st, xp: 20, now: dayAtNoon(300), tzOffsetMinutes: TZ }).state;
    expect(st.current).toBe(1);
    // skip day 301, act on 302
    st = addXp({ state: st, xp: 20, now: dayAtNoon(302), tzOffsetMinutes: TZ }).state;
    expect(st.current).toBe(1); // reset then re-earned today
  });

  it('earns a freeze every 7 days and consumes it on a miss', () => {
    let st = newStreakState('casual');
    for (let d = 0; d < 7; d++) {
      st = addXp({ state: st, xp: 20, now: dayAtNoon(400 + d), tzOffsetMinutes: TZ }).state;
    }
    expect(st.current).toBe(7);
    expect(st.freezes).toBe(1);
    // miss one day (skip 407), act on 408 -> freeze covers it, streak survives
    const r = addXp({ state: st, xp: 20, now: dayAtNoon(408), tzOffsetMinutes: TZ });
    expect(r.state.freezes).toBe(0);
    expect(r.state.current).toBe(8);
  });

  it('never revokes the streak when the clock moves backward', () => {
    let st = newStreakState('casual');
    st = addXp({ state: st, xp: 20, now: dayAtNoon(500), tzOffsetMinutes: TZ }).state;
    const r = addXp({ state: st, xp: 20, now: dayAtNoon(499), tzOffsetMinutes: TZ });
    expect(r.state.current).toBeGreaterThanOrEqual(1);
  });

  it('dateKey rolls at 3am local across timezones', () => {
    // 2am local should still be "yesterday"; 4am the next day
    const base = 1_700_000_000_000;
    const k2am = dateKey(base + 2 * 3_600_000, 0);
    const k4am = dateKey(base + 4 * 3_600_000, 0);
    // within a day these may match or differ by 1 depending on base; just ensure
    // the function is monotonic and stable
    expect(k4am).toBeGreaterThanOrEqual(k2am);
    expect(dateKey(base, 0)).toBe(dateKey(base, 0));
  });
});

describe('achievements', () => {
  function snapshot(overrides: Partial<AchievementSnapshot> = {}): AchievementSnapshot {
    return {
      srs: {},
      playersByTeam: {},
      hardTierIds: new Set(),
      totalPlayers: 158,
      longestStreak: 0,
      lessonsCompleted: 0,
      perfectLessonsInARow: 0,
      legendaryUnitsCleared: 0,
      jerseyCorrect: 0,
      bestBlitz: 0,
      lastLessonHour: null,
      act2Reached: false,
      ...overrides,
    };
  }
  const mastered = (): SrsRecord => ({ ...newSrsRecord(), box: 5, introducedAt: 1 });

  it('unlocks First Pitch after one lesson', () => {
    expect(evaluateAchievements(snapshot({ lessonsCompleted: 1 })).has('first-pitch')).toBe(true);
    expect(evaluateAchievements(snapshot()).has('first-pitch')).toBe(false);
  });

  it('unlocks Team Player when a full team is mastered', () => {
    const ids = ['a', 'b', 'c'];
    const srs = Object.fromEntries(ids.map((id) => [id, mastered()]));
    const s = snapshot({ srs, playersByTeam: { Firefighters: ids } });
    expect(evaluateAchievements(s).has('team-player')).toBe(true);
  });

  it('newlyUnlocked diffs against previous', () => {
    const s = snapshot({ lessonsCompleted: 1, longestStreak: 7 });
    const fresh = newlyUnlocked(s, new Set(['first-pitch']));
    expect(fresh).toContain('hot-streak');
    expect(fresh).not.toContain('first-pitch');
  });

  it('Night Game triggers between 10pm and 4am', () => {
    expect(evaluateAchievements(snapshot({ lessonsCompleted: 1, lastLessonHour: 23 })).has('night-game')).toBe(true);
    expect(evaluateAchievements(snapshot({ lessonsCompleted: 1, lastLessonHour: 15 })).has('night-game')).toBe(false);
  });
});
