import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePracticeQuestions, type PracticeMode } from './usePracticeSession';
import { useQuestionRunner, type RunnerSummary } from '../lesson/useQuestionRunner';
import { RunnerView } from '../lesson/RunnerView';
import { useStore } from '../../store';
import { XP } from '../../engine/gamification/xp';

/** Practice player. Route: /practice/run?mode=review|weak|teams&teams=a,b&any=1 */
export function PracticeRun() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const mode = (sp.get('mode') ?? 'review') as PracticeMode;
  const teams = sp.get('teams')?.split(',').filter(Boolean);
  const any = sp.get('any') === '1';

  const questions = usePracticeQuestions({ mode, teams, any });
  const runner = useQuestionRunner(questions);
  const finishLesson = useStore((s) => s.finishLesson);

  const onComplete = useCallback(
    (s: RunnerSummary) => {
      // practice awards flat XP (no box grinding — the engine already blocks
      // box advancement for not-due players).
      finishLesson({ ...s, xp: XP.practice, finishHour: new Date().getHours() });
      navigate('/practice/complete', { state: { summary: s, xp: XP.practice }, replace: true });
    },
    [finishLesson, navigate],
  );

  if (questions.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="font-bold">Nothing to practice yet.</p>
        <button onClick={() => navigate('/practice')} className="mt-4 underline">
          Back
        </button>
      </div>
    );
  }

  return <RunnerView runner={runner} onComplete={onComplete} />;
}
