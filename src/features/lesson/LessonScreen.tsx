import { useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLessonSession } from './useLessonSession';
import { RunnerView } from './RunnerView';
import { curriculumUnits } from '../path/units';
import { useStore } from '../../store';
import { lessonXp } from '../../engine/gamification/xp';
import type { RunnerSummary } from './useQuestionRunner';

/** Lesson player. Route: /lesson/:unitId?attempt=n&mode=quiz */
export function LessonScreen() {
  const { unitId = '' } = useParams();
  const [sp] = useSearchParams();
  const attempt = Number(sp.get('attempt') ?? '0');
  const isQuiz = sp.get('mode') === 'quiz';
  const navigate = useNavigate();

  const focusTeams = useStore((s) => s.profile.settings.focusTeams);
  const unit = curriculumUnits(focusTeams).find((u) => u.key === unitId);

  const runner = useLessonSession({
    unitPlayerIds: unit?.playerIds ?? [],
    attempt,
    reviewOnly: isQuiz,
    length: isQuiz ? 15 : 12,
  });

  const finishLesson = useStore((s) => s.finishLesson);
  const markUnitLesson = useStore((s) => s.markUnitLesson);
  const passUnitQuiz = useStore((s) => s.passUnitQuiz);

  const onComplete = useCallback(
    (s: RunnerSummary) => {
      if (!unit) return;
      if (isQuiz) {
        const passed = s.correctCount >= Math.ceil(s.total * 0.8);
        if (passed) passUnitQuiz(unit.key);
      } else {
        markUnitLesson(unit.key);
      }
      const res = finishLesson({ ...s, xp: lessonXp(s), finishHour: new Date().getHours() });
      navigate(`/lesson/${unit.key}/complete`, {
        state: { summary: s, xp: res.awardedXp, newlyUnlocked: res.newlyUnlocked, quiz: isQuiz },
        replace: true,
      });
    },
    [unit, isQuiz, finishLesson, markUnitLesson, passUnitQuiz, navigate],
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

  return <RunnerView runner={runner} onComplete={onComplete} />;
}
