import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { players } from '../../data/dataset';
import { PlayerImage } from '../shared/PlayerImage';
import { mulberry32 } from '../../engine/rng';
import { generateOfType } from '../../engine/quiz/generator';
import { GOAL_XP, type Goal } from '../../engine/gamification/streak';
import { GUIDE_MASCOT } from '../shared/Mascot';
import { mascotQuote } from '../shared/quotes';
import confetti from 'canvas-confetti';

type Step = 'splash' | 'taste' | 'goal' | 'done';

/** First-run hook: a correct answer within 30s, goal set, then into the app. */
export function Onboarding() {
  const navigate = useNavigate();
  const setOnboarded = useStore((s) => s.setOnboarded);
  const setGoal = useStore((s) => s.setGoal);
  const [step, setStep] = useState<Step>('splash');

  // pick the league's most recognizable player (easy tier, popularity_rank 1)
  const star =
    players.find((p) => p.difficulty === 'easy' && p.popularity_rank === 1) ?? players[0];
  const q = generateOfType(
    { target: star, box: 0, roster: players, isReview: false, qid: 'onb' },
    'photo-to-name',
    mulberry32(1),
  );
  const [answered, setAnswered] = useState<number | null>(null);

  const finish = (goal: Goal) => {
    setGoal(goal);
    setOnboarded(true);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#ffd23f', '#58cc02'] });
    // land on the path; the first unit is ready to play
    setTimeout(() => navigate('/'), 400);
  };

  if (step === 'splash') {
    return (
      <Centered>
        <img
          src={GUIDE_MASCOT}
          alt="Split"
          className="h-32 w-auto animate-[bob_2.5s_ease-in-out_infinite]"
        />
        <h1 className="text-3xl font-black">Bananaball Guess Who</h1>
        <p className="max-w-xs text-[var(--muted)]">{mascotQuote('welcome')}</p>
        <Primary onClick={() => setStep('taste')}>Let's go</Primary>
      </Centered>
    );
  }

  if (step === 'taste') {
    return (
      <Centered>
        <p className="text-sm font-black uppercase tracking-widest text-[var(--muted)]">
          Quick — who's this?
        </p>
        <PlayerImage player={star} size={200} rounded="rounded-3xl" />
        <div className="grid w-full max-w-xs grid-cols-1 gap-3">
          {q.choices.map((c, i) => {
            const isCorrect = i === q.correctIndex;
            const state =
              answered === null ? '' : isCorrect ? 'bg-[var(--ok)] text-white border-[var(--ok)]' : i === answered ? 'opacity-40' : 'opacity-40';
            return (
              <button
                key={c.playerId}
                disabled={answered !== null}
                onClick={() => setAnswered(i)}
                className={`rounded-2xl border-2 border-[var(--hairline)] p-4 font-bold transition active:scale-[0.98] ${state}`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        {answered !== null && (
          <div className="w-full max-w-xs">
            <p className="mb-3 font-bold text-[var(--ok)]">
              {answered === q.correctIndex
                ? mascotQuote('onboarding-correct', answered)
                : `That's ${star.name}. ${mascotQuote('onboarding-wrong', answered)}`}
            </p>
            <Primary onClick={() => setStep('goal')}>Continue</Primary>
          </div>
        )}
      </Centered>
    );
  }

  // goal picker
  const goals: { id: Goal; label: string }[] = [
    { id: 'casual', label: 'Casual' },
    { id: 'regular', label: 'Regular' },
    { id: 'fanatic', label: 'Fanatic' },
  ];
  return (
    <Centered>
      <h1 className="text-2xl font-black">Pick a daily goal</h1>
      <p className="text-[var(--muted)]">You can change this anytime.</p>
      <div className="flex w-full max-w-xs flex-col gap-3">
        {goals.map((g) => (
          <button
            key={g.id}
            onClick={() => finish(g.id)}
            className="flex items-center justify-between rounded-2xl border-2 border-[var(--hairline)] p-4 font-black active:scale-[0.99]"
          >
            <span>{g.label}</span>
            <span className="text-sm text-[var(--muted)]">{GOAL_XP[g.id]} XP / day</span>
          </button>
        ))}
      </div>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-6 py-8 text-center">
      {children}
    </div>
  );
}

function Primary({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full max-w-xs rounded-2xl bg-[var(--ok-strong)] py-4 font-black text-white active:scale-[0.99]"
    >
      {children}
    </button>
  );
}

/** Redirect wrapper: sends first-run users to onboarding. */
export function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const onboarded = useStore((s) => s.profile.onboarded);
  const navigate = useNavigate();
  useEffect(() => {
    if (!onboarded) navigate('/onboarding', { replace: true });
  }, [onboarded, navigate]);
  if (!onboarded) return null;
  return <>{children}</>;
}
