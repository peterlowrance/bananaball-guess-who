import { describe, it, expect } from 'vitest';
import { migrate, coerce, freshState } from './migrations';
import { SCHEMA_VERSION } from './schema';

describe('migrations', () => {
  it('fresh state is at the current version with sane defaults', () => {
    const s = freshState();
    expect(s.version).toBe(SCHEMA_VERSION);
    expect(s.players).toEqual({});
    expect(s.profile.totalXp).toBe(0);
    expect(s.profile.settings.sound).toBe(true);
    expect(s.path.units).toEqual({});
  });

  it('coerces a partial payload without throwing', () => {
    const s = coerce({ version: 1, profile: { totalXp: 500 } });
    expect(s.profile.totalXp).toBe(500);
    expect(s.profile.settings).toBeDefined(); // filled from defaults
    expect(s.profile.streak).toBeDefined();
    expect(s.players).toEqual({});
  });

  it('migrates a version-0 (no version field) payload up to current', () => {
    const s = migrate({ players: { p1: { box: 3 } } } as unknown);
    expect(s.version).toBe(SCHEMA_VERSION);
  });

  it('1 -> 2 is a full reset (curriculum was redefined)', () => {
    // A v1 payload with real progress is intentionally wiped: unit keys and
    // membership changed, so old path/SRS state can't be remapped.
    const v1 = {
      version: 1,
      players: { p1: { box: 4 } },
      profile: { totalXp: 5000, onboarded: true },
      path: { units: { u_old: { lessonsDone: 2, quizPassed: true, legendary: false } }, checkpointsPassed: [1] },
    };
    const s = migrate(v1 as unknown);
    expect(s.version).toBe(SCHEMA_VERSION);
    expect(s.players).toEqual({});
    expect(s.profile.totalXp).toBe(0);
    expect(s.path.units).toEqual({});
    expect(s.path.checkpointsPassed).toEqual([]);
  });

  it('returns fresh state for non-object input', () => {
    expect(migrate(null).version).toBe(SCHEMA_VERSION);
    expect(migrate('garbage').version).toBe(SCHEMA_VERSION);
    expect(migrate(42).version).toBe(SCHEMA_VERSION);
  });

  it('round-trips a full state through JSON without loss', () => {
    const original = freshState();
    original.profile.totalXp = 1234;
    original.players['abc'] = {
      box: 4,
      due: 999,
      seen: 5,
      correct: 4,
      lastWrongWith: ['x'],
      legendary: true,
      introducedAt: 100,
    };
    const restored = migrate(JSON.parse(JSON.stringify(original)));
    expect(restored.profile.totalXp).toBe(1234);
    expect(restored.players['abc'].box).toBe(4);
    expect(restored.players['abc'].legendary).toBe(true);
  });

  it('preserves unknown-but-valid future settings via defaults merge', () => {
    const s = coerce({ version: 1, profile: { settings: { dark: true } } });
    expect(s.profile.settings.dark).toBe(true);
    expect(s.profile.settings.sound).toBe(true); // default preserved
  });
});
