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

  it('buffers SRS writes until commit — quitting mid-session persists nothing', async () => {
    const { useStore } = await import('../../store');
    const questions = [{ ...q('intro1'), intro: true }, q('2')];
    const { result } = renderHook(() => useQuestionRunner(questions));

    act(() => result.current.submit(true));
    act(() => result.current.submit(true));
    // Answers given, but nothing hits the store until commit() — abandoning
    // here must not record introductions or grades.
    expect(useStore.getState().players['p_intro1']).toBeUndefined();
    expect(useStore.getState().players['p_2']).toBeUndefined();

    act(() => result.current.commit());
    expect(useStore.getState().players['p_intro1']?.introducedAt).not.toBeNull();
    expect(useStore.getState().players['p_2']?.seen).toBe(1);
  });

  it('caps box advancement at +1 per player per session (intro counts as the +1)', async () => {
    const { useStore } = await import('../../store');
    useStore.getState().resetProgress();
    // Two correct answers on the same player in one session → one box-up.
    const same = [q('a'), { ...q('b'), targetId: 'p_a' }];
    const { result } = renderHook(() => useQuestionRunner(same));
    act(() => result.current.submit(true));
    act(() => result.current.submit(true));
    act(() => result.current.commit());
    expect(useStore.getState().players['p_a'].box).toBe(1);

    // An introduced player's 0→1 IS the session's box-up: correct answers in
    // the intro lesson leave them at box 1 (day-1 review preserved).
    const intro = [{ ...q('c'), intro: true }, { ...q('d'), targetId: 'p_c' }];
    const { result: r2 } = renderHook(() => useQuestionRunner(intro));
    act(() => r2.current.submit(true));
    act(() => r2.current.submit(true));
    act(() => r2.current.commit());
    expect(useStore.getState().players['p_c'].box).toBe(1);
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
