import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLessonSession } from './useLessonSession';
import { QuestionView, type AnswerPayload } from './QuestionView';
import { IntroCard } from './IntroCard';
import { FeedbackSheet } from './FeedbackSheet';
import { getPlayer } from '../../data/dataset';
import { curriculumUnits } from '../path/units';
import { useStore } from '../../store';
import { lessonXp, XP } from '../../engine/gamification/xp';
import { playSound } from '../../lib/sound';

/**
 * Lesson player. Route: /lesson/:unitId?attempt=n&review=1
 * Renders intro cards + questions, shows feedback, then the complete screen.
 */
export function LessonScreen() {
  const { unitId = '' } = useParams();
  const [sp] = useSearchParams();
  const attempt = Number(sp.get('attempt') ?? '0');
  const reviewOnly = sp.get('review') === '1';
  const navigate = useNavigate();

  const focusTeams = useStore((s) => s.profile.settings.focusTeams);
  const units = curriculumUnits(focusTeams);
  const unit = units.find((u) => u.key === unitId);
  const unitPlayerIds = unit?.playerIds ?? [];

  const session = useLessonSession({ unitPlayerIds, attempt, reviewOnly });
  const soundOn = useStore((s) => s.profile.settings.sound);

  // UI state. The live `session.current` drives which question shows; we only
  // track whether feedback is up, which intro cards were acknowledged, and the
  // reveal highlight for the answered question.
  const [feedback, setFeedback] = useState(false);
  const [acked, setAcked] = useState<Set<string>>(new Set());
  const [lastCorrect, setLastCorrect] = useState(false);
  const [revealCorrect, setRevealCorrect] = useState<number | null>(null);
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);

  const finishLesson = useStore((s) => s.finishLesson);
  const markUnitLesson = useStore((s) => s.markUnitLesson);

  const q = session.current;
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
      const picked = q.choices.findIndex(
        (c, i) => (p.correct ? i === q.correctIndex : c.playerId === p.confusedWith),
      );
      setPickedIndex(p.correct ? q.correctIndex : picked >= 0 ? picked : null);
      setRevealCorrect(q.correctIndex >= 0 ? q.correctIndex : null);
      setLastCorrect(p.correct);
      session.submit(p.correct, p.confusedWith);
      if (soundOn) playSound(p.correct ? 'correct' : 'wrong');
      setFeedback(true);
    },
    [q, feedback, session, soundOn],
  );

  if (!unit) {
    return (
      <div className="p-8 text-center">
        <p className="font-bold">Lesson not found.</p>
        <button onClick={() => navigate('/')} className="mt-4 underline">
          Back to path
        </button>
      </div>
    );
  }

  // finished?
  if (session.done) {
    const s = session.summary();
    const xp = lessonXp(s) + XP.firstOfDay; // first-of-day handled loosely; refined in Stage 7
    return (
      <CompleteRedirect
        onMount={() => {
          markUnitLesson(unit.key);
          const res = finishLesson({
            ...s,
            xp,
            finishHour: new Date().getHours(),
          });
          if (soundOn) playSound('complete');
          navigate(`/lesson/${unit.key}/complete`, {
            state: { summary: s, xp, newlyUnlocked: res.newlyUnlocked },
            replace: true,
          });
        }}
      />
    );
  }

  if (!q) return <div className="p-8 text-center font-bold">Loading…</div>;
  const target = getPlayer(q.targetId);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* top bar: quit + progress + combo */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate('/')} aria-label="Quit" className="text-xl">
          ✕
        </button>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--hairline)]">
          <div
            className="h-full rounded-full bg-[var(--ok)] transition-all"
            style={{ width: `${(session.index / session.total) * 100}%` }}
          />
        </div>
        {session.combo >= 2 && <span className="text-sm font-black">🔥{session.combo}</span>}
      </div>

      <div className="flex-1 px-5 py-4">
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
      </div>

      {feedback && (
        <FeedbackSheet correct={lastCorrect} player={target} onContinue={advance} />
      )}
    </div>
  );
}

/** Runs an effect once on mount to finalize the lesson and navigate. */
function CompleteRedirect({ onMount }: { onMount: () => void }) {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    onMount();
  }, [onMount]);
  return <div className="p-8 text-center font-bold">Wrapping up…</div>;
}
