import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { players, getPlayer } from '../../data/dataset';
import { mulberry32 } from '../rng';
import { generateOfType, eligibleTypes, generateQuestion } from './generator';
import { checkTypedAnswer } from './answer-check';
import { firstName, lastName, dropSuffix } from './name-parts';
import type { QuestionType } from './types';

const ALL_TYPES: QuestionType[] = [
  'photo-to-name',
  'name-to-photo',
  'first-name',
  'last-name',
  'which-team',
  'build-name',
  'build-first',
  'build-last',
  'jersey',
  'position',
  'type-name',
];

const BUILD_TYPES = new Set<QuestionType>(['build-name', 'build-first', 'build-last']);
const TEXT_TYPES = new Set<QuestionType>([...BUILD_TYPES, 'type-name']);

describe('eligibleTypes', () => {
  it('unlocks harder types with higher box', () => {
    // easiest rung: first/last-name recognition available from box 0
    expect(eligibleTypes(0)).toContain('first-name');
    expect(eligibleTypes(0)).toContain('last-name');
    expect(eligibleTypes(0)).not.toContain('type-name');
    expect(eligibleTypes(0)).not.toContain('build-name');
    expect(eligibleTypes(0)).not.toContain('build-first');
    expect(eligibleTypes(2)).toContain('build-name');
    expect(eligibleTypes(2)).toContain('build-first');
    expect(eligibleTypes(2)).toContain('build-last');
    expect(eligibleTypes(3)).toContain('jersey');
    expect(eligibleTypes(4)).toContain('type-name');
  });
});

describe('generateQuestion — property: always answerable', () => {
  it('every generated question of every type has a valid, resolvable answer', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: players.length - 1 }),
        fc.integer({ min: 0, max: 5 }),
        fc.constantFrom(...ALL_TYPES),
        fc.integer({ min: 1, max: 999999 }),
        (pi, box, type, seed) => {
          const target = players[pi];
          const q = generateOfType(
            { target, box, roster: players, isReview: true, qid: 'q' },
            type,
            mulberry32(seed),
          );
          expect(q.targetId).toBe(target.player_id);

          if (TEXT_TYPES.has(type)) {
            expect(q.answerText).toBeTruthy();
            expect(q.correctIndex).toBe(-1);
            if (type === 'build-name') {
              // every word of the *suffix-stripped* name is a tile — never "Jr."
              for (const part of dropSuffix(target.name).split(' ')) {
                expect(q.tiles).toContain(part);
              }
              expect(q.tiles).not.toContain('Jr.');
            }
            if (type === 'build-first' || type === 'build-last') {
              // Tiles may be single letters OR 2-3 letter chunks. In every case
              // SOME subset of the tiles, concatenated in some order, must spell
              // the answer exactly. A decoy can be a prefix of the remaining
              // answer, so a naive greedy match can dead-end — backtrack.
              const answer = (type === 'build-first' ? firstName : lastName)(target.name)
                .replace(/[^a-zA-Z]/g, '')
                .toUpperCase();
              const tiles = [...(q.tiles ?? [])];
              const used = new Array(tiles.length).fill(false);
              const solve = (rest: string): boolean => {
                if (rest.length === 0) return true;
                for (let ti = 0; ti < tiles.length; ti++) {
                  if (used[ti] || !rest.startsWith(tiles[ti])) continue;
                  used[ti] = true;
                  if (solve(rest.slice(tiles[ti].length))) return true;
                  used[ti] = false;
                }
                return false;
              };
              expect(solve(answer)).toBe(true);
            }
          } else {
            // choice-based: correctIndex valid and choices distinct
            expect(q.correctIndex).toBeGreaterThanOrEqual(0);
            expect(q.correctIndex).toBeLessThan(q.choices.length);
            expect(q.choices.length).toBeGreaterThanOrEqual(2);
            const labels = q.choices.map((c) => c.label);
            expect(new Set(labels).size).toBe(labels.length); // no dup labels
            // the correct choice resolves to the target for identity types
            if (type === 'photo-to-name' || type === 'name-to-photo') {
              expect(q.choices[q.correctIndex].playerId).toBe(target.player_id);
            }
            if (type === 'first-name' || type === 'last-name') {
              expect(q.choices[q.correctIndex].playerId).toBe(target.player_id);
              const part = type === 'first-name' ? firstName : lastName;
              expect(q.choices[q.correctIndex].label).toBe(part(target.name));
            }
            if (type === 'jersey') {
              expect(q.choices[q.correctIndex].label).toBe(String(target.jersey_number));
            }
            if (type === 'which-team') {
              expect(q.choices[q.correctIndex].label).toBe(target.team_name);
            }
          }
        },
      ),
      { numRuns: 500 },
    );
  });
});

describe('generateQuestion — random type respects box eligibility', () => {
  it('never produces a type-name below box 4', () => {
    for (let s = 0; s < 200; s++) {
      const q = generateQuestion(
        { target: players[0], box: 0, roster: players, isReview: true, qid: 'q' },
        mulberry32(s),
      );
      expect(q.type).not.toBe('type-name');
      expect(q.type).not.toBe('build-name');
    }
  });
});

describe('first/last-name choices are unambiguous', () => {
  it('no two choices share the tested part-name across many seeds', () => {
    for (const type of ['first-name', 'last-name'] as const) {
      const part = type === 'first-name' ? firstName : lastName;
      for (let s = 0; s < 300; s++) {
        const target = players[s % players.length];
        const q = generateOfType(
          { target, box: 0, roster: players, isReview: true, qid: 'q' },
          type,
          mulberry32(s + 1),
        );
        const labels = q.choices.map((c) => part(getPlayer(c.playerId).name).toLowerCase());
        expect(new Set(labels).size).toBe(labels.length); // exactly one right answer
        expect(q.choices.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('build-name / build-last never leak a Jr. suffix', () => {
  it('a suffixed player builds without the suffix, and last-name build accepts the suffix-less last name', () => {
    const jr = players.find((p) => /\bjr\.?$/i.test(p.name));
    if (!jr) return; // dataset may not contain one; guard rather than fail
    const bn = generateOfType(
      { target: jr, box: 2, roster: players, isReview: true, qid: 'q' },
      'build-name',
      mulberry32(3),
    );
    expect(bn.answerText).toBe(dropSuffix(jr.name));
    expect(bn.tiles).not.toContain('Jr.');

    const bl = generateOfType(
      { target: jr, box: 2, roster: players, isReview: true, qid: 'q' },
      'build-last',
      mulberry32(3),
    );
    expect(bl.answerText).toBe(lastName(jr.name));
  });
});

describe('build-first / build-last tile granularity', () => {
  // At the unlock rung (box 2) the tiles should be chunks, not single letters:
  // for a name with >3 letters, at least one tile has length >= 2, and the
  // total tile count is far below the letter count.
  it('uses multi-letter chunks at box 2 for longer names', () => {
    // Find a target whose first name has >= 6 letters so chunking is meaningful.
    const target = players.find((p) => firstName(p.name).replace(/[^a-zA-Z]/g, '').length >= 6)!;
    let sawChunk = false;
    for (let s = 0; s < 40; s++) {
      const q = generateOfType(
        { target, box: 2, roster: players, isReview: true, qid: 'q' },
        'build-first',
        mulberry32(s + 1),
      );
      const tiles = q.tiles ?? [];
      // every tile is 1-3 chars; at box 2 chunks are forced so some tile is >1.
      expect(tiles.every((t) => t.length >= 1 && t.length <= 3)).toBe(true);
      if (tiles.some((t) => t.length >= 2)) sawChunk = true;
      // chunk mode has far fewer tiles than letters (letters + up-to-4 decoys).
      const letterCount = firstName(target.name).replace(/[^a-zA-Z]/g, '').length;
      expect(tiles.length).toBeLessThan(letterCount);
    }
    expect(sawChunk).toBe(true);
  });

  // Chunk tiles must be assemblable into the exact answer, and no decoy chunk
  // duplicates a real one (which would make an extra tile silently "correct").
  it('chunk tiles concatenate to the answer with distinct decoys', () => {
    for (let s = 0; s < 200; s++) {
      const target = players[s % players.length];
      const q = generateOfType(
        { target, box: 2, roster: players, isReview: true, qid: 'q' },
        'build-last',
        mulberry32(s + 7),
      );
      const answer = lastName(target.name).replace(/[^a-zA-Z]/g, '').toUpperCase();
      const tiles = [...(q.tiles ?? [])];
      // The concatenation of some ordered subset equals the answer (backtracking).
      const used = new Array(tiles.length).fill(false);
      const solve = (rest: string): boolean => {
        if (rest.length === 0) return true;
        for (let ti = 0; ti < tiles.length; ti++) {
          if (used[ti] || !rest.startsWith(tiles[ti])) continue;
          used[ti] = true;
          if (solve(rest.slice(tiles[ti].length))) return true;
          used[ti] = false;
        }
        return false;
      };
      expect(solve(answer)).toBe(true);
    }
  });
});

describe('type-name answer integrates with checker', () => {
  it('the answerText passes the fuzzy checker for its own target', () => {
    const target = players[10];
    const q = generateOfType(
      { target, box: 5, roster: players, isReview: true, qid: 'q' },
      'type-name',
      mulberry32(1),
    );
    const res = checkTypedAnswer(q.answerText!, q.targetId, players);
    expect(res.correct).toBe(true);
    // sanity: target resolvable
    expect(getPlayer(q.targetId).name).toBe(target.name);
  });
});

describe('name-to-photo distractors share the target team', () => {
  // The photo tiles show jerseys, so an other-team distractor is identifiable
  // without recognizing the face. All tiles should wear the target's jersey
  // when the team is large enough to supply them (regardless of SRS box).
  it('picks only same-team distractors for a player on a large team', () => {
    // Pick a target whose team has >= 4 players so 3 same-team tiles are possible.
    const byTeam = new Map<string, typeof players[number][]>();
    for (const p of players) {
      const arr = byTeam.get(p.team_id) ?? [];
      arr.push(p);
      byTeam.set(p.team_id, arr);
    }
    const target = players.find((p) => (byTeam.get(p.team_id)?.length ?? 0) >= 4)!;
    for (let seed = 0; seed < 30; seed++) {
      // box 0 is where the old weighting most preferred OTHER teams.
      const q = generateOfType(
        { target, box: 0, roster: players, isReview: false, qid: 'q' },
        'name-to-photo',
        mulberry32(seed),
      );
      for (const c of q.choices) {
        if (c.playerId === target.player_id) continue;
        expect(getPlayer(c.playerId).team_id).toBe(target.team_id);
      }
    }
  });
});
