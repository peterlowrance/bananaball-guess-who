import { describe, it, expect } from 'vitest';
import { players } from './dataset';
import {
  deriveCurriculum,
  unitKey,
  UNIT_SIZE,
  type Unit,
} from './curriculum';
import type { Difficulty } from './types';

const TIER_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

function allIds(units: Unit[]): string[] {
  return units.flatMap((u) => u.playerIds);
}

describe('deriveCurriculum', () => {
  const full = deriveCurriculum(players);

  it('includes every player exactly once', () => {
    const ids = allIds(full);
    expect(ids).toHaveLength(players.length);
    expect(new Set(ids).size).toBe(players.length);
  });

  it('orders units easy -> medium -> hard, never spanning tiers', () => {
    let prev = -1;
    for (const u of full) {
      expect(TIER_RANK[u.tier]).toBeGreaterThanOrEqual(prev);
      prev = TIER_RANK[u.tier];
      // every member matches the unit tier
      for (const id of u.playerIds) {
        const p = players.find((x) => x.player_id === id)!;
        expect(p.difficulty).toBe(u.tier);
      }
    }
  });

  it('units are at most UNIT_SIZE and indices are contiguous', () => {
    full.forEach((u, i) => {
      expect(u.index).toBe(i);
      expect(u.playerIds.length).toBeGreaterThan(0);
      expect(u.playerIds.length).toBeLessThanOrEqual(UNIT_SIZE);
    });
  });

  it('interleaves teams — unit 1 draws from multiple teams', () => {
    const first = full[0];
    const teamNames = new Set(
      first.playerIds.map((id) => players.find((p) => p.player_id === id)!.team_name),
    );
    expect(teamNames.size).toBeGreaterThan(1);
  });

  it('the very first player learned is the flagship Savannah Bananas star', () => {
    const firstId = full[0].playerIds[0];
    const firstPlayer = players.find((p) => p.player_id === firstId)!;
    expect(firstPlayer.team_name).toBe('Savannah Bananas');
    expect(firstPlayer.popularity_rank).toBe(1);
  });

  it('is deterministic across calls', () => {
    const a = deriveCurriculum(players);
    const b = deriveCurriculum(players);
    expect(a.map((u) => u.key)).toEqual(b.map((u) => u.key));
  });

  it('the same players always produce the same unit key (focus-filter stable)', () => {
    // A unit that exists in both the full path and a single-team path (all its
    // members from one team) must keep the same key so completion carries over.
    const oneTeam = players[0].team_name;
    const focused = deriveCurriculum(players, [oneTeam]);
    const focusedIds = new Set(allIds(focused));

    // Recompute keys directly from ids and confirm key() is pure/order-free.
    for (const u of focused) {
      expect(u.key).toBe(unitKey(u.playerIds));
      expect(u.key).toBe(unitKey([...u.playerIds].reverse()));
    }
    // Every focused player is a real member of that team.
    for (const id of focusedIds) {
      expect(players.find((p) => p.player_id === id)!.team_name).toBe(oneTeam);
    }
  });

  it('focus filter restricts the pool', () => {
    const twoTeams = [players[0].team_name, players.find((p) => p.team_name !== players[0].team_name)!.team_name];
    const focused = deriveCurriculum(players, twoTeams);
    const names = new Set(
      allIds(focused).map((id) => players.find((p) => p.player_id === id)!.team_name),
    );
    expect([...names].sort()).toEqual([...twoTeams].sort());
  });

  it('empty focus == no focus (all players)', () => {
    expect(allIds(deriveCurriculum(players, [])).length).toBe(players.length);
  });
});
