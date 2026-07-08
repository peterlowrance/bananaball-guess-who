import { describe, it, expect, vi, beforeAll } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useQuestionRunner } from './useQuestionRunner';
import type { SessionQuestion } from '../../engine/quiz/types';

// localStorage shim for the persisted store in jsdom.
beforeAll(() => {
  if (!('localStorage' in globalThis)) {
    const m = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => m.delete(k),
      clear: () => m.clear(),
      key: (i: number) => [...m.keys()][i] ?? null,
      get length() {
        return m.size;
      },
    });
  }
});

function q(id: string): SessionQuestion {
  return {
    id,
    type: 'photo-to-name',
    targetId: `p_${id}`,
    choices: [
      { playerId: 'a', label: 'A' },
      { playerId: 'b', label: 'B' },
    ],
    correctIndex: 0,
    isReview: true,
    intro: false,
  };
}

describe('useQuestionRunner scoring', () => {
  it('does not count a retry toward the first-try score', () => {
    const questions = [q('1'), q('2'), q('3')];
    const { result } = renderHook(() => useQuestionRunner(questions));

    // Q1: wrong (this requeues Q1 later)
    act(() => result.current.submit(false, 'b'));
    // Q2: correct
    act(() => result.current.submit(true));
    // Q3: correct
    act(() => result.current.submit(true));
    // Q1 (requeued): correct on retry
    act(() => result.current.submit(true));

    const s = result.current.summary();
    expect(s.total).toBe(3);
    // 2 of 3 questions were right on the FIRST try (Q2, Q3). Q1 was missed
    // first, so it must NOT count — this is the "11/12" fix.
    expect(s.firstTryCorrect).toBe(2);
    // correctCount includes the eventual retry-correct, so it's higher.
    expect(s.correctCount).toBe(3);
  });

  it('scores a clean run as all first-try correct', () => {
    const questions = [q('1'), q('2')];
    const { result } = renderHook(() => useQuestionRunner(questions));
    act(() => result.current.submit(true));
    act(() => result.current.submit(true));
    const s = result.current.summary();
    expect(s.firstTryCorrect).toBe(2);
    expect(s.total).toBe(2);
  });
});
