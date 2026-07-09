import { describe, it, expect } from 'vitest';
import { players, playersByTeamId } from '../../data/dataset';
import { mulberry32 } from '../rng';
import { buildSession, type PlayerState } from './session';
import type { QuestionType } from './types';

// Types that require the *target's* own photo to be shown.
const TARGET_PHOTO_TYPES: QuestionType[] = [
  'photo-to-name',
  'name-to-photo',
  'build-name',
  'type-name',
  'jersey',
  'position',
];

function state(p: (typeof players)[number], box: number, introduced = true): PlayerState {
  return { player: p, box, confusedWith: [], introduced };
}

const roster = players;
const teamPlayers = [...playersByTeamId.values()][0];

describe('buildSession', () => {
  it('produces exactly `length` questions', () => {
    const s = buildSession(
      {
        newPlayers: teamPlayers.slice(0, 3).map((p) => state(p, 0, false)),
        dueReviews: teamPlayers.slice(3, 9).map((p) => state(p, 2)),
        roster,
      },
      mulberry32(1),
    );
    expect(s).toHaveLength(12);
  });

  it('introduces new players with an intro card first', () => {
    const news = teamPlayers.slice(0, 3).map((p) => state(p, 0, false));
    const s = buildSession({ newPlayers: news, dueReviews: [], roster }, mulberry32(2));
    // first question is an intro for the first new player
    expect(s[0].intro).toBe(true);
    expect(s[0].targetId).toBe(news[0].player.player_id);
    // each new player gets exactly one intro card
    const intros = s.filter((q) => q.intro);
    expect(intros.length).toBe(3);
  });

  it('caps new players to 2 when >=15 reviews are due, 0 when >=30', () => {
    const news = teamPlayers.slice(0, 3).map((p) => state(p, 0, false));
    const many = (n: number) =>
      Array.from({ length: n }, (_, i) => state(roster[i % roster.length], 2));

    const heavy = buildSession({ newPlayers: news, dueReviews: many(20), roster }, mulberry32(3));
    expect(heavy.filter((q) => q.intro).length).toBe(2);

    const flood = buildSession({ newPlayers: news, dueReviews: many(35), roster }, mulberry32(4));
    expect(flood.filter((q) => q.intro).length).toBe(0);
  });

  it('avoids photo question types for players with broken images', () => {
    const target = teamPlayers[0];
    const s = buildSession(
      {
        newPlayers: [state(target, 5)],
        dueReviews: [state(target, 5)],
        roster,
        brokenImageIds: new Set([target.player_id]),
        maxNew: 1,
      },
      mulberry32(5),
    );
    // no question about the broken-image target should require its photo
    for (const q of s) {
      if (q.targetId === target.player_id) {
        expect(TARGET_PHOTO_TYPES).not.toContain(q.type);
      }
    }
  });

  // A single-team section makes "which team is this player on?" a giveaway —
  // there's only one team in play. It must never appear (when images are fine).
  it('never asks which-team in a single-team section', () => {
    const one = teamPlayers.slice(0, 8).map((p) => state(p, 4)); // high box: all types eligible
    // Sweep many seeds so a rare pick would still be caught.
    for (let seed = 0; seed < 40; seed++) {
      const s = buildSession(
        { newPlayers: one.slice(0, 3).map((p) => ({ ...p, introduced: false })), dueReviews: one, roster },
        mulberry32(seed),
      );
      expect(s.some((q) => q.type === 'which-team')).toBe(false);
    }
  });

  // A broken image in a single-team section is the one case which-team is still
  // allowed: a broken photo is worse than an easy team question.
  it('still allows which-team for a broken image even in a single-team section', () => {
    const target = teamPlayers[0];
    const s = buildSession(
      {
        newPlayers: [state(target, 5)],
        dueReviews: [state(target, 5)],
        roster,
        brokenImageIds: new Set([target.player_id]),
        maxNew: 1,
      },
      mulberry32(9),
    );
    // every question about the broken target is which-team (the only safe type).
    for (const q of s) {
      if (q.targetId === target.player_id) expect(q.type).toBe('which-team');
    }
  });

  // With enough teams in play, which-team is allowed but should stay rare.
  it('keeps which-team rare in a multi-team (2-3) section', () => {
    const teams = [...playersByTeamId.values()];
    const twoTeam = [...teams[0].slice(0, 4), ...teams[1].slice(0, 4)].map((p) => state(p, 4));
    let total = 0;
    let whichTeam = 0;
    for (let seed = 0; seed < 60; seed++) {
      const s = buildSession({ newPlayers: [], dueReviews: twoTeam, roster }, mulberry32(seed));
      for (const q of s) {
        total++;
        if (q.type === 'which-team') whichTeam++;
      }
    }
    // Uniform selection would put which-team near 1/9 of eligible questions;
    // the 0.8 re-roll should push it well below that.
    expect(whichTeam / total).toBeLessThan(0.05);
  });

  it('does not ask two consecutive questions about the same target (when alternatives exist)', () => {
    const s = buildSession(
      {
        newPlayers: [],
        dueReviews: teamPlayers.slice(0, 6).map((p) => state(p, 3)),
        roster,
      },
      mulberry32(6),
    );
    for (let i = 1; i < s.length; i++) {
      expect(s[i].targetId === s[i - 1].targetId && i < s.length).toBe(false);
    }
  });

  it('a review-only session with candidates fills to length (quiz is never empty)', () => {
    // Regression: a unit quiz builds with newPlayers=[] and passes the unit's
    // introduced players as reviews. Even with a short candidate list it must
    // fill all 15 slots by recycling — never return 0 questions (the "0/0" bug).
    const s = buildSession(
      {
        newPlayers: [],
        dueReviews: teamPlayers.slice(0, 3).map((p) => state(p, 2)),
        roster,
        length: 15,
      },
      mulberry32(7),
    );
    expect(s).toHaveLength(15);
  });

  it('a review-only session with no candidates is empty (why the quiz needed unit players)', () => {
    // Documents the root cause: with nothing to review, buildSession yields 0
    // questions. The quiz fix is to always feed it the unit's introduced players.
    const s = buildSession({ newPlayers: [], dueReviews: [], roster, length: 15 }, mulberry32(8));
    expect(s).toHaveLength(0);
  });

  it('is deterministic per seed', () => {
    const spec = {
      newPlayers: teamPlayers.slice(0, 3).map((p) => state(p, 0, false)),
      dueReviews: teamPlayers.slice(3, 7).map((p) => state(p, 2)),
      roster,
    };
    const a = buildSession(spec, mulberry32(9)).map((q) => q.id + q.type + q.targetId);
    const b = buildSession(spec, mulberry32(9)).map((q) => q.id + q.type + q.targetId);
    expect(a).toEqual(b);
  });
});
