// Curriculum derivation — a PURE function of (players, focusTeams).
//
// The learning path is never hardcoded: given the player pool (optionally
// filtered to focus teams) it produces an ordered list of units. Ordering:
//   1. difficulty tier: easy -> medium -> hard (Act I/II/III)
//   2. within a tier, round-robin across teams by each player's per-team
//      popularity_rank, so every unit mixes several teams and the most
//      recognizable faces come first.
// Units are chunked from that global order. Each unit carries a stable
// `key` = hash of its sorted player_ids, so completion records survive
// focus-filter changes and roster edits (see plan §3.10).

import type { Difficulty, Player } from './types';

export const UNIT_SIZE = 9;
const TIER_ORDER: Difficulty[] = ['easy', 'medium', 'hard'];
export const ACT_BY_TIER: Record<Difficulty, { act: number; name: string }> = {
  easy: { act: 1, name: 'Famous Faces' },
  medium: { act: 2, name: 'The Regulars' },
  hard: { act: 3, name: 'Deep Cuts' },
};

export interface Unit {
  index: number; // 0-based position in the derived path
  key: string; // stable id derived from member player_ids
  act: number;
  actName: string;
  tier: Difficulty;
  playerIds: string[];
}

/** FNV-1a 32-bit hash of a string — deterministic, no deps. */
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Stable key for a unit: hash of its player_ids, order-independent. */
export function unitKey(playerIds: readonly string[]): string {
  return 'u_' + fnv1a([...playerIds].sort().join('|'));
}

/**
 * Round-robin interleave players within one tier: sort each team's players by
 * popularity_rank (best first, nulls last), then take one from each team in
 * turn. Teams are visited in a stable order (by name) so output is
 * deterministic.
 */
function interleaveTier(tierPlayers: Player[]): Player[] {
  const byTeam = new Map<string, Player[]>();
  for (const p of tierPlayers) {
    const arr = byTeam.get(p.team_name);
    if (arr) arr.push(p);
    else byTeam.set(p.team_name, [p]);
  }
  const rank = (p: Player) => p.popularity_rank ?? Number.POSITIVE_INFINITY;
  const queues = [...byTeam.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, arr]) => arr.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)));

  const out: Player[] = [];
  let added = true;
  for (let round = 0; added; round++) {
    added = false;
    for (const q of queues) {
      if (round < q.length) {
        out.push(q[round]);
        added = true;
      }
    }
  }
  return out;
}

/**
 * Derive the full ordered path from a player pool. `focusTeams` (team names),
 * when non-empty, restricts the pool to those teams.
 */
export function deriveCurriculum(
  pool: readonly Player[],
  focusTeams: readonly string[] = [],
): Unit[] {
  const focus = new Set(focusTeams);
  const filtered = focus.size
    ? pool.filter((p) => focus.has(p.team_name))
    : [...pool];

  // Global learning order across tiers.
  const ordered: Player[] = [];
  for (const tier of TIER_ORDER) {
    ordered.push(...interleaveTier(filtered.filter((p) => p.difficulty === tier)));
  }

  // Chunk into units. A unit never spans two tiers: chunk each tier block
  // separately so Act boundaries stay clean (last unit of a tier may be short).
  const units: Unit[] = [];
  let cursor = 0;
  for (const tier of TIER_ORDER) {
    const tierPlayers = ordered.filter((p) => p.difficulty === tier);
    for (let i = 0; i < tierPlayers.length; i += UNIT_SIZE) {
      const members = tierPlayers.slice(i, i + UNIT_SIZE);
      if (members.length === 0) continue;
      const ids = members.map((p) => p.player_id);
      const { act, name } = ACT_BY_TIER[tier];
      units.push({
        index: cursor++,
        key: unitKey(ids),
        act,
        actName: name,
        tier,
        playerIds: ids,
      });
    }
  }
  return units;
}
