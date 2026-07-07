import { useEffect } from 'react';
import { Check, X } from 'lucide-react';
import type { Player } from '../../data/types';
import type { QuestionType } from '../../engine/quiz/types';
import { mascotQuote } from '../shared/quotes';
import { useTap } from '../shared/useTap';

// Question types where you're only shown/asked part of the name (or a photo,
// with no full name in the prompt). For these we always reveal the full name
// in feedback — even on a correct answer — so you actually learn it.
const NAME_LEARNING_TYPES: ReadonlySet<QuestionType> = new Set([
  'first-name',
  'last-name',
  'build-first',
  'build-last',
]);

/** Bottom sheet shown after each answer (plan §6). Advances on Continue or
 *  Enter/tap-anywhere. Green for correct, red for wrong (with the answer). */
export function FeedbackSheet({
  correct,
  player,
  combo = 0,
  questionType,
  onContinue,
}: {
  correct: boolean;
  player: Player;
  combo?: number;
  questionType?: QuestionType;
  onContinue: () => void;
}) {
  // Rotate a themed mascot quip. Combo milestones get their own hype line; the
  // seed is the player id so the line is stable while this sheet is shown.
  const quip =
    correct && combo >= 5 && combo % 5 === 0
      ? mascotQuote('combo', combo)
      : correct
        ? mascotQuote('answer-correct', player.player_id)
        : mascotQuote('answer-wrong', player.player_id);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onContinue]);

  // Reveal the full name when the answer was wrong, OR when the question only
  // exercised part of the name (first/last/build-first/build-last) so a correct
  // answer still teaches the whole name.
  const showFullName =
    !correct || (questionType != null && NAME_LEARNING_TYPES.has(questionType));

  const tap = useTap(onContinue);
  const bg = correct ? 'var(--ok)' : 'var(--bad)';
  return (
    <div
      className="sticky bottom-0 z-10 animate-[slideUp_.2s_ease-out] rounded-t-3xl p-5 text-white"
      style={{ background: bg, paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
    >
      <div className="mb-3 flex items-center gap-2 text-xl font-black">
        {correct ? <Check size={24} strokeWidth={3} aria-hidden /> : <X size={24} strokeWidth={3} aria-hidden />}
        <span>{quip}</span>
      </div>
      {showFullName && (
        <p className="mb-3 font-bold">
          {correct ? 'Full name: ' : 'That was '}
          <span className="underline">{player.name}</span> · #{player.jersey_number} ·{' '}
          {player.team_name}
        </p>
      )}
      <button
        {...tap}
        className="w-full touch-manipulation rounded-2xl bg-white py-3 font-black transition active:scale-[0.98]"
        style={{ color: bg }}
      >
        Continue
      </button>
    </div>
  );
}
