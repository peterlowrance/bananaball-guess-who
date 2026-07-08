import { describe, it, expect, beforeEach, vi } from 'vitest';

// Minimal localStorage shim so the persisted store works in the node project.
class MemLS {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}
vi.stubGlobal('localStorage', new MemLS());

// import after the shim is in place
const { useStore } = await import('./index');
const { players } = await import('../data/dataset');

const reset = () => useStore.getState().resetProgress();

describe('store actions', () => {
  beforeEach(reset);

  it('introduces a player idempotently', () => {
    const id = players[0].player_id;
    useStore.getState().introducePlayer(id);
    const first = useStore.getState().srsFor(id);
    expect(first.introducedAt).not.toBeNull();
    expect(first.box).toBe(1);
    useStore.getState().introducePlayer(id);
    expect(useStore.getState().srsFor(id).introducedAt).toBe(first.introducedAt);
  });

  it('grades an answer and advances the box on a correct review', () => {
    const id = players[1].player_id;
    useStore.getState().introducePlayer(id);
    useStore.getState().gradeAnswer({ playerId: id, correct: true, isReview: true });
    expect(useStore.getState().srsFor(id).box).toBe(2);
  });

  it('counts jersey-correct answers for the achievement', () => {
    const id = players[2].player_id;
    useStore.getState().gradeAnswer({ playerId: id, correct: true, jerseyQuestion: true });
    expect(useStore.getState().profile.jerseyCorrect).toBe(1);
    useStore.getState().gradeAnswer({ playerId: id, correct: false, jerseyQuestion: true });
    expect(useStore.getState().profile.jerseyCorrect).toBe(1); // wrong doesn't count
  });

  it('finishing a lesson awards XP, extends streak, unlocks First Pitch', () => {
    const res = useStore.getState().finishLesson({
      correctCount: 12,
      total: 12,
      firstTryCorrect: 12,
      bestCombo: 12,
      xp: 44,
      finishHour: 14,
    });
    const p = useStore.getState().profile;
    // 44 base + 5 first-of-day bonus (added by the store, once per day)
    expect(p.totalXp).toBe(49);
    expect(res.awardedXp).toBe(49);
    expect(p.lessonsCompleted).toBe(1);
    expect(p.achievements).toContain('first-pitch');
    expect(res.newlyUnlocked).toContain('first-pitch');
    expect(res.streakExtended).toBe(true);
  });

  it('adds the first-of-day bonus only once per day', () => {
    const fin = () =>
      useStore.getState().finishLesson({
        correctCount: 10, total: 12, firstTryCorrect: 10, bestCombo: 4, xp: 20, finishHour: 12,
      });
    fin();
    const afterFirst = useStore.getState().profile.totalXp; // 20 + 5
    const res2 = fin();
    expect(res2.awardedXp).toBe(20); // no bonus the second time same day
    expect(useStore.getState().profile.totalXp).toBe(afterFirst + 20);
  });

  it('tracks perfect-lessons-in-a-row and resets on imperfect', () => {
    const finish = (perfect: boolean) =>
      useStore.getState().finishLesson({
        correctCount: 12,
        total: 12,
        firstTryCorrect: perfect ? 12 : 10,
        bestCombo: 5,
        xp: 40,
        finishHour: 12,
      });
    finish(true);
    finish(true);
    expect(useStore.getState().profile.perfectLessonsInARow).toBe(2);
    finish(false);
    expect(useStore.getState().profile.perfectLessonsInARow).toBe(0);
  });

  it('records unit progress and quiz passes', () => {
    useStore.getState().markUnitLesson('u_test');
    useStore.getState().markUnitLesson('u_test');
    useStore.getState().passUnitQuiz('u_test');
    const u = useStore.getState().path.units['u_test'];
    expect(u.lessonsDone).toBe(2);
    expect(u.quizPassed).toBe(true);
  });

  it('export/import round-trips state', () => {
    const id = players[3].player_id;
    useStore.getState().introducePlayer(id);
    useStore.getState().finishLesson({
      correctCount: 5,
      total: 12,
      firstTryCorrect: 5,
      bestCombo: 3,
      xp: 20,
      finishHour: 9,
    });
    const exportedXp = useStore.getState().profile.totalXp; // 20 + 5 first-of-day
    const blob = useStore.getState().exportState();
    reset();
    expect(useStore.getState().profile.totalXp).toBe(0);
    expect(useStore.getState().importState(blob)).toBe(true);
    expect(useStore.getState().profile.totalXp).toBe(exportedXp);
    expect(useStore.getState().srsFor(id).introducedAt).not.toBeNull();
  });

  it('import rejects garbage without throwing', () => {
    expect(useStore.getState().importState('{not json')).toBe(false);
  });

  it('settings patch merges', () => {
    useStore.getState().setSettings({ dark: true });
    const st = useStore.getState().profile.settings;
    expect(st.dark).toBe(true);
    expect(st.sound).toBe(true); // untouched
  });
});
