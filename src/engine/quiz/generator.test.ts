import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { players, getPlayer } from '../../data/dataset';
import { mulberry32 } from '../rng';
import { generateOfType, eligibleTypes, generateQuestion } from './generator';
import { checkTypedAnswer } from './answer-check';
import type { QuestionType } from './types';

const ALL_TYPES: QuestionType[] = [
  'photo-to-name',
  'name-to-photo',
  'which-team',
  'build-name',
  'jersey',
  'position',
  'type-name',
];

describe('eligibleTypes', () => {
  it('unlocks harder types with higher box', () => {
    expect(eligibleTypes(0)).not.toContain('type-name');
    expect(eligibleTypes(0)).not.toContain('build-name');
    expect(eligibleTypes(2)).toContain('build-name');
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

          if (type === 'type-name' || type === 'build-name') {
            expect(q.answerText).toBeTruthy();
            expect(q.correctIndex).toBe(-1);
            if (type === 'build-name') {
              // every part of the name is present among the tiles
              for (const part of target.name.split(' ')) {
                expect(q.tiles).toContain(part);
              }
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
