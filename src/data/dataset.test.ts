import { describe, it, expect } from 'vitest';
import dataset from './players-2026.json';

// Guards the shape the whole app depends on. If the research pipeline is
// re-run and changes the schema, these fail loudly before the app breaks.
describe('players-2026 dataset', () => {
  it('has 6 teams and 158 players', () => {
    expect(dataset.teams).toHaveLength(6);
    expect(dataset.players).toHaveLength(158);
  });

  it('every player has the fields the engine relies on', () => {
    for (const p of dataset.players) {
      expect(p.player_id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.team_name).toBeTruthy();
      // images[] holds verified photos (stats headshot and/or official media-day
      // shot); it may be empty for a player with no real photo anywhere (e.g. a
      // mascot). Every entry must be an https image URL, and image_url mirrors
      // the first entry (or null when empty).
      expect(Array.isArray(p.images)).toBe(true);
      for (const url of p.images) {
        expect(url).toMatch(/^https:\/\/.+/);
      }
      expect(p.image_url).toBe(p.images[0] ?? null);
      expect(['easy', 'medium', 'hard']).toContain(p.difficulty);
      expect(typeof p.jersey_number).toBe('number');
    }
  });

  it('all but a tiny number of players have at least one photo', () => {
    const noPhoto = dataset.players.filter((p) => p.images.length === 0);
    // Only genuine no-photo cases (mascots) may lack an image; keep this tight
    // so a pipeline regression that strips everyone's photos fails loudly.
    expect(noPhoto.length).toBeLessThanOrEqual(2);
  });

  it('adds official media-day photo variety for the three teams that publish it', () => {
    const withTwo = dataset.players.filter((p) => p.images.length >= 2);
    // ~79 players across Party Animals / Savannah / Firefighters get a 2nd shot.
    expect(withTwo.length).toBeGreaterThan(60);
  });

  it('has no duplicate player ids or display names', () => {
    const ids = new Set(dataset.players.map((p) => p.player_id));
    const names = new Set(dataset.players.map((p) => p.name));
    expect(ids.size).toBe(dataset.players.length);
    expect(names.size).toBe(dataset.players.length);
  });

  it('excludes celebrity guest players', () => {
    expect(dataset.players.some((p) => p.position_label === 'Guest Player')).toBe(false);
  });

  it('every player has a fielding block with trick-play + error stats', () => {
    for (const p of dataset.players) {
      const f = p.fielding;
      expect(f, `${p.name} missing fielding`).toBeTruthy();
      if (!f) continue;
      for (const k of ['e', 'air_outs', 'ground_outs', 'tpo', 'tpm'] as const) {
        expect(typeof f[k] === 'number' || f[k] === null, `${p.name}.fielding.${k}`).toBe(true);
      }
    }
  });

  it('pitchers carry strikeouts (so) and the extra pitching fields', () => {
    const pitchers = dataset.players.filter((p) => p.pitching);
    expect(pitchers.length).toBeGreaterThan(50);
    // strikeouts (source: k) must be mapped for most pitchers — regression guard
    // against the old bug where so read a nonexistent field and was always null.
    const withK = pitchers.filter((p) => typeof p.pitching?.so === 'number');
    expect(withK.length).toBeGreaterThan(50);
    for (const p of pitchers) {
      expect(p.pitching).toBeTruthy();
      for (const k of ['gs', 'runs_allowed', 'hits_allowed'] as const) {
        expect(p.pitching && k in p.pitching, `${p.name}.pitching.${k}`).toBe(true);
      }
    }
  });
});
