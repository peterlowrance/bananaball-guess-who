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
