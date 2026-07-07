// Presentational lesson/practice player: given a question runner, renders
// intro cards, questions, feedback, progress + combo, and calls onComplete
// with the summary when the queue is exhausted. Shared by lessons and practice.
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { QuestionView, type AnswerPayload } from './QuestionView';
import { IntroCard } from './IntroCard';
import { FeedbackSheet } from './FeedbackSheet';
import { getPlayer } from '../../data/dataset';
import { useStore } from '../../store';
import { playSound } from '../../lib/sound';
import { haptic } from '../../lib/haptics';
import type { RunnerSummary } from './useQuestionRunner';

interface Runner {
  current: ReturnType<typeof import('./useQuestionRunner').useQuestionRunner>['current'];
  index: number;
  total: number;
  combo: number;
  done: boolean;
  submit: (correct: boolean, confusedWith?: string | null) => void;
  summary: () => RunnerSummary;
}

export function RunnerView({
  runner,
  onComplete,
}: {
  runner: Runner;
  onComplete: (summary: RunnerSummary) => void;
}) {
  const navigate = useNavigate();
  const soundOn = useStore((s) => s.profile.settings.sound);
  const hapticsOn = useStore((s) => s.profile.settings.haptics);

  const [feedback, setFeedback] = useState(false);
  const [acked, setAcked] = useState<Set<string>>(new Set());
  const [lastCorrect, setLastCorrect] = useState(false);
  const [revealCorrect, setRevealCorrect] = useState<number | null>(null);
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);

  const q = runner.current;
  const showIntro = !!q && q.intro && !acked.has(q.id) && !feedback;

  const ackIntro = useCallback(() => {
    if (q) setAcked((s) => new Set(s).add(q.id));
  }, [q]);

  const advance = useCallback(() => {
    setFeedback(false);
    setRevealCorrect(null);
    setPickedIndex(null);
  }, []);

  const onAnswer = useCallback(
    (p: AnswerPayload) => {
      if (!q || feedback) return;
      const picked = q.choices.findIndex((c, i) =>
        p.correct ? i === q.correctIndex : c.playerId === p.confusedWith,
      );
      setPickedIndex(p.correct ? q.correctIndex : picked >= 0 ? picked : null);
      setRevealCorrect(q.correctIndex >= 0 ? q.correctIndex : null);
      setLastCorrect(p.correct);
      // combo detection: the answer bumps the combo to this value
      const nextCombo = p.correct ? runner.combo + 1 : 0;
      runner.submit(p.correct, p.confusedWith);
      if (soundOn) {
        if (p.correct && nextCombo > 0 && nextCombo % 5 === 0) playSound('combo');
        else playSound(p.correct ? 'correct' : 'wrong');
      }
      if (hapticsOn) haptic(p.correct ? 'correct' : 'wrong');
      setFeedback(true);
    },
    [q, feedback, runner, soundOn, hapticsOn],
  );

  // finalize when the queue is exhausted
  const ranComplete = useRef(false);
  useEffect(() => {
    if (runner.done && !ranComplete.current) {
      ranComplete.current = true;
      if (soundOn) playSound('complete');
      onComplete(runner.summary());
    }
  }, [runner, soundOn, onComplete]);

  if (runner.done || !q) {
    return <div className="p-8 text-center font-bold">Wrapping up…</div>;
  }

  const target = getPlayer(q.targetId);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate('/')}
          aria-label="Quit"
          className="text-[var(--muted)] transition active:scale-90"
        >
          <X size={24} aria-hidden />
        </button>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--hairline)]">
          <div
            className="h-full rounded-full bg-[var(--ok)] transition-all"
            style={{ width: `${(runner.index / runner.total) * 100}%` }}
          />
        </div>
        {runner.combo >= 2 && <span className="text-sm font-black">🔥{runner.combo}</span>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <AnimatePresence mode="wait">
          <m.div
            key={showIntro ? `intro-${q.id}` : q.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {showIntro ? (
              <IntroCard player={target} onContinue={ackIntro} />
            ) : (
              <QuestionView
                question={q}
                onAnswer={onAnswer}
                disabled={feedback}
                revealCorrect={revealCorrect}
                pickedIndex={pickedIndex}
              />
            )}
          </m.div>
        </AnimatePresence>
      </div>

      {feedback && (
        <FeedbackSheet correct={lastCorrect} player={target} combo={runner.combo} onContinue={advance} />
      )}
    </div>
  );
}
