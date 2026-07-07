import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useStore } from '../../store';
import { ACHIEVEMENTS } from '../../engine/gamification/achievements';

interface CompleteState {
  summary: { total: number; correctCount: number; firstTryCorrect: number; bestCombo: number };
  xp: number;
  newlyUnlocked?: string[];
  quiz?: boolean;
}

export function LessonComplete() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as CompleteState | null;
  const reducedMotion = useStore((s) => s.profile.settings.reducedMotion);
  const [shownXp, setShownXp] = useState(0);

  useEffect(() => {
    if (!state) return;
    if (!reducedMotion) {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#ffd23f', '#f4b400', '#58cc02'] });
    }
    // count-up animation for XP
    const target = state.xp;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 800);
      setShownXp(Math.round(target * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, reducedMotion]);

  if (!state) {
    return (
      <div className="p-8 text-center">
        <p className="font-bold">No lesson to summarize.</p>
        <button onClick={() => navigate('/')} className="mt-4 underline">
          Back to path
        </button>
      </div>
    );
  }

  const { summary } = state;
  const newlyUnlocked = state.newlyUnlocked ?? [];
  const accuracy = summary.total ? Math.round((summary.correctCount / summary.total) * 100) : 0;
  const perfect = summary.firstTryCorrect === summary.total && summary.total > 0;
  const backTo = location.pathname.startsWith('/practice') ? '/practice' : '/';

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="text-6xl">{perfect ? '🌟' : '🍌'}</div>
      <h1 className="text-3xl font-black">{perfect ? 'Perfect lesson!' : 'Lesson complete!'}</h1>

      <div className="text-5xl font-black text-[var(--team,#f4b400)]">+{shownXp} XP</div>

      <div className="flex w-full max-w-xs justify-around rounded-3xl bg-[var(--surface)] p-5 shadow-sm">
        <Stat label="Accuracy" value={`${accuracy}%`} />
        <Stat label="Best combo" value={`🔥${summary.bestCombo}`} />
        <Stat label="Correct" value={`${summary.correctCount}/${summary.total}`} />
      </div>

      {newlyUnlocked.length > 0 && (
        <div className="w-full max-w-xs rounded-3xl bg-[var(--team-soft)] p-4">
          <p className="mb-2 text-sm font-black uppercase tracking-wide">Achievement unlocked!</p>
          {newlyUnlocked.map((id) => {
            const a = ACHIEVEMENTS.find((x) => x.id === id);
            return (
              <p key={id} className="font-bold">
                🏅 {a?.name ?? id}
              </p>
            );
          })}
        </div>
      )}

      <button
        onClick={() => navigate(backTo)}
        className="w-full max-w-xs rounded-2xl bg-[var(--ok)] py-4 font-black text-white"
      >
        Continue
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xl font-black">{value}</div>
      <div className="text-xs font-bold text-[var(--muted)]">{label}</div>
    </div>
  );
}
