import { describe, it, expect } from 'vitest';
import { players } from '../../data/dataset';
import { mulberry32 } from '../rng';
import { pickDistractors, pickJerseyDistractors } from './distractors';

const target = players[0];
const seed = (n: number) => mulberry32(n);

describe('pickDistractors', () => {
  it('returns the requested count, distinct, never the target', () => {
    for (let s = 0; s < 50; s++) {
      const d = pickDistractors({ target, box: 2, roster: players }, seed(s));
      expect(d).toHaveLength(3);
      const ids = new Set(d.map((p) => p.player_id));
      expect(ids.size).toBe(3);
      expect(ids.has(target.player_id)).toBe(false);
    }
  });

  it('low box tends to pick other-team distractors', () => {
    let otherTeam = 0;
    const trials = 200;
    for (let s = 0; s < trials; s++) {
      const d = pickDistractors({ target, box: 0, roster: players }, seed(s));
      otherTeam += d.filter((p) => p.team_id !== target.team_id).length;
    }
    // strong majority should be other-team at box 0
    expect(otherTeam / (trials * 3)).toBeGreaterThan(0.75);
  });

  it('high box tends to pick same-team distractors', () => {
    let sameTeam = 0;
    const trials = 200;
    for (let s = 0; s < trials; s++) {
      const d = pickDistractors({ target, box: 5, roster: players }, seed(s));
      sameTeam += d.filter((p) => p.team_id === target.team_id).length;
    }
    // team has ~25 players so same-team should dominate at box 5
    expect(sameTeam / (trials * 3)).toBeGreaterThan(0.5);
  });

  it('high box favors confused-with players when provided', () => {
    // pick a same-team teammate as the confusion target
    const teammate = players.find(
      (p) => p.team_id === target.team_id && p.player_id !== target.player_id,
    )!;
    let hits = 0;
    const trials = 100;
    for (let s = 0; s < trials; s++) {
      const d = pickDistractors(
        { target, box: 5, roster: players, confusedWith: [teammate.player_id] },
        seed(s),
      );
      if (d.some((p) => p.player_id === teammate.player_id)) hits++;
    }
    // the confused player should show up a large fraction of the time
    expect(hits / trials).toBeGreaterThan(0.6);
  });

  it('is deterministic per seed', () => {
    const a = pickDistractors({ target, box: 3, roster: players }, seed(7)).map((p) => p.player_id);
    const b = pickDistractors({ target, box: 3, roster: players }, seed(7)).map((p) => p.player_id);
    expect(a).toEqual(b);
  });

  it('works within a tiny (single-team) roster', () => {
    const oneTeam = players.filter((p) => p.team_id === target.team_id);
    const d = pickDistractors({ target, box: 5, roster: oneTeam }, seed(1));
    expect(d).toHaveLength(3);
    expect(d.every((p) => p.player_id !== target.player_id)).toBe(true);
  });
});

describe('pickJerseyDistractors', () => {
  it('returns distinct numbers excluding the answer', () => {
    for (let s = 0; s < 50; s++) {
      const nums = pickJerseyDistractors(target, players, seed(s));
      expect(nums).toHaveLength(3);
      expect(new Set(nums).size).toBe(3);
      expect(nums).not.toContain(target.jersey_number);
    }
  });
});
