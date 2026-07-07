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
      expect(p.image_url).toMatch(/^https:\/\/thebananaball\.com\/stats\/players\/.+\.webp$/);
      expect(['easy', 'medium', 'hard']).toContain(p.difficulty);
      expect(typeof p.jersey_number).toBe('number');
    }
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
});
