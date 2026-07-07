// Shared runner for a queue of questions — drives grading, wrong-answer
// re-queue (capped), combo tracking, and end-of-session summary. Used by both
// lessons and practice sessions.
import { useState, useRef, useCallback } from 'react';
import { useStore } from '../../store';
import type { SessionQuestion } from '../../engine/quiz/types';

// Re-shuffle a question's multiple-choice options so a re-asked question (after
// a wrong answer) doesn't have the answer in the same spot — otherwise you can
// "cheat" by remembering the position. Keeps correctIndex pointing at the same
// choice. No-op for tile/typed questions (no fixed-position choices).
export function reshuffleChoices(q: SessionQuestion): SessionQuestion {
  if (q.choices.length < 2) return q;
  const order = q.choices.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const choices = order.map((i) => q.choices[i]);
  const correctIndex = q.correctIndex >= 0 ? order.indexOf(q.correctIndex) : q.correctIndex;
  return { ...q, choices, correctIndex };
}

export interface AnswerRecord {
  question: SessionQuestion;
  correct: boolean;
  firstTry: boolean;
}

export interface RunnerSummary {
  total: number;
  correctCount: number;
  firstTryCorrect: number;
  bestCombo: number;
}

export function useQuestionRunner(initialQuestions: SessionQuestion[]) {
  const [queue, setQueue] = useState<SessionQuestion[]>(initialQuestions);
  const [index, setIndex] = useState(0);
  const answers = useRef<AnswerRecord[]>([]);
  const requeueCount = useRef<Map<string, number>>(new Map());
  const combo = useRef(0);
  const bestCombo = useRef(0);
  const firstTryIds = useRef<Set<string>>(new Set());
  const missedKeys = useRef<Set<string>>(new Set());

  const gradeAnswer = useStore((s) => s.gradeAnswer);
  const introducePlayer = useStore((s) => s.introducePlayer);

  const current = queue[index] ?? null;
  const total = initialQuestions.length;
  const done = index >= queue.length;

  const submit = useCallback(
    (correct: boolean, confusedWith?: string | null) => {
      const q = queue[index];
      if (!q) return;
      const key = q.targetId + q.id;
      const firstTry = !missedKeys.current.has(key);

      if (q.intro) introducePlayer(q.targetId);
      gradeAnswer({
        playerId: q.targetId,
        correct,
        typed: q.type === 'type-name',
        confusedWith: correct ? null : (confusedWith ?? null),
        isReview: q.isReview,
        jerseyQuestion: q.type === 'jersey',
      });

      answers.current.push({ question: q, correct, firstTry });

      if (correct) {
        combo.current += 1;
        bestCombo.current = Math.max(bestCombo.current, combo.current);
        if (firstTry) firstTryIds.current.add(q.id);
      } else {
        combo.current = 0;
        missedKeys.current.add(key);
        const n = requeueCount.current.get(q.id) ?? 0;
        if (n < 2) {
          requeueCount.current.set(q.id, n + 1);
          setQueue((prev) => {
            const copy = [...prev];
            const at = Math.min(index + 3, copy.length);
            copy.splice(at, 0, reshuffleChoices(q));
            return copy;
          });
        }
      }
      setIndex((i) => i + 1);
    },
    [queue, index, gradeAnswer, introducePlayer],
  );

  const summary = useCallback(
    (): RunnerSummary => ({
      total,
      correctCount: answers.current.filter((a) => a.correct).length,
      firstTryCorrect: firstTryIds.current.size,
      bestCombo: bestCombo.current,
    }),
    [total],
  );

  return { current, index, total, queueLength: queue.length, combo: combo.current, done, submit, summary };
}
