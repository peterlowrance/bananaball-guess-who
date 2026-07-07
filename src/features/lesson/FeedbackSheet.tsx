import { useEffect } from 'react';
import { Check, X } from 'lucide-react';
import type { Player } from '../../data/types';
import { mascotQuote } from '../shared/quotes';

/** Bottom sheet shown after each answer (plan §6). Advances on Continue or
 *  Enter/tap-anywhere. Green for correct, red for wrong (with the answer). */
export function FeedbackSheet({
  correct,
  player,
  combo = 0,
  onContinue,
}: {
  correct: boolean;
  player: Player;
  combo?: number;
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
      {!correct && (
        <p className="mb-3 font-bold">
          That was <span className="underline">{player.name}</span> · #{player.jersey_number} ·{' '}
          {player.team_name}
        </p>
      )}
      <button
        onClick={onContinue}
        className="w-full rounded-2xl bg-white py-3 font-black transition active:scale-[0.98]"
        style={{ color: bg }}
      >
        Continue
      </button>
    </div>
  );
}
