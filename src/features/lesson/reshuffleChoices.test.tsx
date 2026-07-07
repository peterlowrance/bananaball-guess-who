import { describe, it, expect } from 'vitest';
import { reshuffleChoices } from './useQuestionRunner';
import type { SessionQuestion } from '../../engine/quiz/types';

function q(correctIndex: number): SessionQuestion {
  return {
    id: 'q1',
    type: 'photo-to-name',
    targetId: 'p1',
    choices: [
      { playerId: 'a', label: 'A' },
      { playerId: 'b', label: 'B' },
      { playerId: 'c', label: 'C' },
      { playerId: 'd', label: 'D' },
    ],
    correctIndex,
    isReview: true,
    intro: false,
  };
}

describe('reshuffleChoices', () => {
  it('keeps correctIndex pointing at the same choice after shuffling', () => {
    for (let seedRun = 0; seedRun < 50; seedRun++) {
      const original = q(1); // correct answer is "B"
      const shuffled = reshuffleChoices(original);
      expect(shuffled.choices[shuffled.correctIndex].playerId).toBe('b');
      // Same set of choices, just possibly reordered.
      expect([...shuffled.choices].map((c) => c.playerId).sort()).toEqual(
        ['a', 'b', 'c', 'd'],
      );
    }
  });

  it('produces a different order at least sometimes (anti-cheat)', () => {
    const original = q(0);
    let sawDifferent = false;
    for (let i = 0; i < 50 && !sawDifferent; i++) {
      const s = reshuffleChoices(original);
      if (s.choices.map((c) => c.playerId).join('') !== 'abcd') sawDifferent = true;
    }
    expect(sawDifferent).toBe(true);
  });

  it('is a no-op for tile/typed questions with no fixed-position choices', () => {
    const typed: SessionQuestion = {
      id: 'q2',
      type: 'type-name',
      targetId: 'p1',
      choices: [],
      correctIndex: -1,
      isReview: true,
      intro: false,
    };
    const out = reshuffleChoices(typed);
    expect(out.choices).toEqual([]);
    expect(out.correctIndex).toBe(-1);
  });
});
