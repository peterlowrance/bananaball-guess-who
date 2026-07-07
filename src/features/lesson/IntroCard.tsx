import type { Player } from '../../data/types';
import { PlayerImage } from '../shared/PlayerImage';
import { TeamLogo } from '../shared/TeamLogo';
import { teamThemeSlug } from '../../lib/theme';

/** Teaching moment shown before a new player's first questions (plan §1.2). */
export function IntroCard({ player, onContinue }: { player: Player; onContinue: () => void }) {
  const funFact = introFact(player);
  return (
    <div
      data-team-theme={teamThemeSlug(player.team_name)}
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center"
    >
      <p className="text-sm font-black uppercase tracking-widest text-[var(--muted)]">
        New player
      </p>
      <div className="relative">
        <PlayerImage player={player} size={220} rounded="rounded-[2rem]" />
        <div className="absolute -right-2 -top-2">
          <TeamLogo teamName={player.team_name} size={48} />
        </div>
      </div>
      <h1 className="text-3xl font-black">{player.name}</h1>
      <p className="font-bold text-[var(--muted)]">
        #{player.jersey_number} · {player.position_label} · {player.team_name}
      </p>
      {funFact && <p className="max-w-xs text-sm text-[var(--muted)]">{funFact}</p>}
      <button
        onClick={onContinue}
        className="mt-4 w-full max-w-xs rounded-2xl py-4 font-black text-[var(--team-ink)]"
        style={{ background: 'var(--team)' }}
      >
        Got it
      </button>
    </div>
  );
}

/** A one-line flavor stat pulled from the player's real numbers. */
function introFact(p: Player): string | null {
  if (p.hitting && p.hitting.hr > 0) {
    return `Batting ${p.hitting.avg} with ${p.hitting.hr} HR this season.`;
  }
  if (p.pitching && p.pitching.era && p.pitching.era !== '0.00') {
    return `Pitches with a ${p.pitching.era} ERA.`;
  }
  if (p.hitting && p.hitting.h > 0) {
    return `${p.hitting.h} hits across ${p.hitting.g} games.`;
  }
  return null;
}
