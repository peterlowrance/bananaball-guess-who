// Typed, indexed access to the bundled dataset. All lookups the app and engine
// need are precomputed once at module load. Pure data — no React, no side
// effects beyond building the indexes.
import raw from './players-2026.json';
import type { Dataset, Player, Team, Difficulty } from './types';

const dataset = raw as unknown as Dataset;

export const players: readonly Player[] = dataset.players;
export const teams: readonly Team[] = dataset.teams;

export const playerById: ReadonlyMap<string, Player> = new Map(
  players.map((p) => [p.player_id, p]),
);
export const playerBySlug: ReadonlyMap<string, Player> = new Map(
  players.map((p) => [p.slug, p]),
);
export const teamById: ReadonlyMap<string, Team> = new Map(
  teams.map((t) => [t.team_id, t]),
);
export const teamByName: ReadonlyMap<string, Team> = new Map(
  teams.map((t) => [t.name, t]),
);

function groupBy<K>(items: readonly Player[], key: (p: Player) => K): Map<K, Player[]> {
  const m = new Map<K, Player[]>();
  for (const p of items) {
    const k = key(p);
    const arr = m.get(k);
    if (arr) arr.push(p);
    else m.set(k, [p]);
  }
  return m;
}

export const playersByTeamId: ReadonlyMap<string, Player[]> = groupBy(
  players,
  (p) => p.team_id,
);
export const playersByDifficulty: ReadonlyMap<Difficulty, Player[]> = groupBy(
  players,
  (p) => p.difficulty,
);
/**
 * Broad position family used for distractor difficulty (same-family distractors
 * are harder). Collapses the 14 raw position labels into 4 buckets.
 */
export type PositionFamily = 'pitcher' | 'infield' | 'outfield' | 'other';

export function positionFamily(label: string): PositionFamily {
  const l = label.toLowerCase();
  if (l.includes('pitcher')) return 'pitcher';
  if (l.includes('field') || l === 'outfield') return 'outfield';
  if (
    l.includes('baseman') ||
    l.includes('shortstop') ||
    l.includes('catcher')
  )
    return 'infield';
  // Two-Way Player, Designated Runner, Designated Hitter
  return 'other';
}

export const playersByPositionFamily: ReadonlyMap<PositionFamily, Player[]> =
  groupBy(players, (p) => positionFamily(p.position_label));

export function getPlayer(id: string): Player {
  const p = playerById.get(id);
  if (!p) throw new Error(`Unknown player_id: ${id}`);
  return p;
}

export function getTeam(id: string): Team {
  const t = teamById.get(id);
  if (!t) throw new Error(`Unknown team_id: ${id}`);
  return t;
}
