// Distractor selection — the core difficulty dial (plan §3.3).
//
// Difficulty rises with the target's SRS box by drawing wrong options from an
// increasingly *confusable* pool:
//   box 0-1: other teams, different positions (maximally separable)
//   box 2-3: at least some same-team
//   box 4+ : same-team + same-position + names the user has confused before
//
// Distractors may be ANY roster player (including not-yet-introduced ones) —
// a wrong option needs no prior exposure. Never the target itself. Pure:
// (params, rng) -> Player[].

import type { Player } from '../../data/types';
import { positionFamily } from '../../data/dataset';
import type { Rng } from '../rng';

export interface DistractorParams {
  target: Player;
  box: number;
  roster: readonly Player[];
  /** player_ids the user has previously confused the target with */
  confusedWith?: readonly string[];
  count?: number; // default 3
}

// Weights are MULTIPLICATIVE so a strong preference dominates even when the
// preferred group is a numerical minority (25 same-team vs 133 other-team).
function weightFor(target: Player, cand: Player, box: number, confused: Set<string>): number {
  let w = 1;
  const sameTeam = cand.team_id === target.team_id;
  const samePos = positionFamily(cand.position_label) === positionFamily(target.position_label);
  const sameInitial =
    cand.name.split(' ').pop()?.[0]?.toLowerCase() ===
    target.name.split(' ').pop()?.[0]?.toLowerCase();

  if (box <= 1) {
    // prefer separable: other team, different position
    if (sameTeam) w *= 0.15;
    if (samePos) w *= 0.6;
  } else if (box <= 3) {
    if (sameTeam) w *= 6;
    if (samePos) w *= 1.5;
  } else {
    // hard: same team, same position, confusable names
    if (sameTeam) w *= 12;
    if (samePos) w *= 3;
    if (sameInitial) w *= 2;
    if (confused.has(cand.player_id)) w *= 40; // strongly personalized
  }
  return w;
}

/** Weighted sample of `n` distinct candidates without replacement. */
function weightedSample(
  candidates: { player: Player; weight: number }[],
  n: number,
  rng: Rng,
): Player[] {
  const pool = candidates.map((c) => ({ ...c }));
  const out: Player[] = [];
  while (out.length < n && pool.length > 0) {
    const total = pool.reduce((s, c) => s + c.weight, 0);
    let r = rng.next() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      r -= pool[idx].weight;
      if (r <= 0) break;
    }
    const [chosen] = pool.splice(Math.min(idx, pool.length - 1), 1);
    out.push(chosen.player);
  }
  return out;
}

export function pickDistractors(params: DistractorParams, rng: Rng): Player[] {
  const { target, box, roster, count = 3 } = params;
  const confused = new Set(params.confusedWith ?? []);
  const candidates = roster
    .filter((p) => p.player_id !== target.player_id)
    .map((player) => ({ player, weight: weightFor(target, player, box, confused) }));

  const picked = weightedSample(candidates, count, rng);

  // Safety: if the roster was too small to fill (shouldn't happen with 158),
  // top up with any remaining players.
  if (picked.length < count) {
    const have = new Set(picked.map((p) => p.player_id));
    for (const c of candidates) {
      if (picked.length >= count) break;
      if (!have.has(c.player.player_id)) picked.push(c.player);
    }
  }
  return picked;
}

/** Numeric distractors for jersey questions: near the target number, distinct. */
export function pickJerseyDistractors(
  target: Player,
  roster: readonly Player[],
  rng: Rng,
  count = 3,
): number[] {
  const answer = target.jersey_number;
  const nearby = new Set<number>();
  // prefer real jersey numbers from the roster within ±15
  const realNear = roster
    .map((p) => p.jersey_number)
    .filter((n) => n !== answer && Math.abs(n - answer) <= 15);
  for (const n of rng.shuffle(realNear)) {
    if (nearby.size >= count) break;
    nearby.add(n);
  }
  // top up with synthetic nearby numbers if needed
  let delta = 1;
  while (nearby.size < count) {
    for (const cand of [answer + delta, answer - delta]) {
      if (cand >= 0 && cand !== answer && !nearby.has(cand)) nearby.add(cand);
      if (nearby.size >= count) break;
    }
    delta++;
    if (delta > 60) break;
  }
  return [...nearby].slice(0, count);
}
