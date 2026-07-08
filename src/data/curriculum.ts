// Curriculum — an AUTHORED, hand-curated list of themed units.
//
// The learning path is no longer derived from player popularity. It is a
// hand-written list of units in `units-2026.json`, each with a theme, title,
// team-color tint, and an explicit roster split into:
//   - owned:  players INTRODUCED and MASTERED in this unit. These drive the
//             unit's mastery pips and gate its quiz (all owned must be
//             introduced before the quiz unlocks). Every player is owned by
//             exactly ONE unit (validated in curriculum.test.ts).
//   - cameo:  players owned by an earlier unit, mixed in here as review
//             flavor only. They never gate this unit and never count toward
//             its mastery. A player is cameo in at most units that don't own
//             them.
//
// Difficulty still ramps implicitly (authored `act` bands, less-popular
// players skewed later, and the engine gating harder question types by SRS
// box) — but the ordering is a design decision, not a formula.

import type { Difficulty, Player } from './types';
import rawUnits from './units-2026.json';

/**
 * A unit's visual identity. The theme drives the look, not a fixed team-color
 * rule:
 *   - kind 'team'  — tint the node with one or two team colors (a single team
 *     or a two-team "clash"). `teams` holds 1–2 team-theme slugs (see lib/theme).
 *   - kind 'icon'  — a themed lucide icon (e.g. a baseball for pitchers, a shirt
 *     for a jersey-number theme) on an accent color. `icon` is a lucide icon
 *     name (see lib/motif for the whitelist); `accent` is a hex color.
 */
export type UnitMotif =
  | { kind: 'team'; teams: string[] }
  | { kind: 'icon'; icon: string; accent: string };

/** How the authored units are stored on disk. */
export interface UnitDef {
  /** stable, human-readable id — the unit's identity across roster edits */
  slug: string;
  title: string;
  theme: string;
  /** visual identity — team-color tint OR a themed icon */
  motif: UnitMotif;
  /** ordering / difficulty band (1-based) */
  act: number;
  /** player_ids introduced & mastered here — exactly one home unit each */
  owned: string[];
  /** player_ids owned elsewhere, mixed in as review flavor only */
  cameo: string[];
}

/** Act-level banners, keyed by act number. Purely presentational. */
export const ACT_BANNER: Record<number, { name: string; blurb: string }> = {
  1: { name: 'Act 1', blurb: 'The players everyone knows.' },
  2: { name: 'Act 2', blurb: 'Getting deeper into the rosters.' },
  3: { name: 'Act 3', blurb: 'The tricky ones.' },
};

export interface Unit {
  index: number; // 0-based position in the path
  key: string; // stable id — the authored slug
  slug: string;
  title: string;
  theme: string;
  motif: UnitMotif;
  act: number;
  actName: string;
  /** owned player_ids — introduced/mastered here, drive pips + quiz gate */
  playerIds: string[];
  /** cameo player_ids — review flavor only, not owned here */
  cameoIds: string[];
}

const UNIT_DEFS = rawUnits as unknown as UnitDef[];

/** The authored curriculum, resolved to Units in on-disk order. */
export function loadCurriculum(): Unit[] {
  return UNIT_DEFS.map((def, index) => ({
    index,
    key: def.slug,
    slug: def.slug,
    title: def.title,
    theme: def.theme,
    motif: def.motif,
    act: def.act,
    actName: ACT_BANNER[def.act]?.name ?? `Act ${def.act}`,
    playerIds: def.owned,
    cameoIds: def.cameo,
  }));
}

/** Raw authored defs — for validation/tests. */
export function unitDefs(): readonly UnitDef[] {
  return UNIT_DEFS;
}

/** Tier of a player, retained for any remaining callers. */
export function difficultyOf(p: Player): Difficulty {
  return p.difficulty;
}
